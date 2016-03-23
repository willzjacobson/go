var winston = require('winston');

var logfile = 'logs.log';
winston.add(winston.transports.File, {
    filename: logfile,
    level: 'silly',
    json: false,
    timestamp: true
});

var logger = function(message) {
    winston.info(message);
};

module.exports = logger;
