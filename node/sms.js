// For sending SMS in case of disaster
var twilio = require('twilio');

var account_sid = "AC5755c23dc334935fddd96fc4dd31757d";
var auth_token = "4d35f1643235d9d1dec1bf67eae54bfc";
var client = twilio(account_sid, auth_token);
var twilio_number = "16466062457";
var numbers = ["+16467342378", "+14124200700"];

function sendSMS(msg) {
	for (var i = 0; i < numbers.length; i++) {
		client.messages.create({
			body: msg,
			to: numbers[i],
			from: twilio_number
		}, function(err, message) {
			if (err) console.log(err.message);
		});
	}
}

module.exports = sendSMS;