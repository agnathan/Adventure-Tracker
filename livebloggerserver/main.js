"use strict";
var azure = require('azure-storage');

var childProcess = require('child_process');
var fs = require("fs");
var http = require('http');
var sleep = require('sleep');
var _socket;

//Connecting to IBM BlueMix
var ORG = 'eh51jw';
var TYPE = 'adventureTracker';
var ID = 'fcc2de31b8ac';
var AUTHTOKEN = 'bHWtfhnopm(6tuBUnx';
var mqtt    = require('mqtt');
var PROTOCOL = 'mqtt';
var BROKER = ORG + '.messaging.internetofthings.ibmcloud.com';
var PORT = 1883;
//Create the url string
var URL = PROTOCOL + '://' + BROKER;
URL += ':' + PORT; 
var CLIENTID= 'd:' + ORG;
CLIENTID += ':' + TYPE;
CLIENTID += ':' + ID;
var AUTHMETHOD = 'use-token-auth';
var client  = mqtt.connect(URL, { clientId: CLIENTID, username: AUTHMETHOD, password: AUTHTOKEN });
var TOPIC = 'iot-2/evt/status/fmt/json';

//Sensor list including library
var GPSSensor = require('jsupm_ublox6');
// Instantiate a Ublox6 GPS device on uart 0.
var myGPSSensor = new GPSSensor.Ublox6(0);
// Load Grove module
var groveSensor = require('jsupm_grove');
// Create the temperature sensor object using AIO pin 0
var Temperature = new groveSensor.GroveTemp(0);
var groveGas = require('jsupm_gas');
//Connect Air quality to A1
var airQualityPin = new groveGas.TP401(1);

client.on('connect', function () {
    
  setInterval(function(){
      client.publish(TOPIC, '{"d":{"AirQuality":' + airQualityPin.getSample() + ', "Temperature":' + getTemperature() + '}}');
      var x = '{"d":{"AirQuality":' + airQualityPin.getSample() + ', "Temperature":' + getTemperature() + '}}';
      console.log(x);
  }, 2000);//Keeps publishing every 2000 milliseconds.
});

var getTemperature = function()
{
    var celsius = Temperature.value();
    var fahrenheit = celsius * 9.0/5.0 + 32.0;
    return parseFloat(fahrenheit).toFixed(2);   
}

if (!myGPSSensor.setupTty(GPSSensor.int_B9600))
{
	console.log("Failed to setup tty port parameters");
	process.exit(0);
}

var bufferLength = 256;
var nmeaBuffer  = new GPSSensor.charArray(bufferLength);

var getGPSCoordinates = function()
{
	
    if (myGPSSensor.dataAvailable())
	{
		var rv = myGPSSensor.readData(nmeaBuffer, bufferLength);

		var GPSData, dataCharCode, isNewLine, lastNewLine;
		var numlines= 0;
		if (rv > 0)
		{
			GPSData = "";
			// read only the number of characters
			// specified by myGPSSensor.readData
            console.log("This is the rv ");
            console.log(rv);
			for (var x = 0; x < rv; x++)
				GPSData += nmeaBuffer.getitem(x);
			process.stdout.write(GPSData)
            return GPSData;
		}

		if (rv < 0) // some sort of read error occured
		{
			console.log("Port read error.");
			//process.exit(0);
		}
	}
    return 0;
}

var app = http.createServer(function (req, res) {
    'use strict';
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('<h1>Hello world from Intel IoT platform!</h1>');
}).listen(2001);

var _socket;
function startImageProcessing(type)
{
 childProcess.exec('/usr/demos/adventtracker/imageprocessor \'' + type + '\'', function (error, stdout, stderr) {
   if (error) {
     console.log(error.stack);
     console.log('OpenCv: '+error.code);
     console.log('OpenCv: '+error.signal);
   }
   console.log('OpenCv STDOUT: '+stdout);
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
               if(type == "video") 
               {
                   sendMessageToClient("videourl", filename);
                   _videofilename = "";
               }
               else if(type == "image")
               {
                   sendMessageToClient("picture", filename);
               }
               else
               {
                   sendMessageToClient("face", filename);
               }
           }
            console.log(filename + " uploaded successfully");
        }
        else
        {
            console.log(error);
        }
        
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
            sleep.sleep(1);
            startBlobUpload(unqName ,'/usr/demos/adventtracker/images/' + imageFile,"face");            
            
        }        
        else if(imageFile.indexOf("picture") != -1)
        {
            unqName = "picture_" +  getUniqueId(); 
            console.log("Sending images from blog");
            setTimeout(function(){
                startBlobUpload(unqName ,'/usr/demos/adventtracker/images/' + imageFile,"image");            
            },1000);
        }
        
    }
});
function sendMessageToClient(key, value)
{
    console.log("[" + key + "=" + value + "]");
    if(_socket != null)_socket.emit(key,value);
}

var commandfile = "";
fs.watch('/usr/demos/adventtracker/voice', function (event, filename) {
    //Need to add these conditions as fs.watch tend to file same event multiple times
    if (event == "change" && commandfile != filename)
    {
       //console.log('Image File: ' + filename);
        commandfile = filename;
        var stop = new Date().getTime();
        if(commandfile.indexOf("command") != -1)
        {
            var commandvalue = fs.readFileSync("/usr/demos/adventtracker/voice/" + filename, "utf8");
            commandvalue = commandvalue.replace("\n","");
            console.log('Received Command : ' + commandvalue);
            if(commandvalue == "findfaces")startImageProcessing("face");
            else if(commandvalue == "takepicture")startImageProcessing("picture");
            else if(commandvalue == "startrecording")startCaptureing();           
        }        
        else if(commandfile.indexOf("dictation") != -1)
        {
            sendMessageToClient("dictation", fs.readFileSync('/usr/demos/adventtracker/voice/' + filename, "utf8"));
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
    /*U0x46d0x825*/
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
    },10000);
}
function convertToWebMp4()
{
    _videofilename =  getUniqueId() + '.mp4';
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
            setTimeout(function(){
                startBlobUpload(_videofilename.replace(".mp4",""),'/usr/demos/adventtracker/videos/' + _videofilename,"video");
            },1000);
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
