/*jslint unparam: true */

/* jshint strict: true, -W097, unused:false  */
/*global window, document, d3, $, io, navigator, setTimeout */

var socket;

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

            var documentcontainer  = document.getElementById("documentcontainer");

            socket.on("dictation", function (text) {
                var dictation = document.createElement('div');
                dictation.innerHTML = text;
                documentcontainer.appendChild(dictation); 
            });

            socket.on("videourl", function (videoUrl) {
                videoUrl += "?time=" + (new Date().getTime());
                documentcontainer.appendChild(createVideo("https://intelblobstorage.blob.core.windows.net/adventtruck/" + videoUrl));
            });

                //createVideo('https://intelblobstorage.blob.core.windows.net/adventtruck/1437719774257?time=' + getUniqueId());
                //createVideo('https://intelblobstorage.blob.core.windows.net/adventtruck/1437596492797?time=' + getUniqueId());
            function getUniqueId()
            {
                return (new Date()).getTime();
            }

            function createVideo(source)
            {
                var video = document.createElement('video');
                video.setAttribute("controls","true");
                video.src = source;
                video.id = + getUniqueId();
                video.autoPlay = true;
                return video;
            }

            
            socket.on("faces", function (faces) {
                var images = JSON.parse(faces);
                var imageUrl = "";
                for(i=0;i<images.length;i++)
                {
                    imageUrl = images[0].src + "?time=" + (new Date().getTime()); 
                    console.log(imageUrl);
                    var img = document.createElement('img');
                    img.src = "https://intelblobstorage.blob.core.windows.net/adventtruck/" + imageUrl;
                    img.onload = function(){
                        documentcontainer.appendChild(img);
                        console.log(img.src);
                        img.style.width = "50px";
                        img.style.height = "50px";
                        img = null;
                    }
                }
            });

            
            socket.on("picture", function (imageUrl) {
                var imageUrl += "?time=" + (new Date().getTime());
                var img = document.createElement('img');
                img.src = "https://intelblobstorage.blob.core.windows.net/adventtruck/" + imageUrl;
                img.onload = function(){
                    documentcontainer.appendChild(img);
                    console.log(img.src);
                    img.style.width = "300px";
                    img.style.height = "300px";
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
