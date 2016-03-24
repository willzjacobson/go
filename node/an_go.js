var CronJob = require('cron').CronJob;
var PythonShell = require('python-shell');
var log = require('./logger');


// Job scheduler function
function scheduleCronJob(timeStr, filePath) {
	new CronJob(timeStr, function() {
		var splitPath = filePath.split('/');
		log('starting ' + splitPath[splitPath.length-1]);
		runPyScript(filePath);
		log('completing ' + splitPath[splitPath.length-1]);
	}, null, true, 'America/New_York');
}


// Runs a python script that calls an analytics job
function runPyScript(filePath) {
	PythonShell.run(filePath, function(err, results) {
		if (err) log('error: ' + err);
		if (results) console.log('results: ' + results);
	});
}

// Schedule benchmarks
scheduleCronJob('0 30 2 * * *', './py_jobs/benchmarks.py');  // everyday at 02:30

// scheduleCronJob('* * * * * *', './testing/test.py');

// Schedule predictions
scheduleCronJob('0 0/25 4-7 * * *', './py_jobs/predictions.py');  // run every 25 minutes everyday between 04:00 and 07:00
scheduleCronJob('0 0 18-23 * * *', './py_jobs/predictions.py');  // run on the hour everyday between 18:00 and 23:00
scheduleCronJob('0 0 0-3 * * *', './py_jobs/predictions.py');  // run on the hour everyday between 00:00 and 03:00

module.exports = {
	scheduleCronJob: scheduleCronJob,
	runPyScript: runPyScript
};




