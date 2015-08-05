module.exports = {
  startCaptureing: function () {
    startCaptureing();
  },
  stopCapturing: function () {
    stopCapturing();
  }
};

var avconv = require('avconv');
var stream = null;

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
    },10000);
}
function convertToWebMp4()
{
    var paramsconvert = [
        '-i', '/output.mp4',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf' ,'22',
        '-strict', 'experimental', 
        '-acodec', 'aac',
        '-b:a', '128k',
        '-y', '/webcompatible1.mp4',
        '-loglevel', 'info'
    ];

    // Returns a duplex stream
    var streamconvert = avconv(paramsconvert);

    // Anytime avconv outputs any information, forward these results to process.stdout
    streamconvert.on('message', function(data) {
        process.stdout.write(data);
    })

    streamconvert.on('progress', function(progress) {
        console.log((progress.toFixed(2) * 100) + "%\n");
        /*
        Progress is a floating number between 0 ... 1 that keeps you
        informed about the current avconv conversion process.
        */
    });
    
    streamconvert.once('exit', function(exitCode, signal, metadata) {
        console.log("------------------COMPLETED CONVERSION----------------------------");
    });
    
}