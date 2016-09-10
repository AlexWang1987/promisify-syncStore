// //////////////////////////////////////////////////////////////////////////////
//
//  Copyright (C) 2016-present  All Rights Reserved.
//  Licensed under the Apache License, Version 2.0 (the "License");
//  http://www.apache.org/licenses/LICENSE-2.0
//
//  Github Home: https://github.com/AlexWang1987
//  Author: AlexWang
//  Date: 2016-09-10 21:05:17
//  QQ Email: 1669499355@qq.com
//  Last Modified time: 2016-09-10 22:08:52
//  Description: syncStore-main
//
// //////////////////////////////////////////////////////////////////////////////

require('es6-promise').polyfill();
require('whatwg-fetch');

import localforage from 'localforage';
import Promise from 'bluebird/js/browser/bluebird';
import cuid from 'cuid';

// DBList
// userDatabase -- defaultDatabase
// userDatastore -- defaultDataStore
let globalOptions = {
  syncDatastore: null,
  entryMaxOfPkg: 5,
  concurrentMax: 2,
  concurrentInterval: 5000,
  entryACK: false,
  name: 'defaultDatabase',
  storeName: 'defaultDataStore',
  version: '1.0',
  description: 'powered by localStore2Server.',
  driver: [
    // localforage.INDEXEDDB,
    // localforage.WEBSQL,
    localforage.LOCALSTORAGE,
  ]
}

// default Datastore
globalOptions.syncDatastore = getDataStore();

// get anyDatastore by your costomized options.
function getDataStore(options) {
  return localforage.createInstance(Object.assign(globalOptions, options));
}

/**
 * public method used to configuration. no need to be set commonly.
 * @method config
 * @param  {object} options support localforage options
 * @return null
 */
function config(options) {
  return Promise.try(function () {
    globalOptions = Object.assign(globalOptions, options);
    globalOptions.syncDatastore = getDataStore();
  })
}

/**
 * sync method
 * @method sync
 * @return {promise}
 */
function sync() {
  return getEntryPkgs()
    .then(function (pkgs) {
      if (pkgs && pkgs.length) {
        let entriesNum = 0;
        let successNum = 0;
        return Promise
          .map(pkgs, pkg => {
            entriesNum += pkg.length
            return postEntryPkg(pkg)
          })
          .map(keys => {
            successNum += keys.length;
            return ackRemoveKeys(keys)
          })
          .then(function (done) {
            console.log(`Sync statics: ${pkgs.length} pkgs, ${entriesNum} entries, ${successNum} success, ${entriesNum - successNum} faitures.`);
          })
          .finally(function () {
            return syncCycle();
          });
      }
      console.log('No updates need to be syned.');
      return syncCycle();
    })
}

/**
 * sync cycle
 * @method syncCycle
 * @return {promise}
 */
function syncCycle() {
  return Promise
    .delay(globalOptions.concurrentInterval)
    .then(sync)
}

/**
 * pack your entries by `entryMaxOfPkg`
 * @method packEntries
 * @param  {integer}    packIndex starts to pack
 * @return {promise}
 */
function packEntries(packIndex = 0) {
  return Promise.try(function () {
    let syncDatastore = globalOptions.syncDatastore;
    if (!syncDatastore) return [];
    let entryKeyIndex = [];
    for (let i = packIndex; i < packIndex + globalOptions.entryMaxOfPkg; i++) {
      entryKeyIndex.push(i);
    }
    return Promise
      .map(entryKeyIndex, entryKey => syncDatastore.key(entryKey))
      .filter(key => key)
      .then(keys => {
        if (keys.length) {
          return Promise
            .map(keys, key => ({ key }))
            .map(function (keyValue) {
              return syncDatastore
                .getItem(keyValue.key)
                .then(function (value) {
                  keyValue.value = value;
                  return keyValue;
                })
            })
        }
        return;
      })
  })
}

/**
 * how many packages at once. see options `concurrentMax`
 * @method getEntryPkgs
 * @return {promise}
 */
function getEntryPkgs() {
  return new Promise(function (resolve, reject) {
    let conTimes = 0;
    let pkgs = [];
    const entryMaxOfPkg = globalOptions.entryMaxOfPkg;
    const concurrentMax = globalOptions.concurrentMax;

    function lastCon() {
      let packIndex = conTimes * entryMaxOfPkg;
      return packEntries(packIndex)
        .then(function (pkg) {
          conTimes++;
          if (pkg) {
            pkgs.push(pkg);
            if (conTimes < concurrentMax && pkg.length === entryMaxOfPkg) {
              return lastCon();
            }
          }
          resolve(pkgs);
        })
        .catch(reject);
    }
    lastCon();
  });
}

/**
 * pkg poster
 * @method postEntryPkg
 * @param  {package}     pkg
 * @return {promise}
 */
function postEntryPkg(pkg) {
  return Promise.try(function () {
    let endPoint = globalOptions.endPoint;
    let method = globalOptions.method || 'POST';
    if (!endPoint) throw new Error('the option [endPoint] is missing.');
    return fetch(endPoint, {
        method: method,
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify(pkg)
      })
      .then(function (res) {
        if (res.ok) {
          const acks = [];
          if (globalOptions.entryACK) {
            try {
              acks.concat(res.json);
            } catch (e) {
              console.error('Response erros' + e);
            }
          }
          return pkg.reduce((keys, keyValue) => {
            const key = keyValue.key;
            if (acks.indexOf(key) === -1) keys.push(key);
            return keys
          }, [])
        }
      })
  })
}

/**
 * remove local entries if posted successfully.
 * @method ackRemoveKeys
 * @param  {array}      keys all keys acknowledged from server. refer to `entryACK`
 * @return {promise}
 */
function ackRemoveKeys(keys) {
  return Promise
    .map(keys, key => {
      globalOptions
        .syncDatastore
        .removeItem(key)
    })
}

/**
 * push item
 * @method push
 * @param  {object} item primitives or object types.
 * @return {promise}
 */
function push(item) {
  return globalOptions.syncDatastore.setItem(cuid(), item);
}

/**
 * exposed interfaces
 */
export default {
  config,
  sync,
  push
}

