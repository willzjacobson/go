var CronJob = require('cron').CronJob;
var PythonShell = require('python-shell');

// PREDICTIONS
new CronJob('0 0/25 4-7 * * *', function() {
  runPyScript('./py_jobs/predictions.py');
}, null, true, 'America/New_York');

new CronJob('0 0 4-7 * * *', function() {
  runPyScript('./py_jobs/predictions.py');
}, null, true, 'America/New_York');

new CronJob('* 0 18-23 * * *', function() {
  runPyScript('./py_jobs/predictions.py');
}, null, true, 'America/New_York');


// BENCHMARKS
new CronJob('* 0 0-3 * * *', function() {
  runPyScript('./py_jobs/benchmarks.py');
}, null, true, 'America/New_York');

// Runs python script that calls analytics job
function runPyScript(filePath) {
	PythonShell.run(filePath, function(err, results) {
		if (err) console.log('error: ', err);
		if (results) console.log('results: ', results);
	});
}


// new CronJob('* * * * * *', function(){
// 	runPyScript('./py_jobs/predictions.py');
// 	console.log('running');
// }, null, true, 'America/New_York');
