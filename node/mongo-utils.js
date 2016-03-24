var MongoClient = require('mongodb').MongoClient;

// Connection URL
var skynetUrl = 'mongodb://localhost:27017/myproject';
var analyticsUrl = 'mongodb://localhost:27017/myproject';

function mongoConnPromise(url) {
    return new Promise((resolve, reject) => {
        // Use connect method to connect to the Server
        MongoClient.connect(url, (err, db) => {
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


function closeMongo(db) {
    return db.close();
}


function insertToCollection(db, collection, doc) {
    return new Promise((resolve, reject) => {
        var col = db.collection(collection);
        col.insert(doc, (err, result) => {
            if(err) reject(err);
            else resolve(result);
        });
    });
}


module.exports = {
    skynetConnection : skynetPromise,
    analyticsConnection : analyticPromise,
    insert : insertToCollection
}
