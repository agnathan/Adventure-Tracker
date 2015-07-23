"use strict";
var azure = require('azure-storage');

var childProcess = require('child_process');
var fs = require("fs");
var http = require('http');
var app = http.createServer(function (req, res) {
    'use strict';
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('<h1>Hello world from Intel IoT platform!</h1>');
}).listen(2001);

var _socket;
function startOpenCv()
{
    
 childProcess.exec('/usr/demos/facedetect/./facedetection', function (error, stdout, stderr) {
   if (error) {
     console.log(error.stack);
     console.log('OpenCv: '+error.code);
     console.log('OpenCv: '+error.signal);
   }
   console.log('OpenCv STDOUT: '+stdout);
   console.log('OpenCv STDERR: '+stderr);
 });
}

function startBlobUpload(filename, filetoUpload)
{
    var retryOperations = new azure.ExponentialRetryPolicyFilter();
    var blobService =       azure.createBlobService('intelblobstorage','9cgGBbKXge9ZbpI3rjsltIdS6fxU4M7vby+xyQcwYlFxG94w8HK5vPFPzQsDJA4LaKLYrl7snW7Nr82Ioi9I5g==').withFilter(retryOperations);

    blobService.createContainerIfNotExists('adventtruck', {publicAccessLevel : 'blob'}, function(error, result, response){
      if(!error){
        // Container exists and is private
      }
    });

    blobService.createBlockBlobFromLocalFile('adventtruck', filename, filetoUpload, function(error, result, response){
        if(!error){
            // file uploaded
            console.log("uploaded");
        }
        else
        {
            console.log(error);
        }
        
    });
    
blobService.listBlobsSegmented('adventtruck', null, function(error, result, response){
  if(!error){
    // result contains the entries
  }
    console.log(result);
    console.log(response);
});
    
}
function startImageServer()
{
 childProcess.exec('http-server /usr/demos/facedetect -p2002 -c-1', function (error, stdout, stderr) {
   if (error) {
     console.log(error.stack);
     console.log('Image server Error Code: '+error.code);
   }
   console.log('Image Server: '+stdout);
   console.log('Image Server STDERR: '+stderr);
 });
}

//startImageServer();
//startOpenCv();


fs.watch('/usr/demos/facedetect/images', function (event, filename) {
    //Need to add these conditions as fs.watch tend to file same event multiple times
    if (filename && event == "change" && imageFile != filename) {
       //console.log('Image File: ' + filename);
        imageFile = filename;
        if(imageFile.indexOf("facefound") != -1)
        {
            console.log('Sending image: ' + filename);
           if(_socket != null)_socket.emit("imageurl", filename);
        }        
    }
});
var videoFile;
fs.watch('/usr/demos/facedetect/videos', function (event, filename) {
    //Need to add these conditions as fs.watch tend to file same event multiple times
    if (event == "change" && videoFile != filename) {
       //console.log('Image File: ' + filename);
        videoFile = filename;
        console.log('Sending video: ' + filename);
       if(_socket != null)_socket.emit("videourl", filename.replace(".mp4",""));
    }
});

var avconv = require('avconv');
var stream = null;
var _videofilename = null;
_videofilename = (new Date()).getTime() + '.mp4';
startCaptureing();
stopCapturing();
function startCaptureing()
{
    var params = [
        '-f', 'video4linux2',
        '-r', '22',
        '-i', '/dev/video0',
        '-f' ,'alsa',
        '-i', 'plughw:U0x46d0x81b,0',
        '-ar', '22050',
        '-ab', '64k',
        '-strict', 'experimental', 
        '-acodec', 'aac',
        '-vcodec', 'mpeg4',
        '-y', '/output.mp4',
        '-loglevel', 'info'
    ];

    // Returns a duplex stream
    stream = avconv(params);

    // Anytime avconv outputs any information, forward these results to process.stdout
    stream.on('message', function(data) {
        process.stdout.write(data);
    })

    stream.once('exit', function(exitCode, signal, metadata) {

        console.log("------------------COMPLETED CAPTURE----------------------------");
        console.log(exitCode);
        console.log(signal);
        convertToWebMp4();
    });
}
function stopCapturing()
{
    setTimeout(function(){
        stream.kill();
    },15000);
}
function convertToWebMp4()
{
    console.log(_videofilename);
    var paramsconvert = [
        '-i', '/output.mp4',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf' ,'22',
        '-strict', 'experimental', 
        '-acodec', 'aac',
        '-b:a', '128k',
        '-y', '/usr/demos/facedetect/videos/' + _videofilename 
    ];

    // Returns a duplex stream
    var streamconvert = avconv(paramsconvert);

    // Anytime avconv outputs any information, forward these results to process.stdout
    streamconvert.on('message', function(data) {
        process.stdout.write(data);
    })

    streamconvert.on('progress', function(progress) {
        console.log((progress.toFixed(2) * 100) + "%");
        /*
        Progress is a floating number between 0 ... 1 that keeps you
        informed about the current avconv conversion process.
        */
    });
    
    streamconvert.once('exit', function(exitCode, signal, metadata) {
        console.log("------------------COMPLETED CONVERSION----------------------------");
        startBlobUpload(_videofilename.replace(".mp4",""),'/usr/demos/facedetect/videos/' + _videofilename);

    });
}

var io = require('socket.io')(app);
//Attach a 'connection' event handler to the server
io.on('connection', function (socket) {
    'use strict';
    _socket = socket;
    //startOpenCv();
    console.log('a user connected');
    //Emits an event along with a message
    socket.emit('connected', 'Welcome');
    socket.on('startcapture', function (data) {
        console.log('Image capture started');
        startOpenCv();
    });

    
    //Attach a 'disconnect' event handler to the socket
    socket.on('disconnect', function () {
        _socket = null;
        console.log('user disconnected');
    });
});




