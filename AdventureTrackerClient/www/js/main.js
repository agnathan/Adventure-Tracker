/*jslint unparam: true */

/* jshint strict: true, -W097, unused:false  */
/*global window, document, d3, $, io, navigator, setTimeout */

var socket;
function getUniqueId()
{
    return (new Date()).getTime();
}


function createVideo(videoUrl, source)
{
    var video = document.createElement('video');
    video.setAttribute("controls","true");
    video.src = source + "?time=" + getUniqueId();
    video.id = videoUrl; 
    video.className = "video";
    video.autoPlay = true;
    return video;
}


/*
Function: validateIP()
Parameter: none
Description: Attempt to connect to server/Intel IoT platform
*/

function connectToServer() {
    'use strict';

    //Get values from text fields
        var  ip_addr = $("#ip_address").val(),
        port = $("#port").val(),
        script = document.createElement("script");

    //create script tag for socket.io.js file located on your IoT platform (development board)
    script.setAttribute("src", "http://" + ip_addr + ":" + port + "/socket.io/socket.io.js");
    document.head.appendChild(script);
    
    //Wait 1 second before attempting to connect
    setTimeout(function(){
        try {
            //Connect to Server
            socket = io.connect("http://" + ip_addr + ":" + port);

            //Attach a 'connected' event handler to the socket
            socket.on("connected", function (message) {
                alert("Connected to Photo Server");
            });

            //Set all Back button to not show
            $.ui.showBackButton = false;
            //Load page with transition
            $.ui.loadContent("#main", false, false, "fade");

            var documentcontainer  = document.getElementById("main");
            var azuremediaserver = "https://intelblobstorage.blob.core.windows.net/adventtracker/";
            socket.on("dictation", function (text) {
                var dictation = document.createElement('div');
                dictation.innerHTML = text;
                documentcontainer.appendChild(dictation); 
            });

            socket.on("videourl", function (videoUrl) {
                console.log(videoUrl);
                var vid = document.getElementById(videoUrl);
                if(vid != null)
                {
                    documentcontainer.replaceChild(createVideo(videoUrl, azuremediaserver + videoUrl),vid);
                    //vid.load();
                }
                else
                {
                    documentcontainer.appendChild(createVideo(videoUrl, azuremediaserver + videoUrl));
                }
            });

            //NOT BEING USED RIGHT NOW
            socket.on("faces", function (faces) {
                var images = JSON.parse(faces);
                console.log(faces);
                var imageUrl = "";
                for(i=0;i<images.length;i++)
                {
                    imageUrl = images[0].src + "?time=" + (new Date().getTime()); 
                    console.log(imageUrl);
                    var img = document.createElement('img');
                    img.src = azuremediaserver + imageUrl;
                    img.onload = function(){
                        documentcontainer.appendChild(img);
                        console.log(img.src);
                        img.style.width = "50px";
                        img.style.height = "50px";
                        img = null;
                    }
                }
            });

            socket.on("face", function (imageUrl) {
                console.log(imageUrl);
                var img = null;
                if(document.getElementById(imageUrl) == null)
                {
                    img = document.createElement('img');
                    img.id = imageUrl;
                    documentcontainer.appendChild(img);
                }
                else img = document.getElementById(imageUrl);
                
                imageUrl = imageUrl + "?time=" + getUniqueId();
                img.src = azuremediaserver + imageUrl;
                img.className = "face";
                img.onload = function(){
                    console.log(img.src);
                    img = null;
                }
            });
            
            socket.on("picture", function (imageUrl) {
                console.log(imageUrl);
                var img = null;
                if(document.getElementById(imageUrl) == null)
                {
                    img = document.createElement('img');
                    img.id = imageUrl;                    
                    documentcontainer.appendChild(img);
                }
                else img = document.getElementById(imageUrl);

                imageUrl = imageUrl + "?time=" + getUniqueId();
                img.src = azuremediaserver + imageUrl;
                img.className = "picture";
                img.style.display = "inline-block";
                img.onload = function(){
                    console.log(img.src);
                    img = null;
                }
            });
        } catch (e) {
            navigator.notification.alert(
                "Server Not Available!",  // message
                "",                     // callback
                'Connection Error!',            // title
                'Ok'                  // buttonName
            );
        }
    }, 1000);

}