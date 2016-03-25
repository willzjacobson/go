var MongoClient = require('mongodb').MongoClient;

// Connection URL
var skynetUrl = require('../secrets').skynetUrl;
var analyticsUrl = require('../secrets').analyticsUrl;

function mongoConnPromise(url) {
    return new Promise(function(resolve, reject) {
        // Use connect method to connect to the Server
        MongoClient.connect(url, function(err, db) {
            if(err) reject(err);
            else resolve(db);
        });
    });
}

function skynetPromise() {
    return mongoConnPromise(skynetUrl);
}

function analyticPromise() {
    return mongoConnPromise(analyticsUrl);
}


function insertToCollection(db, collection, doc, options) {
    return new Promise(function(resolve, reject) {
        var col = db.collection(collection);
        col.insert(doc, options, function(err, result) {
            if(err) reject(err);
            else resolve(db);
        });
    });
}


function updateCollection(db, collection, criteria, update, options) {
    return new Promise(function(resolve, reject) {
        db.collection(collection).update(criteria, update, options, function(err, result) {
            if(err) reject(err);
            else resolve(db);
            // else resolve(result);
        });
    });
}


module.exports = {
    skynetConnection : skynetPromise,
    analyticsConnection : analyticPromise,
    insert : insertToCollection,
    update : updateCollection
}
