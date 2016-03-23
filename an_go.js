var CronJob = require('cron').CronJob;
var PythonShell = require('python-shell');
var log = require('./logger');

// PREDICTIONS
new CronJob('0 0/25 4-7 * * *', function() {
	log('starting predictions');
	runPyScript('./py_jobs/predictions.py');
	log('ending predictions');
}, null, true, 'America/New_York');

new CronJob('* 0 18-23 * * *', function() {
	log('starting predictions');
	runPyScript('./py_jobs/predictions.py');
	log('ending predictions');
}, null, true, 'America/New_York');

new CronJob('* 0 0-3 * * *', function() {
	log('starting predictions');
	runPyScript('./py_jobs/benchmarks.py');
	log('ending predictions');
}, null, true, 'America/New_York');


// BENCHMARKS
new CronJob('0 30 2 * * *', function() {
	log('starting benchmarks');
	runPyScript('./py_jobs/benchmarks.py');
	log('ending benchmarks');
}, null, true, 'America/New_York');

// Runs python script that calls analytics job
function runPyScript(filePath) {
	PythonShell.run(filePath, function(err, results) {
		if (err) console.log('error: ', err);
		if (results) console.log('results: ', results);
	});
}
