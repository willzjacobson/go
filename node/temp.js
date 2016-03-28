function create_save_message(json_data) {
    var startup_datetime_str = json_data["345_Park"]["random_forest"]["best_start_time"]["time"];
    var startup_dt = new Date(startup_datetime_str);
    var hours = startup_dt.getUTCHours() - 1;
    var adj_startup_dt = Date(startup_dt.setUTCHours(hours));
    var message_date = new Date(startup_datetime_str);
    message_date = new Date(message_date.setUTCHours(0,0,0,0));
    var rightNow = new Date();
    var analysis_start = fs.readFileSync("py_jobs/prediction_start.txt", "utf8");

    var building = "345_Park";
    var action = "morning-startup";

    var message = {
        "namespace": building,
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
    };

    // Use node request library to update the message for this prediction day, or post one if one doesn't exits
    var query = {
        "name": "morning-startup",
        "date": message_date,
        "namespace": building
    };
    var qs = new Buffer( JSON.stringify( query ) ).toString('base64');



    var headers = {
        "authorization": "7McdaRC6fULlka2cPgsZ",
        "version": "0.0.1",
        "Content-Type": "application/json"
    };
    var getMessageOptions = {
        "url": "https://buildings.nantum.io/" + building + "/messages/?q=" + qs,
        "headers": headers
    };


    // Do the request
    request(getMessageOptions, function(err, res, body) {

        var options = {
            "json": true,
            "headers": headers,
            "body": message
        };

        if (err) logger("error GETting messages: " + err);

        else if (res.statusCode == 200 && body.docs) {
            // If there are more than 0 messages for the day that the prediction is for

            options.method = "PUT";
            options.url = "https://buildings.nantum.io/" + building + "/messages/" + body.docs[0]._id;

            request(options, function(err, res, body) {
                if (err) logger("error PUTing message: " + err.toString());
                else console.log("Success PUTing message: " + body.toString());
            });

        } else if (res.statusCode == 200) {
            // If there are not yet messages for the day the prediction is for

            options.method = "POST";
            options.url = "https://buildings.nantum.io/" + building + "/messages";

            request(options, function(err, res, body) {
                if (err) logger("error POSTing message: " + err.toString());
                else console.log("Success POSTing message: " + body.toString());
            });
        }
    });

}



var query = {
    "type" : type,
    "target" : target
};
query = new Buffer(JSON.stringify(query)).toString('base64');


function updateStuff(resource, query, obj, namespace, target, type, state) {
    // make GET request to find ID
    var headers = {
        'authorization' : '7McdaRC6fULlka2cPgsZ',
        'version' : '0.0.1',
        'Content-Type' : 'application/json'
    };
    var options = {
        url : "https://buildings.nantum.io/" + namespace + "/" + resource + "?q=" + query,
        headers : headers
    };
    request(options, function(err, response, body) {
        if(err || response.statusCode != 200) {
            logger("Error lookup up state for building/target/type: " + namespace + "/" + target + "/" + type);
            logger(err);
            return;
        }

        // BUILD OBJECT TO PUT
        var now = new Date();
        var update = { "obj" : {} };
        if (resource == "state") {
            update.obj.namespace = namespace;
            update.obj.type = type;
            update.obj.state = state;
            update.obj.last_modified = now;
            update.obj.last_modified_by = "an_go filewatcher";
            if(target) { update.obj.target = target; }
        } else if (resource == "morning-startup" ) {
            update.obj = obj;
        }

        var options = { 
            method : 'PUT',
            url : "https://buildings.nantum.io/" + namespace + "/resource/",
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
        request(options, function(err, response, body) {
            if(err) {
                logger("Error saving " +  resource + " for building/target/type: " + namespace + "/" + target + "/" + type);
                logger(err);
                return;
            }
            // TODO: check for OK status code
        });
    });
}
