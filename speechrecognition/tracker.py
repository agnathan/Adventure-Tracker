import collections
import mraa
import os
import sys
import time

# Import things for pocketsphinx
import pyaudio
import wave
import pocketsphinx as ps
import sphinxbase

# Parameters for pocketsphinx
LMD   = "/usr/demos/adventtracker/speechrecognition/TAR1944/1944.lm"
DICTD = "/usr/demos/adventtracker/speechrecognition/TAR1944/1944.dic"
CHUNK = 100
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000
RECORD_SECONDS = 2
PATH = 'output'

def decodeSpeech(speech_rec, wav_file):
	wav_file = file(wav_file,'rb')
	wav_file.seek(44)
	speech_rec.decode_raw(wav_file)
	result = speech_rec.get_hyp()
	return result[0]

def main():

	if not os.path.exists(PATH):
        	os.makedirs(PATH)

	p = pyaudio.PyAudio()
    	speech_rec = ps.Decoder(lm=LMD, dict=DICTD)
	
	#Initalize variables
	rec_mode = 0
	rec_command = 0
	rec_dictation = 0
	rec_exit = 0

    	while True:
        	# Record audio
    		stream = p.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)
    		print("* recording")
    		frames = []
    		for i in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
    			try:
				data = stream.read(CHUNK)
			except IOError as ex:
				if ex[1] != pyaudio.paInputOverflowed:
					raise
				data = '\x00' * CHUNK
    			frames.append(data)
		stream.stop_stream()
    		stream.close()

        	# Write .wav file
        	fn = "o.wav"
    		wf = wave.open(os.path.join(PATH, fn), 'wb')
    		wf.setnchannels(CHANNELS)
    		wf.setsampwidth(p.get_sample_size(FORMAT))
    		wf.setframerate(RATE)
    		wf.writeframes(b''.join(frames))
    		wf.close()

        	# Decode speech
    		wav_file = os.path.join(PATH, fn)
    		recognised = decodeSpeech(speech_rec, wav_file)
    		rec_words = recognised.split()

		if len(rec_words) == 2 and rec_words[0] == "CHANGE" and rec_words[1] == "MODE":
			rec_mode = 1
			print("Change mode")
		elif len(rec_words) == 0:
			print("\n")
		elif rec_mode == 1:
			if len(rec_words) == 2 and rec_words[0] == "START" and rec_words[1] == "DICTATION":
				rec_mode = 0
				blog_post = ""
				rec_dictation = 1
				print("Start dictation")
			elif len(rec_words) == 1 and rec_words[0] == "COMMAND":
				rec_command = 1
				rec_mode = 0
				print("Command")
		elif rec_dictation == 1:
			if len(rec_words) == 2 and rec_words[0] == "STOP" and rec_words[1] == "DICTATION":
				rec_dictation = 0
				myfile = open('/usr/demos/adventtracker/voice/dictation.txt', 'w')
				myfile.write(blog_post)
				print(blog_post)
				myfile.close()
				print("Stop dictation")
			else:
				for index in range(len(rec_words)):
					blog_post += " "
					blog_post += rec_words[index]
					print("Blogging")
		elif rec_command == 1 and len(rec_words) == 2:
			if rec_words[0] == "FIND" and rec_words[1] == "FACES":
				myfile = open('/usr/demos/adventtracker/voice/command.txt', 'w')
                                myfile.write('findfaces')                         
                                myfile.close()
				rec_command = 0
				print("Find faces")
			elif rec_words[0] == "START" and rec_words[1] == "RECORDING":
				myfile = open('/usr/demos/adventtracker/voice/command.txt', 'w')  
                                myfile.write('startrecording')                         
                                myfile.close() 
				rec_command = 0
				print("start recording")
			elif rec_words[0] == "TAKE" and rec_words[1] == "PICTURE":   
				myfile = open('/usr/demos/adventtracker/voice/command.txt', 'w')
                                myfile.write('takepicture')                         
                                myfile.close() 
				rec_command = 0
				print("take picture")


        	# Playback recognized word(s)
    		cm = 'espeak "'+recognised+'"'
    		os.system(cm)
	


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print "Keyboard interrupt received. Cleaning up..."
        allLedsOff(leds)
