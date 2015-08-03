"use strict";
var azure = require('azure-storage');

var childProcess = require('child_process');
var fs = require("fs");
var http = require('http');
var _socket;

var app = http.createServer(function (req, res) {
    'use strict';
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('<h1>Hello world from Intel IoT platform!</h1>');
}).listen(2001);

var _socket;
function startImageProcessing(type)
{
    
 childProcess.exec('/usr/demos/adventtracker/./imageprocessor \'' + type + '\'', function (error, stdout, stderr) {
   if (error) {
     console.log(error.stack);
     console.log('OpenCv: '+error.code);
     console.log('OpenCv: '+error.signal);
   }
   console.log('OpenCv STDOUT: '+stdout);
   console.log('OpenCv STDERR: '+stderr);
 });
}

function startBlobUpload(filename, filetoUpload, type)
{
    var retryOperations = new azure.ExponentialRetryPolicyFilter();
    var blobService =               azure.createBlobService('intelblobstorage','9cgGBbKXge9ZbpI3rjsltIdS6fxU4M7vby+xyQcwYlFxG94w8HK5vPFPzQsDJA4LaKLYrl7snW7Nr82Ioi9I5g==').withFilter(retryOperations);

    blobService.createContainerIfNotExists('adventtracker', {publicAccessLevel : 'blob'}, function(error, result, response){
      if(!error){
        // Container exists and is private
      }
    });

    blobService.createBlockBlobFromLocalFile('adventtracker', filename, filetoUpload, function(error, result, response){
        if(!error){
            // file uploaded
           if(_socket != null)
           {
               if(type == "video") sendMessageToClient("videourl", filename);
               else  sendMessageToClient("imageurl", filename);
           }
            console.log("uploaded");
        }
        else
        {
            console.log(error);
        }
        
    });
    
    blobService.listBlobsSegmented('adventtracker', null, function(error, result, response){
      if(!error){
        // result contains the entries
      }
        console.log(result);
        console.log(response);
    });
    
}

var imageFile = "";
fs.watch('/usr/demos/adventtracker/images', function (event, filename) {
    //Need to add these conditions as fs.watch tend to file same event multiple times
    if (event == "change" && imageFile != filename) {
       //console.log('Image File: ' + filename);
        imageFile = filename;
        var unqName  = "";
        if(imageFile.indexOf("facefound") != -1)
        {
            console.log('Sending image: ' + filename);
            unqName = "face_" +  getUniqueId(); 
            startBlobUpload(uniqueName ,'/usr/demos/adventtracker/images/' + _videofilename,"image");            
        }        
        else if(imageFile.indexOf("picture") != -1)
        {
            unqName = "picture_" +  getUniqueId(); 
            startBlobUpload(uniqueName ,'/usr/demos/adventtracker/images/' + _videofilename,"image");            
        }
        
    }
});
function sendMessageToClient(key, value)
{
    if(_socket != null)_socket.emit(key,value);
}

var commandfile = "";
fs.watch('/usr/demos/adventtracker/voice', function (event, filename) {
    //Need to add these conditions as fs.watch tend to file same event multiple times
    if (event == "change" && commandfile != filename) {
       //console.log('Image File: ' + filename);
        commandfile = filename;
        if(commandfile.indexOf("command") != -1)
        {

            var commandvalue = fs.readFileSync(filename, "utf8");
            console.log('Received Command : ' + commandvalue);
            if(commandvalue == "findfaces")startImageProcessing("findfaces");
            else if(commandvalue == "picture")startImageProcessing("picture");
            else if(commandvalue == "startrecording")startCaptureing();
            else if(commandvalue == "stoprecording")stopCapturing();            
        }        
        else if(commandfile.indexOf("dictation") != -1)
        {
            sendMessageToClient("dictation", fs.readFileSync(filename, "utf8"));
        }
    }
});

function getUniqueId()
{
    return (new Date()).getTime();
}

var avconv = require('avconv');
var stream = null;
var _videofilename = null;
_videofilename =  getUniqueId() + '.mp4';
//startCaptureing();
//stopCapturing();
function startCaptureing()
{
    stopCapturing();
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
    },20000);
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
        '-y', '/usr/demos/adventtracker/videos/' + _videofilename 
    ];

    // Returns a duplex stream
    var streamconvert = avconv(paramsconvert);

    // Anytime avconv outputs any information, forward these results to process.stdout
    streamconvert.on('message', function(data) {
        process.stdout.write(data);
    })

    streamconvert.on('progress', function(progress) {
        console.log((progress.toFixed(2) * 100) + "%");
    });
    
    streamconvert.once('exit', function(exitCode, signal, metadata) {
        console.log("------------------COMPLETED CONVERSION----------------------------");
        startBlobUpload(_videofilename.replace(".mp4",""),'/usr/demos/adventtracker/videos/' + _videofilename,"video");
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
        //startOpenCv();
    });

    
    //Attach a 'disconnect' event handler to the socket
    socket.on('disconnect', function () {
        _socket = null;
        console.log('user disconnected');
    });
});
