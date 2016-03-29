var winston = require('winston');
var fs = require('fs');
var path = require('path');

var logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

var logger = new(winston.Logger)({
    transports: [
        new(winston.transports.File)({
            name: 'file-all',
            filename: path.join(logDir, 'logs-all.log'),
            level: 'silly',
            json: true,
            timestamp: true
        }),
        new(winston.transports.File)({
            name: 'file-error',
            filename: path.join(logDir, 'logs-error.log'),
            level: 'error',
            json: false,
            timestamp: true
        }),
        new(winston.transports.File)({
            name: 'file-info',
            filename: path.join(logDir, 'logs-info.log'),
            level: 'info',
            json: false,
            timestamp: true
        })
    ]
});

module.exports = logger;
