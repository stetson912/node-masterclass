/*
*
* helpers for various tasks
*
*/
// Dependencies
var crypto = require('crypto');
var config = require('./config');
var https = require('https');
var querystring = require('querystring');


var helpers = {};

helpers.hash = function(str){
  if(typeof(str) == 'string' && str.length > 0){
    var hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
};

// pares a json object in all cases without throwing
helpers.parseJsonToObject = function(str){
  try {
    var obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
};

// creat a string of random alpha numeric characthers of a given length
helpers.createRandomString = function(strLength){
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;

  if(strLength){
    // Define all possible characters that can make the string
    var possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    // create final string
    var str = '';
    for(i = 1; i <= strLength; i++){
      // get random character from possibleCharacters string and append to string
      var randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
      str += randomCharacter;
    }
    return str;

  } else {
    return false;
  }
};

// send an sms messave via Twilio
helpers.sendTwilioSms = function(phone,msg,callback){
  // validate parameters
  phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
  msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
  if(phone && msg){
    // configure the request payload to send to twilio
    var payload = {
      'From': config.twilio.fromPhone,
      'To' : '+1' + phone, 
      'Body' : msg
    }
    // stringify the payload
    var stringPayload = querystring.stringify(payload);

    // configure the request details
    var requestDetails = {
      'protocol': 'https:',
      'hostname' : 'api.twilio.com',
      'method' : 'POST',
      'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json', // end was 'Messages.json'
      'auth' : config.twilio.accountSid + ':' + config.twilio.authToken,
      'headers':{
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length' : Buffer.byteLength(stringPayload)
      }
    };
    // instantiate the request object
    var req = https.request(requestDetails,function(res){
      // grab the status of the sent request
      var status = res.statusCode;
      // callback successfully if request went through
      if(status == 200 || status == 201){
        callback(false);
      } else {
        callback('Status code returned was '+ status);
      }
    });

    // Bind to error event so it doesn't get thrown
    req.on('error',function(e){
      callback(e);
    });

    // Add teh payload
    req.write(stringPayload);

    // end request
    req.end();

  } else {
    callback('Given parameters were missing or invalid');
  }
};



// export the module
module.exports = helpers;
