/*
*
* helpers for various tasks
*
*/

// Dependencies
var crypto = require('crypto');
var config = require('./config');


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





// export the module
module.exports = helpers;
