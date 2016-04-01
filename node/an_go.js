var CronJob = require('cron').CronJob;
var PythonShell = require('python-shell');
var log = require('./logger');
var sendSMS = require('./sms');
require('./watcher.js');


// Job scheduler function
function scheduleCronJob(timeStr, filePath) {
	new CronJob(timeStr, function() {
		var splitPath = filePath.split('/');
		log.info('starting ' + splitPath[splitPath.length-1]);
		runPyScript(filePath);
	}, null, true, 'America/New_York');
}


// Runs a python script that calls an analytics job
function runPyScript(filePath) {
	PythonShell.run(filePath, function(err, results) {
		if (err) {
            log.error('Error running python script', { error: err});
			sendSMS(err);
		} else {
			var splitPath = filePath.split('/');
			log.info('successfully completing ' + splitPath[splitPath.length-1]);
			if (results) console.log('results: ' + results);
		}
	});
}

// Schedule benchmarks
scheduleCronJob('0 0 5 * * *', './py_jobs/benchmarks.py');  // everyday at 02:30

// Schedule predictions
scheduleCronJob('0 */30 1-4 * * *', './py_jobs/predictions.py');  // run every 30 minutes everyday between 01:00 and 04:00
scheduleCronJob('0 0 18-23 * * *', './py_jobs/predictions.py');  // run on the hour everyday from 18:00 and 23:00
scheduleCronJob('0 0 0 * * *', './py_jobs/predictions.py');  // run once at 00:00


// For testing
module.exports = {
	scheduleCronJob: scheduleCronJob,
	runPyScript: runPyScript
};
