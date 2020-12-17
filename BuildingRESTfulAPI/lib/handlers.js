// these are the request handlers

// Dependencies
//const { config } = require('process');
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');


// Define all the handlers
var handlers = {};

// Ping handler
handlers.ping = function(data,callback){
    callback(200);
};

// Not-Found handler
handlers.notFound = function(data,callback){
  callback(404);
};

//users handlers
handlers.users = function(data,callback){
  var acceptableMethods = ["post","get","put","delete"];
  if (acceptableMethods.indexOf(data.method) > -1){
    handlers._users[data.method](data,callback);
  } else {
      callback(405);
  }
};

// Container for users submethods
handlers._users = {};

// users post
// required fields : first name, last name, phone, password, tosagreement
handlers._users.post = function(data,callback){
  // Check that all required fields are filled out
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
  var tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

  if(firstName && lastName && phone && password && tosAgreement){
    // make sure the user doesn't already exist
    _data.read('users',phone,function(err,data){
      if(err){
        // hash the password
        var hashedPassword = helpers.hash(password);

        if(hashedPassword){
          // create user object
          var userObject = {
            'firstName' : firstName,
            'lastName' : lastName,
            'phone': phone,
            'hashedPassword': hashedPassword,
            'tosAgreement': true
          };

          // store the users
          _data.create('users',phone,userObject,function(err){
            if(!err){
              callback(200)
            } else {
              console.log(err);
              callback(500,{"Error":"Could not create user."});
            }
          });
        } else {
          callback(500,{"Error":"Could not hash the password"});
        }

      } else {
        callback(400,{"Error":"A user with that phone number already exists"});
      }
    });

  } else {
    callback(400, {"Error":"Missing required fields"});
  }

};

//users get
//required data phone:
// optional data : none
// TODO:  only let authenticated user access only thier own object.
handlers._users.get = function(data,callback){
  //check that the phone number is valid
  var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(phone){

    // get the token from the headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
    //verify that the header token is valid for the phone number
    handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
      if(tokenIsValid){
        // lookup user data in .read function is data returned from teh read function, not the data from the request handler
        _data.read('users',phone,function(err,data){
          if(!err && data){
            // remove hashed password from user object before returning it to the requester
            delete data.hashedPassword;
            callback(200,data);
          }else {
            callback(404);
          }
        });
      } else {
        callback(403,{"Error":"Missing required header token or token is invalid"});
      }
    });
  } else {
    callback(400,{'Error': 'Missing required field'});
  }

};

// users put
// required field is phone
//optional data : firstName, lastName, password (at least one of these must be provided)
handlers._users.put = function(data,callback){
  // check for required field. phone
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  // check for optional fields
  var firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  var lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  // error in all cases if phone is not provided or is invalid
  if(phone){
    // error if nothing is sent to update
    if(firstName || lastName || password){

      // get the token from the headers
      var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

      //verify that the header token is valid for the phone number
      handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
        if(tokenIsValid){
          // lookup the user
          _data.read('users',phone, function(err,userData){
            if(!err && data){
              // update necessary fields
              if(firstName){
                // update user first name
                userData.firstName = firstName;
              }

              if(lastName){
                userData.lastName = lastName;
              }
              if(password){
                userData.hashedPassword = helpers.hash(password);
              }
              // store new user information
              _data.update('users',phone,userData,function(err){
                if(!err){
                  callback(200);
                } else {
                  callback(500,{"Error":"Could not update the user"});
                }
              });
        } else {
          callback(403,{"Error":"Missing required header token or token is invalid"});
        }
      });

        } else {
          callback(400, {"Error":"The specified user does not exist"});
        }
      });

    }else {
      callback(400, {"Error":"Missing fields to update"});
    }
  } else {
    callback(400, {"Error":"Missing required field."});
  }

};

// users delete
// required field : phone
// only let an authenticated user delete their own object, not any one elses
// TODO: cleanup aka delete any other data files associated with this user
handlers._users.delete = function(data,callback){
  //check that the phone number is valid
  var phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
  if(phone){
    // get the token from the headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    //verify that the header token is valid for the phone number
    handlers._tokens.verifyToken(token,phone,function(tokenIsValid){
      if(tokenIsValid){
        // lookup user data in .read function is data returned from teh read function, not the data from the request handler
        _data.read('users',phone,function(err,data){
          if(!err && data){
            _data.delete('users',phone,function(err){
              if(!err){
                callback(200);
              } else {
                callback(500,{"Error":"Could not delete user."});
              }
            });
      } else {
        callback(403,{"Error":"Missing required header token or token is invalid"});
      }
    });

      }else {
        callback(400,{"Error":"Could not fine specified user."});
      }
    });
  } else {
    callback(400,{'Error': 'Missing required field'});
  }
};

// Tokens handlers
handlers.tokens = function(data,callback){
  var acceptableMethods = ["post","get","put","delete"];
  if (acceptableMethods.indexOf(data.method) > -1){
    handlers._tokens[data.method](data,callback);
  } else {
      callback(405);
  }
};
// Container for tokens submethods
handlers._tokens = {};

// Tokens - post
 // required fields are phone and password
 // optional data : none
