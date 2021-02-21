require('dotenv').config();
/*
 * Create and export configuration variables
 *
 */

// Container for all environments
var environments = {};

// Staging (default) environment
environments.staging = {
  'httpPort' : 3000,
  'httpsPort' : 3001,
  'envName' : 'staging',
  'hashingSecret': 'thisIsASecret',
  'maxChecks': 5,
  'twilio' : {
    'accountSid':process.env.TWILIO_SID,
    'authToken':process.env.TWILIO_AUTH_TOKEN,
    'fromPhone':process.env.TWILIO_FROM_PHONE
  }
};

// Production environment
environments.production = {
  'httpPort' : 5000,
  'httpsPort' : 5001,
  'envName' : 'production',
  'hashingSecret': 'thisIsAlsoASecret',
  'maxChecks': 5,
  'twilio' : {
    'accountSid':process.env.TWILIO_ACCOUNT_SID,
    'authToken':process.env.TWILIO_AUTH_TOKEN,
    'fromPhone':process.env.TWILIO_FROM_PHONE
  }
  // for env in twilio use process.env.<env variable name>
};

// Determine which environment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments above, if not default to staging
var environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;
