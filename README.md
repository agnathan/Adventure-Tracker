# Adventure-Tracker
opkg packages to be installed
--------------------------------
1. opkg install libav
2. opkg install python-opencv

npm modules to be installed
-----------------------------------
1. npm install -g avconv
2. npm install -g azure-storage

Directory structure (mkdir)
-----------------------------
/usr/demos
/usr/demos/adventtracker
/usr/demos/adventtracker/images
/usr/demos/adventtracker/videos
/usr/demos/adventtracker/voice

Files under /usr/demos/adventtracker/:
--------------------------------
Main NodeJS Server: adventtrackerserver.js
Face detection and picture capture : 
1. imageprocessor (give exec permission by using chmod 755)
This is the c++ program that is responsible for image capture and face finding..
2. haarcascade_frontalface_alt.xml


Dev Status:
Raghavendra:
--------------
Image Processing (C++):
1. Face detection - done
2. Full Picture - done
Video Recording:
1. recording in H.264 format using avconv.  
2. converting to webm is pending
NodeJS Server:
1. Launching c++ is done.. But, need to test. Had few issues
2. Uploading blob to azure - Done.
3. Sending queue messages to cloud - Pending. Need to copy code from other project.

HTML5/XDK
1. Able to create dynamic video tags using HTML5 is done. Loading from XDK is yet to be tested.
2. So far dont have any solutoin to read queue messages from Azure on javascript. Restful API examples are not found
worst case, might go with local webserver on edison for this. 
3. End to end integration -  pending.  

Grace:
-----------------------
Voice recognition
Node JS Server Modification