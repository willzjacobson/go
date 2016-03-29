require('dotenv').config();
var AWS = require('aws-sdk');
var chokidar = require('chokidar');
var fs = require('fs');
var request = require('request');
var path = require('path');
var logger = require('./logger');
var mongo = require('./mongo-utils');
var sendSMS = require('./sms');

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
            sendSMS("Error reading file " + path);
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

        // Update day's timeseries once that schema exists

        // update state
        var state = json["345_Park"]["random_forest"]["best_start_time"]["time"];
        create_save_state("345_Park", null, "morning_startup_time", state);
        create_save_state("345_Park", null, "morning_startup_status", "pending");

        // archive file
        archiveFile(path, jsonStr);
    });
}

function savePrediction(jsonWithoutDotsInKeys) {
    mongo.analyticsConnection()
        .then(function(db) {
            return mongo.insert(db, 'startup_prediction', jsonWithoutDotsInKeys, { 'checkKeys' : false });
        }).then(function(db) { db.close(); })
        .catch(function(err) { 
            logger("Error saving prediction to db: \n", err);
            sendSMS("Error saving prediction to db: \n" + err.toString());
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
            sendSMS("Error moving file to S3: " + filePath);
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
                    sendSMS("Error moving file to archive directory: " + filePath);
                } else logger("Archived file " + filePath);
            });

            // delete file
            // fs.unlink(filePath, function(err) {
            //     logger("Error deleting file " + filePath);
            // });
        }
    });
}

function create_save_state(namespace, target, type, state) {

    // Build object to PUT/POST
    var now = new Date();
    var update = { "obj" : {} };
    update.obj.namespace = namespace;
    update.obj.type = type;
    update.obj.state = state;
    update.obj.last_modified = now;
    update.obj.last_modified_by = "an_go filewatcher";
    if(target) { update.obj.target = target; }

    // Build query string
    var query = {
        type: type,
        target = target
    }
    query = new Buffer(JSON.stringify(query)).toString('base64');

    // Update the db
    create_or_update("states", namespace, update, query);
}


function create_save_message(json_data) {
    var startup_datetime_str = json_data["345_Park"]["random_forest"]["best_start_time"]["time"];
    var startup_dt = new Date(startup_datetime_str);
    var hours = startup_dt.getUTCHours() - 1;
    var adj_startup_dt = Date(startup_dt.setUTCHours(hours));
    var message_date = new Date(startup_datetime_str);
    message_date = new Date(message_date.setUTCHours(0,0,0,0));
    var rightNow = new Date();
    var analysis_start = fs.readFileSync("py_jobs/prediction_start.txt", "utf8");

    var namespace = "345_Park";
    var action = "morning-startup";

    // Build message
    var message = { "obj": {
            "namespace": namespace,
            "date": message_date,
            "name": action,
            "body": {
                "score": json_data["345_Park"]["random_forest"]["best_start_time"]["score"],
                "prediction-time" : adj_startup_dt,
                "analysis-start-time" : analysis_start,
                "analysis-finish-time" : rightNow
            },
            "status": "pending",
            "time": adj_startup_dt,
            "type": "alert",
            "fe_vis": true
        }
    };

    // Build query string
    var query = {
        name = action,
        date: message_date,
        namespace: namespace
    };
    query = new Buffer(JSON.stringify(query)).toString('base64');

    // Update the db
    create_or_update("messages", namespace, message, query);


    // Create/update day time series
    // var getDayTsOptions = {
    //     "url": "https://buildings.nantum.io/" + building + "/dayTs/?q=" + qs,
    //     "method": "GET",
    //     "headers": headers
    // };

    // request(getDayTsOptions, function(err, res, body) {

    //     var options = {
    //         "json": true,
    //         "headers": headers
    //     };

    //     if (err) logger("error GETting messages: " + err);

    //     else if (res.statusCode == 200 && body.docs) {
    //         // If there are more than 0 messages for the day that the prediction is for
    //         updatedTs = body.docs[0]
    //         updatedTs.timeSeries.push({
    //             "score": message.score,
    //             "prediction-time": message.body.prediction-time,
    //             "calculationTime": rightNow
    //         });
    //         updatedTs.last_modified = rightNow;

    //         options.method = "PUT";
    //         options.url = "https://buildings.nantum.io/" + building + "/dayTs/" + updatedTs._id;
    //         options.body = updatedTs;

    //         request(options, function(err, res, body) {
    //             if (err) logger("error PUTing dayTs: " + err.toString());
    //             else console.log("Success PUTing dayTs: " + body.toString());
    //         });

    //     } else if (res.statusCode == 200) {
    //         // If there is not yet a timeseries for this resource for this prediction day
    //         var newTs = { "obj": {
    //                 // BUILD THE OBJECT
    //             }
    //         };

    //         options.method = "POST"
    //         options.url = "https://buildings.nantum.io/" + building + "/dayTs";
    //         options.body = newTs;

    //         request(options, function(err, res, body) {
    //             if (err) logger("error POSTing dayTs: " + err.toString());
    //             else console.log("Success POSTing dayTs: " + body.toString());
    //         });
    //     }
    // });


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

function create_or_update(resource, namespace, update, query) {
    
    // Define headers and options for GET request
    var headers = {
        'authorization' : '7McdaRC6fULlka2cPgsZ',
        'version' : '0.0.1',
        'Content-Type' : 'application/json'
    };
    var getOptions = {
        url : "https://buildings.nantum.io/" + namespace + "/" + resource + "?q=" + query,
        headers : headers
    };

    // Make get request to find id if document exists
    request(getOptions, function(err, response, body) {
        if(err || response.statusCode != 200) {
            logger("Error lookup up " + resource + " for building: " + namespace );
            logger(err);
            sendSMS("Error looking up " +  resource + " for building: " + namespace + ".\n" + err.toString());
            return;
        }

        // Define options for update/save
        var options = { 
            url : "https://buildings.nantum.io/" + namespace + "/" + resource + "/",
            headers : headers,
            json : true,
            body : update
        };
        body = JSON.parse(body);
        if(body.docs) { // document exists, make PUT request
            options.method = 'PUT';
            options.url += body.docs[0]._id;
        } else { // no document exists, create one with POST
            options.method = 'POST';
        }

        // Make the update/save
        request(options, function(err, response, body) {
            if(err) {
                logger("Error saving " +  resource + " for building: " + namespace);
                logger(err);
                sendSMS("Error saving " +  resource + " for building: " + namespace + ".\n" + err.toString());
                return;
            } else {
                logger("Successful save/update of " +  resource + " for building: " + namespace);
            }
        });
    });
}
