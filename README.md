# syncStore

Synchroize your local storage 2 server.

## features

- Concurrent Posting
- Concurrent Delay
- Customize number of entries at time
- Message Acknowledgment without losing
- All Messages with CUID identity
- ...


## options

``` javascript

// How many entries in just one packge.
entryMaxOfPkg: 5, 

// Maximum Concurrency
concurrentMax: 2,

// Concurrency Delay
concurrentInterval: 5000, 

// Start Acknowlegement Mechanism (return array of `cuid` which without 
// beening handled properly by server, 
// they need to be repost again. default:false, status code 2XX will be 
// considered success.
entryACK: false, 

// local name of database
name: 'defaultDatabase', 

//  local store name
storeName: 'defaultDataStore', 

// select localstorage for general purpose.
driver: [
  localforage.LOCALSTORAGE, 
]

```

## API

- config(options) config options refer to above.
- push(entry) commit data to local database
- sync() start to sync. *call `config` at first to set `endPoint`*

## usage

``` javascript
import localStore from 'localStore'

localStore.config({
    endPoint: '/endPoint', // you just need to set this option commonly.
    concurrentMax: 3, // less that 6 because of the browser limits.
    entryMaxOfPkg: 10 // set a proper value reducing network playload.
})

// push data into database
localStore
  .push({
      title: 'big news',
      passage: 'alexwang',
      timestamp: Data.now(),
      .....
  })
  .then(function(done){
      console.log(done);
  })
  .catch(function(err){
      console.error(err);
  })


// sync
localStore
  .sync()
  .then(function(ok){
      console.log(ok);
  })
  .catch(function(err){
      console.error(err);
  })
```

that's all. any feedback will be appreciated.
