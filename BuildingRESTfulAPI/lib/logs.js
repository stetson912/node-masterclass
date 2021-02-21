/*
* Library for storing and rotating logs
*/

// Dependencies 
const { SSL_OP_LEGACY_SERVER_CONNECT } = require('constants');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

// container for the module
var lib = {};

// base directory for the logs folder
lib.baseDir = path.join(__dirname,'/../.logs/');

// append a string to a file. create file if it does not exist
lib.append = function(file,str,callback){
    // open the file for appending
    fs.open(lib.baseDir+file+'.log','a',function(err,fileDescriptor){
        if(!err && fileDescriptor){
            fs.appendFile(fileDescriptor,str+'\n',function(err){
                if(!err){
                    fs.close(fileDescriptor,function(err){
                        if(!err){
                            callback(false);
                        }else{
                            callback("Error closing file being appended");
                        }
                    });
                } else {
                    callback("Error appending file.");
                }
            });
        }else {
            console.log("Could not open file for appending.");
        }
    });
}

// List all the logs and optionally include the compressed logs
lib.list = function(includeCompressedLogs,callback){
    fs.readdir(lib.baseDir,function(err,data){
        if(!err && data && data.length > 0){
            var trimmedFileNames = [];
            data.forEach(function(fileName){
                // Add the .log files
                if(fileName.indexOf('.log') > 0){
                    trimmedFileNames.push(fileName.replace('.log',''));
                }

                // Add on the compressed files .gz b64 format
                if(fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs){
                    trimmedFileNames.push(fileName.replace('.gz.b64',''));
                }
            });
            callback(false,trimmedFileNames);
        } else {
            callback(err,data);
        }
    });
};

// compress the contents of one .log file to .gz.b64 file within same directory
lib.compress = function(logId,newFileId,callback){
    var sourceFile = logId + '.log';
    var destFile = newFileId + '.gz.b64';

    // read the source file
    fs.readFile(lib.baseDir + sourceFile, 'utf8',function(err,inputString){
        if(!err && inputString){
            // compress the data using gzip
            zlib.gzip(inputString,function(err,buffer){
                if(!err && buffer){
                    // send new compressed data to destination file
                    fs.open(lib.baseDir + destFile, 'wx', function(err,fileDescriptor){
                        if(!err && fileDescriptor){
                            // write to destination file 
                            fs.writeFile(fileDescriptor,buffer.toString('base64'),function(err){
                                if(!err){
                                    // close destination file
                                    fs.close(fileDescriptor,function(err){
                                        if(!err){
                                            callback(false);
                                        } else{
                                            callback(err);
                                        }
                                    });
                                } else {
                                    callback(err);
                                }
                            });
                        } else {
                            callback(err);
                        }
                    });
                } else{
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
};

// decompress contents of .gz.b64 file into string variable
lib.decompress = function(fileId,callback){
    var fileName = fileId + '.gz.b64';
    fs.readFile(lib.baseDir+fileName,'utf8',function(err,str){
        if(!err && str){
            // decompress the data
            var inputBuffer = Buffer.from(str,'base64');
            zlib.unzip(inputBuffer,function(err,outputBuffer){
                if(!err && outputBuffer){
                    // callback 
                    var str = outputBuffer.toString();
                    callback(false,str);
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
};
//truncate a log file
lib.truncate = function(logId,callback){
    fs.truncate(lib.baseDir + logId + '.log',0,function(err){
        if(!err){
            callback(false);
        } else {
            callback(err);
        }
    });
};






//export the module
module.exports = lib;