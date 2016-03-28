require('dotenv').config();
var AWS = require('aws-sdk');
var chokidar = require('chokidar');
var fs = require('fs');
var request = require('request');
var path = require('path');
var logger = require('./logger');
var mongo = require('./mongo-utils');

var home = process.env.HOME;
var log_directory = path.join(home,".larkin/jsons/startup");
var archive_directory = path.join(home,".larkin/archive");

var watcher = chokidar.watch(log_directory, { persistent: true });
// automatically scans directory when it starts,
// so no need to manually check for existing files
watcher.on('add', processFile);


function processFile(path) {
    logger("New file added: " + path);
    // get json
    fs.readFile(path, 'utf8', function(err, jsonStr) {
        if(err) {
            logger("Error reading file " + path);
            return;
        }
        // manually updated decimals in key names until analytics output changes
        jfixed = jsonStr.replace(/00\.000Z":/g,'00 000Z":')
        jfixed = JSON.parse(jfixed);

        json = JSON.parse(jsonStr); // this should be in try/catch block

        // add to predictions collection in db
        savePrediction(jfixed);

        // create message and add to messages
        create_save_message(json);

        // archive file
        archiveFile(path, jsonStr);
    });
}

function savePrediction(json) {
    mongo.analyticsConnection()
        .then(function(db) {
            return mongo.insert(db, 'startup_prediction', json, { 'checkKeys' : false });
        }).then(function(db) { db.close(); })
        .catch(function(err) { console.log("Error: ", err); });
}

function archiveFile(filePath, data) {
    var bucket = process.env.AWS_S3_JSON_ARCHIVE_BUCKET;
    var key = 'json-archive/' + path.basename(filePath);
    var s3 = new AWS.S3();
    var params = {
        'Bucket': bucket,
        'Key': key,
        'Body': data
    };
    s3.putObject(params, function(err, data) {
        if(err) {
            logger("Error moving file to S3: " + filePath);
            logger(err);
        } else {
            logger("Uploaded file to S3: " + filePath);

            // now move file to archive dir
            var filename = path.basename(filePath);
            var newPath = path.join(archive_directory, filename);
            fs.rename(filePath, newPath, function(err) {
                if(err) {
                    logger("Error moving file to archive directory: ", filePath);
                    logger(err);
                } else logger("Archived file " + filePath);
            });

            // delete file
            // fs.unlink(filePath, function(err) {
            //     logger("Error deleting file " + filePath);
            // });
        }
    });
}


function create_save_message(json_data) {
    var startup_datetime_str = json_data["345_Park"]["random_forest"]["best_start_time"]["time"];
    var startup_dt = new Date(startup_datetime_str);
    var message_date = new Date(startup_datetime_str);
    message_date = new Date(message_date.setUTCHours(0,0,0,0));
    var rightNow = new Date();

    var building = "345_Park";
    var action = "morning-startup"

    var message = {
        "namespace": building,
        "date": message_date,
        "name": action,
        "body": {
            "score": json_data["345_Park"]["random_forest"]["best_start_time"]["score"],
            "time-of-doc-generation" : rightNow,
            "prediction-time" : startup_dt,
            "method": "directPlacement"
        },
        "status": "cancel",
        "time": startup_dt,
        "type": "alert",
        "fe_vis": true
    }

    // Use node request library to post that message to https://byuldings.nantum.io/345_Park/messages
    var headers = {
        "authorization": "7McdaRC6fULlka2cPgsZ",
        "version": "0.0.1",
        "Content-Type": "application/json"
    };
    var msgPptions = {
        "url": 'https://buildings.nantum.io/345_Park/messages',
        "method": "POST",
        "headers": headers,
        "json": true,
        "body": messageAPI
    };

    function cb(err, res, body) {
        if (err) logger(err);
        if (!err && res.statusCode == 200) console.log(body);
    }

    request(msgOptions, cb);

    // update daily timeseries
    var tsGetOptions = {
        url: 'https://buildings.nantum.io/345_Park/messages',

    }
    function updateTs(toAppend) {

        var tsOptions = {
            url: 'https://buildings.nantum.io/345_Park/messages',
            "method": "POST",
            headers: headers,
            "json": true,
            "body": ts
        }
    }


    // Alternately, place message in db directly
    // mongo.skynetConnection()
    //     .then(function(db) {
    //         return mongo.update(db,
    //                     'messages',
    //                     { 'namespace' : building, 'name' : action, 'status' : 'pending', 'date' : message_date },
    //                     { '$set' : { 'status' : 'cancel' }},
    //                     { 'multi' : true })
    //     }).then(function(db) {
    //         return mongo.update(db,
    //                     'messages',
    //                     { 'namespace' : building, 'name' : action, 'status' : 'ack', 'date' : message_date },
    //                     { '$set' : { 'status' : 'cancel' }},
    //                     { 'multi' : true })
    //     }).then(function(db) {
    //         return mongo.insert(db, 'messages', message);
    //     }).then(function(db) {
    //         db.close();
    //     }).then(function(db) {
    //         console.log("done saving message");
    //     }).catch(function(err) {
    //         console.log("Error:", err);
    //     })
}
