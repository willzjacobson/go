var chokidar = require('chokidar');
var fs = require('fs');
var mongo = require('./mongo-utils');
var path = require('path');
var logger = require('./logger');

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
    fs.readFile(path, 'utf8', function(err, json) {
        if(err) {
            logger("Error reading file " + path);
            return;
        }
        // manually updated decimals in key names until analytics output changes
        jfixed = json.replace(/00\.000Z":/g,'00 000Z":')
        jfixed = JSON.parse(jfixed);

        json = JSON.parse(json); // this should be in try/catch block

        // add to predictions
        mongo.analyticsConnection()
        .then(function(db) {
            return mongo.insert(db, 'startup_prediction', jfixed, { 'checkKeys' : false });
        })
        .catch(err => console.log("Error: ", err))

        // create message and add to messages
        create_save_message(json);

        // archive file
        archiveFile(path);
    });
}

function archiveFile(filePath) {
    var filename = path.basename(filePath);
    var newPath = path.join(archive_directory, filename);
    fs.rename(filePath, newPath, (err) => {
        if(err) {
            logger("Error moving file ", filePath);
            logger(err);
        }

        console.log("moved file")
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
            "prediction-time" : startup_dt
        },
        "status": "pending",
        "time": startup_dt,
        "type": "alert",
        "fe_vis": true
    }

    mongo.skynetConnection()
        .then(db => {
            return mongo.update(db,
                        'messages',
                        { 'namespace' : building, 'name' : action, 'status' : 'pending', 'date' : message_date },
                        { '$set' : { 'status' : 'cancel' }},
                        { 'multi' : true })
        }).then(db => {
            return mongo.update(db,
                        'messages',
                        { 'namespace' : building, 'name' : action, 'status' : 'ack', 'date' : message_date },
                        { '$set' : { 'status' : 'cancel' }},
                        { 'multi' : true })
        }).then(db => {
            return mongo.insert(db, 'messages', message);
        }).then(db => {
            db.close();
        }).then(db => {
            console.log("done saving message");
        }).catch(err => {
            console.log("Error:", err);
        })
}
