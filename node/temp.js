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

    create_or_update("messages", building, message);
}




function create_or_update(resource, namespace, obj, target, type, state) {
    
    // Build query string
    var query = {};
    if (resource == "states") {
        query.type = type;
        query.target = target
    } else if (resource == "messages") {
        query.name = "morning-startup";
        query.date = message_date;
        query.namespace = namespace
    }
    query = new Buffer(JSON.stringify(query)).toString('base64');

    // Define headers and options for request
    var headers = {
        'authorization' : '7McdaRC6fULlka2cPgsZ',
        'version' : '0.0.1',
        'Content-Type' : 'application/json'
    };
    var options = {
        url : "https://buildings.nantum.io/" + namespace + "/" + resource + "?q=" + query,
        headers : headers
    };

    // Make get request to find id if document exists
    request(options, function(err, response, body) {
        if(err || response.statusCode != 200) {
            if (resource == "states") logger("Error lookup up " + resource + " for building/target/type: " + namespace + "/" + target + "/" + type);
            if (resource == "messages") logger("Error lookup up " + resource + " for building/name/date: " + namespace + "/" + obj.name + "/" + obj.message_date);
            logger(err);
            return;
        }

        // Build object to PUT/POST
        var now = new Date();
        var update = { "obj" : {} };
        if (resource == "states") {
            update.obj.namespace = namespace;
            update.obj.type = type;
            update.obj.state = state;
            update.obj.last_modified = now;
            update.obj.last_modified_by = "an_go filewatcher";
            if(target) { update.obj.target = target; }
        } else if (resource == "messages" ) {
            update.obj = obj;
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
                if (resource == "states") logger("Error saving " +  resource + " for building/target/type: " + namespace + "/" + target + "/" + type);
                if (resource == "messages") logger("Error saving " + resource + " for building/name/date: " + namespace + "/" + obj.name + "/" + obj.message_date);
                logger(err);
                return;
            } else {
                if (resource == "states") logger("Successful save/update: " +  resource + " for building/target/type: " + namespace + "/" + target + "/" + type);
                if (resource == "messages") logger("Successful save/update: " + resource + " for building/name/date: " + namespace + "/" + obj.name + "/" + obj.message_date);
            }
        });
    });
}
