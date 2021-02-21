/*
* Worker related tasks
*/

// Dependencies

var path = require('path');
var fs = require('fs');
var _data = require('./data');
var https = require('https');
var http = require('http');
var helpers = require('./helpers');
var url = require('url');
const { SSL_OP_LEGACY_SERVER_CONNECT } = require('constants');
var _logs = require("./logs");
var util = require('util');
var debug = util.debuglog('workers');
// const { worker } = require('cluster');
// const { hostname } = require('os');

// Instantiate worker object
var workers = {};

workers.gatherAllChecks = function(){
// Get all checks
_data.list('checks',function(err,checks){
    if(!err && checks && checks.length > 0){
        checks.forEach(function(check){
            // Read in check data
            _data.read('checks',check,function(err,originalCheckData){
                if(!err && originalCheckData){
                    // pass data to check validator and let that function continue or console.log errors as needed
                    workers.validateCheckData(originalCheckData);
                } else {
                    debug("Error reading one of the checks data.");
                }
            });
        });
    } else {
        debug("Could not find any checks to process");
    }
});
};

// Sanity checking the check data
workers.validateCheckData = function(originalCheckData){
    //console.log(originalCheckData);
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['post','get','put','delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >=1 && originalCheckData.timeoutSeconds <=5 ? originalCheckData.timeoutSeconds : false;

    // Set the keys that may not be set if workers havent seen this check before
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    // If all the checks pass pass the data along to the next step in the process
    if( originalCheckData.id &&
        originalCheckData.userPhone &&
        originalCheckData.protocol &&
        originalCheckData.url &&
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds){
            workers.performCheck(originalCheckData);
        } else {
            debug("Error: One of the checks was not formatted correctly. Skipping this check...");
        }

};

// Perform the check and send the originalCheckData and the outcome of the check process to the next step in the process 
workers.performCheck = function(originalCheckData){
    // Prepare initial check outcome
    var checkOutcome = {
        'error': false,
        'responseCode':false
    };

    // mark that the outcome has not been sent yet
    var outcomeSent = false;

    // Parse the hostname and path from originalCheckData
    /*
       url.parse is deprecated and shouldn't be used. first you create a url object using
       new URL(url goes here). to get the different parts of the url use url.hostname, 
       url.pathname, url.search for query string. consult nodejs.org for documentation
    */
   /* var reqUrl = new URL(originalCheckData.url); 
      var hostName = reqUrl.hostname;
      var path = reqUrl.pathname;
      var queryString = reqUrl.search;
   */
    var parsedUrl = url.parse(originalCheckData.protocol + "://" + originalCheckData.url, true);
    var hostname = parsedUrl.hostname;
    var path = parsedUrl.path; // we are using path and not pathname becuase we want to get the query string

    // Construct the request
    var requestDetails = {
        'protocol':originalCheckData.protocol+':',
        'hostname':hostname,
        'method':originalCheckData.method.toUpperCase(),
        'path':path,
        'timeout':originalCheckData.timeoutSeconds * 1000
    };

    // Instantiate the request object using http or https module
    // determine module to use 
    var _moduleToUse = originalCheckData.protocol == 'http' ? http:https;
    var req = _moduleToUse.request(requestDetails,function(res){
        // grab the status of the sent request
        var status = res.statusCode;

        // update the check outcome and pass data to next step
        checkOutcome.responseCode = status;
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData,checkOutcome);
            outcomeSent = true;
        }
    });
    // Bind to the error so it isn't thrown
    req.on('error',function(e){
        // update the check outcome and pass data along
        checkOutcome.error = {
            'error':true,
            'value':e
        };
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData,checkOutcome);
            outcomeSent = true;
        }
    });
    // Bind to the timeout event
    req.on('timeout',function(e){
        // update the check outcome and pass data along
        checkOutcome.error = {
            'error':true,
            'value':'timeout'
        };
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData,checkOutcome);
            outcomeSent = true;
        }
    });
    // end the request
    req.end();
};

// Process check outcome update check data as needed and trigger an alert to user as needed
// special logic to test if a check has never been tested before, we won't alert user on this
workers.processCheckOutcome = function(originalCheckData,checkOutcome){
    // decide if the check is up or down
    var state = !checkOutcome.error &&  checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up':'down';

    // decide if an alert is warranted. 
    var alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true:false;

    //log the outcome of the check
    var timeOfCheck = Date.now();
    workers.log(originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck);

    // update the check data
    var newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;



    // Save the changes
    _data.update('checks',newCheckData.id,newCheckData,function(err){
        if(!err){
            // send the newCheckData to next phase if needed
            if(alertWarranted){
                workers.alertUserToStatusChange(newCheckData);
            } else {
                debug("Check outcome not changed. No alert warranted");
            }
        } else {
            debug("Error trying to save updates to one of the checks");
        }
    });
};

// Alert user to change in check status
workers.alertUserToStatusChange = function(newCheckData){
    var msg = "Alert: Your check for " + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userPhone,msg,function(err){
        if(!err){
            debug("Success. User was alerted to status change in check via sms",msg);
        } else {
            debug("Error: Could not send sms alert to user about their check state change",err);
        }
    });
};

workers.log = function(originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck){
    //Form the log data
    var logData = {
        "check":originalCheckData,
        "outcome":checkOutcome,
        "state":state,
        "alert":alertWarranted,
        "time":timeOfCheck
    };

    //convert logData to string
    var logString = JSON.stringify(logData);
    
    // determine name of log file
    var logFileName = originalCheckData.id;
    // append logstring to file
    _logs.append(logFileName,logString,function(err){
        if(!err){
            debug("Logging to file succeeded.");
        } else{
            debug("Logging to the file failed.");
        }
    });
};

// Timer to execute the worker process once per minute
workers.loop = function(){
    setInterval(function(){
        workers.gatherAllChecks();
    },1000 * 60);
};

// rotate / compress the log files
workers.rotateLogs = function(){
    // list all non compressed log files 
    _logs.list(false, function(err,logs){
        if(!err && logs && logs.length >0){
            logs.forEach(function(logName){
                //compress the data to a different file
                var logId = logName.replace('.log', '');
                var newFileId = logId + "-" + Date.now();
                _logs.compress(logId,newFileId,function(err){
                    if(!err){
                        // truncate the log
                        _logs.truncate(logId,function(err){
                            if(!err){
                                debug("Success truncating the log file");
                            } else {
                                debug("Error truncating the log file");
                            }
                        });
                    } else {
                        debug("Error compressing one of the log files",err);
                    }
                });
            });
        } else {
            debug("Error: could not find any logs to rotate");
        }
    });
};
// Timer to execute the log-rotation process once per day
workers.logRotationLoop = function(){
    setInterval(function(){
        workers.rotateLogs();
    },1000 * 60 * 60 * 24);
};

// Init script
workers.init = function(){

    // send to console in yellow
    console.log('\x1b[33m%s\x1b[0m','Background workers are running.');
    // Execute all the checks imediately
    workers.gatherAllChecks();

    // Call the loop so checks will execute late on
    workers.loop();

    // Compress all the logs immediately
    workers.rotateLogs();

    // call the compression loop so logs wil lbe compressed later on
    workers.logRotationLoop();
};

module.exports = workers;



