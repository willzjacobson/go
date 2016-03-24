'use strict'

var chai = require('chai');
var expect = chai.expect;
var spies = require('chai-spies');
chai.use(spies);
var fs = require('fs');

// Get functions to test
var an_go = require('../an_go.js');


describe ('an_go.js file', function() {

	describe('runPyScript function', function() {

		it('runs a python script', function(done) {

			// Runs a pthon script that writes to a file. 
			// The test reads the file to check the content, then deletes the file
			an_go.runPyScript('./testing/test.py');
			setTimeout(function() {
				fs.readFile('./testing/test.txt', 'utf8', (err, data) => {
					expect(data).to.equal('runPyScript test');
					fs.unlinkSync('./testing/test.txt');
					done();
				});
			}, 50);

		});

	});

	describe('scheduleCronJob function', function() {

		it('schedules and calls runPyScript using cron syntax', function(done) {

			an_go.scheduleCronJob('* * * * * *', './testing/test.py');
			setTimeout(function() {
				fs.readFile('./testing/test.txt', 'utf8', (err, data) => {
					expect(data).to.equal('runPyScript test');
					console.log('data!!!', data)
					fs.unlinkSync('./testing/test.txt');
					done();
				});
			}, 1050);

		});

	});

});

