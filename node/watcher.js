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

AWS.config.update({"region" : "us-east-1"});

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

        // add to predictions
        mongo.analyticsConnection()
        .then(function(db) {
            return mongo.insert(db, 'startup_prediction', jfixed, { 'checkKeys' : false });
        }).then(function(db) { db.close(); })
        .catch(function(err) { console.log("Error: ", err); })

        // create message and add to messages
        create_save_message(json);

        // archive file
        archiveFile(path, jsonStr);
    });
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
    var hours = startup_dt.getUTCHours() - 1;
    var adj_startup_dt = Date(startup_dt.setUTCHours(hours))
    var message_date = new Date(startup_datetime_str);
    message_date = new Date(message_date.setUTCHours(0,0,0,0));
    var rightNow = new Date();
    var analysis_start = fs.readFileSync("py_jobs/prediction_start.txt", "utf8")

    var building = "345_Park";
    var action = "morning-startup"

    var message = {
        "namespace": building,
        "date": message_date,
        "name": action,
        "body": {
            "score": json_data["345_Park"]["random_forest"]["best_start_time"]["score"],
            // "prediction-time" : startup_dt,
            "prediction-time" : adj_startup_dt,
            "analysis-start-time" : analysis_start,
            "analysis-finish-time" : rightNow,
            "method": "directPlacement"
        },
        "status": "cancel",
        "time": startup_dt,
        "type": "alert",
        "fe_vis": true
    }

    var messageAPI = {
        "namespace": building,
        "date": message_date,
        "name": action,
        "body": {
            "score": json_data["345_Park"]["random_forest"]["best_start_time"]["score"],
            "time-of-doc-generation" : rightNow,
            "prediction-time" : startup_dt,
            "method": "API"
        },
        "status": "cancel",
        "time": startup_dt,
        "type": "alert",
        "fe_vis": true
    }


    // Use node request library to post that message to https://byuldings.nantum.io/345_Park/messages
    var options = {
        url: 'https://buildings.nantum.io/345_Park/messages',
        "method": "POST",
        headers: {
            "authorization": "7McdaRC6fULlka2cPgsZ",
            "version": "0.0.1"
        },
        "json": true,
        "body": messageAPI
    }

    function cb(err, res, body) {
        if (err) logger(err)
        if (!err && res.statusCode == 200) console.log(body);
    }

    request(options, cb);


    // Alternately, place message in db directly
    mongo.skynetConnection()
        .then(function(db) {
            return mongo.update(db,
                        'messages',
                        { 'namespace' : building, 'name' : action, 'status' : 'pending', 'date' : message_date },
                        { '$set' : { 'status' : 'cancel' }},
                        { 'multi' : true })
        }).then(function(db) {
            return mongo.update(db,
                        'messages',
                        { 'namespace' : building, 'name' : action, 'status' : 'ack', 'date' : message_date },
                        { '$set' : { 'status' : 'cancel' }},
                        { 'multi' : true })
        }).then(function(db) {
            return mongo.insert(db, 'messages', message);
        }).then(function(db) {
            db.close();
        }).then(function(db) {
            console.log("done saving message");
        }).catch(function(err) {
            console.log("Error:", err);
        })
}


function updateState(namespace, target, type, state) {
    // make GET request to find ID
    var query = {
        "type" : type,
        "target" : target
    };
    query = new Buffer(JSON.stringify(query)).toString('base64')
    var headers = {
        'authorization' : '7McdaRC6fULlka2cPgsZ',
        'version' : '0.0.1',
        'Content-Type' : 'application/json'
    };
    var options = {
        url : "https://buildings.nantum.io/" + namespace + "/states?q=" + query,
        headers : headers
    };
    request(options, function(err, response, body) {
        if(err) {
            logger("Error lookup up state for building/target/type: " + namespace + "/" + target + "/" + type);
            logger(err);
            return;
        }

        var now = new Date();
        var update = {
            namespace: namespace,
            type: type,
            state: state,
            last_modified: now,
            last_modified_by: "an_go filewatcher"
        };
        if(target) { update.target = target; }
        var options = {
            method : 'PUT',
            url : "https://buildings.nantum.io/" + namespace + "/states/",
            headers : headers,
            json : true,
            body : { "obj" : update }
        };
        body = JSON.parse(body);
        if(body.docs) { // document exists, make PUT request
            options.method = 'PUT';
            options.url += body.docs[0]._id;
        } else { // no document exists, create one with POST
            options.method = 'POST';
        }
        request(options, function(err, response, body) {
            if(err) {
                logger("Error saving state for building/target/type: " + namespace + "/" + target + "/" + type);
                logger(err);
                return;
            }
            // TODO: check for OK status code
        });
    });
}
