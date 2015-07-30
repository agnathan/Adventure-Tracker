/*jslint unparam: true */

/* jshint strict: true, -W097, unused:false  */
/*global window, document, d3, $, io, navigator, setTimeout */

var socket;
function StartImageCapture()
{
    socket.emit("startcapture","start");
}

/*
Function: validateIP()
Parameter: none
Description: Attempt to connect to server/Intel IoT platform
*/
function validateIP() {
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

            var imgcontainer  = document.getElementById("imgcontainer");
/*
            if(imgcontainer.childNodes.length > 20)
            {
                while (imgcontainer.firstChild) {
                    imgcontainer.removeChild(imgcontainer.firstChild);
                }
                //imgcontainer.childNodes.innerHTML = "<strong></strong>"; 
            }
*/
            socket.on("videourl", function (videoUrl) {
                videoUrl += "?time=" + (new Date().getTime());
                var video = document.createElement('video');
                video.src = "https://intelblobstorage.blob.core.windows.net/adventtruck/" + videoUrl;
                video.onload = function(){
                    imgcontainer.appendChild(video);
                    console.log(video.src);
                    video.style.width = "150px";
                    video.style.height = "150px";
                    video = null;
                }
            });
            
            socket.on("imageurl", function (imageUrl) {
                imageUrl += "?time=" + (new Date().getTime());
                console.log(imageUrl);
                console.log(imgcontainer.childNodes.length);
                var img = document.createElement('img');
                img.src = "http://" + ip_addr + ":2002/images/" + imageUrl;
                img.onload = function(){
                    imgcontainer.appendChild(img);
                    console.log(img.src);
                    img.style.width = "150px";
                    img.style.height = "150px";
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