handlers._tokens.post = function(data,callback){
  var phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
  var password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  if(phone && password){
    // lookup user who matches the phone number
    _data.read('users',phone,function(err, userData){
      if(!err && userData){
        // hash the sent password and compare it to the password stored in data/_users
        var hashedPassword = helpers.hash(password);
        if(hashedPassword == userData.hashedPassword){
          // if valid create a new token with random name and expiration date 1 hr in the future
          var tokenId = helpers.createRandomString(20);

          var expires = Date.now() + (1000 * 60 * 60);

          var tokenObject = {
            'phone':phone,
            'id':tokenId,
            'expires':expires
          };

          // store token
          _data.create('tokens',tokenId,tokenObject,function(err){
            if(!err) {
              callback(200,tokenObject);
            } else {
              callback(500,{"Error":"Could not create/save token"});
            }
          });
        } else {
          callback(400,{"Error":"Password does not match the specified user\'s stored password"});
        }
      } else {
        callback(400,{"Error":"Could not find specified user"});
      }
    });
  } else {
    callback(400,{"Error":"Missing required fields."});
  }
};

// Tokens - get
// required data: id
// optoinal data none
handlers._tokens.get = function(data,callback){
  // check that the sent id is valid
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
    // lookup user data in .read function is data returned from teh read function, not the data from the request handler
    _data.read('tokens',id,function(err,tokenData){
      if(!err && tokenData){
        callback(200,tokenData);
      }else {
        callback(404);
      }
    });
  } else {
    callback(400,{'Error': 'Missing required field'});
  }
};

// Tokens - put
// required fields : id and extend
// optional data : none
// TODO: only let authenticated users extend their token
handlers._tokens.put = function(data,callback){
  var id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
  var extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
  if(id && extend == true){
    // lookup the token
    _data.read('tokens',id,function(err,tokenData){
      if(!err && tokenData){
        // check if the token has expired
        if(tokenData.expires > Date.now()){
          // extend the token 1 hr
          tokenData.expires = Date.now() + (1000 *60 * 60);
          _data.update('tokens',id,tokenData,function(err){
            if(!err) {
              callback(200);
            } else {
              callback(500,{"Error":"Could not update token expiration"});
            }
          });
        } else {
          callback(400,{"Error":"Token has expired"});
        }
      } else {
        callback(400,{"Error":"Specified token does not exist"});
      }
    });
  } else {
    callback(400,{"Error":"Missing required fields or fields are invalid"});
  }


};

// Tokens - delete
// required data : id
// optional data: none
handlers._tokens.delete = function(data,callback){
  //check that the phone number is valid
  var id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
  if(id){
    // lookup user data in .read function is data returned from teh read function, not the data from the request handler
    _data.read('tokens',id,function(err,data){
      if(!err && data){
        _data.delete('tokens',id,function(err){
          if(!err){
            callback(200);
          } else {
            callback(500,{"Error":"Could not delete token."});
          }
        });
      }else {
        callback(400,{"Error":"Could not find specified token."});
      }
    });
  } else {
    callback(400,{'Error': 'Missing required field'});
  }
};

// verify that a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id,phone,callback){
  // lookup the tokens
  _data.read('tokens',id,function(err, tokenData){
    if(!err && tokenData){
      // check that teh token is for the given user and that it is not expired
      if(tokenData.phone == phone && tokenData.expires > Date.now()){
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// Checks
handlers.checks = function(data,callback){
  var acceptableMethods = ["post","get","put","delete"];
  if (acceptableMethods.indexOf(data.method) > -1){
    handlers._checks[data.method](data,callback);
  } else {
      callback(405);
  }
};

// Containter for checks methods
handlers._checks = {};

// Checks post
// required datat: protocol, url, method,sucessCodes, timeoutSeconds
// optional data: none

handlers._checks.post = function(data,callback){
  // validate inputs.
  var protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  var url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  var method = typeof(data.payload.method) == 'string' && ['get','post','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  var successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  var timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds %1 === 0 && data.payload.timeoutSeconds >=1 && data.payload.timeoutSeconds <=5 ? data.payload.timeoutSeconds : false;

  if(protocol && url && method && successCodes && timeoutSeconds){
    // Get the token form the headers
    var token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

    // Lookup the user by reading the token
    _data.read('tokens',token,function(err,tokenData){
      if(!err && tokenData){
        var userPhone = tokenData.phone;

        //Lookup user data
        _data.read('users',userPhone,function(err,userData){
          if(!err && userData){
            var userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
            // verify that user has less than max checks per user
            if(userChecks.length < config.maxChecks){
              // Create a random id for the check
              var checkId = helpers.createRandomString(20);

              // Create check object, and include the user's phone
              var checkObject = {
                'id': checkId,
                'userPhone': userPhone,
                'protocol':protocol,
                'url': url,
                'method':method,
                'successCodes':successCodes,
                'timeoutSeconds':timeoutSeconds
              };
              // save the object
              _data.create('checks',checkId,checkObject,function(err){
                if(!err){
                  // add the check id to the users object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);

                  // save the new user data.
                  _data.update('users', userPhone, userData, function(err){
                    if(!err){
                      // Return data about new check
                      callback(200,checkObject);
                    } else {
                      callback(500,{'Error':'Could not update user with new check'});
                    }
                  });
                } else {
                  callback(500,{'Error':"Could not create new check"});
                }   
              });
            } else {
              callback(400,{'Error':'The user already has the maximum number of checks ('+ config.maxChecks +')'});
            }
          } else {
            callback(403);
          }
        });

      } else {
        callback(403);
      }
    });

  } else {
    callback(400,{'Error':'Missing required inputs, or inputs are invalid'});
  }




};




module.exports = handlers;
