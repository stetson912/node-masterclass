// these are the request handlers

// Dependencies
var _data = require('./data');
var helpers = require('./helpers');

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
    callback(400,{'Error': 'Missing required field'});
  }

};

// users put
// required field is phone
//optional data : firstName, lastName, password (at least one of these must be provided)
// TODO: only let authenticated user update their own object. don't let them uptade any other object
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
      }else {
        callback(400,{"Error":"Could not fine specified user."});
      }
    });
  } else {
    callback(400,{'Error': 'Missing required field'});
  }

};

module.exports = handlers;
