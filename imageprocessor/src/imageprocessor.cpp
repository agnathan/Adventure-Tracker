#include "opencv2/objdetect/objdetect.hpp"
#include "opencv2/imgproc/imgproc.hpp"
#include <opencv/highgui.h>
#include <opencv/cv.h>
#include <fcntl.h>
#include <unistd.h>
#include <string>
#include <iostream>
#include <fstream>
using namespace std;
using namespace cv;

/** Function Headers */
void findFaces(Mat frame);

/** Global variables */
String face_cascade_name =
		"/usr/demos/adventtracker/haarcascade_frontalface_alt.xml";
CascadeClassifier face_cascade;
int counter = 0;

int main(int argc, const char* argv[]) {

	const string command = argv[1];           // the source file name
	cout << command;
	srand(time(NULL));

	Mat frame;
	if (command == "picture") {
		try
		{
		system("exec rm -r /usr/demos/adventtracker/images/*");
		VideoCapture capture(0);
		capture.set(CV_CAP_PROP_FRAME_WIDTH, 320);
		capture.set(CV_CAP_PROP_FRAME_HEIGHT, 240);
		if (!capture.isOpened()) {
			puts("No camera found");
			return -1;
		}
		capture >> frame;
		int uniqueNumber = rand() * 100;
		std::stringstream temp;
		temp.str("");
		temp << "/usr/demos/adventtracker/images/picture" << uniqueNumber << ".png";
		imwrite(temp.str(), frame);

		cout << "Finished writing" << endl;
		capture.release();
		}
		catch (cv::Exception ex)
		{
				cout << ex.msg;
		}

		return 0;
	} else if (command == "face") {
		//-- 1. Load the cascades
		if (!face_cascade.load(face_cascade_name)) {
			printf(
					"You need to have haarcascade_frontalface_alt.xml at /usr/demos/adventtracker folder");
			return -1;
		};
		try {
			system("exec rm -r /usr/demos/adventtracker/images/*");
			VideoCapture capture(0);
			capture.set(CV_CAP_PROP_FRAME_WIDTH, 320);
			capture.set(CV_CAP_PROP_FRAME_HEIGHT, 240);
			if (!capture.isOpened()) {
				puts("No camera found");
				return -1;
			}
			capture >> frame;

			if (!frame.empty()) {
					findFaces(frame);
			} else {
				printf(" --(!) No captured frame -- Break!");
			}
			int c = waitKey(10);
			capture.release();
		} catch (cv::Exception ex) {
			cout << ex.msg;
		}

	}
	return 0;
}

/**
 * @Find faces
 */
void findFaces(Mat frame) {
	std::vector<Rect> faces;
	ofstream faceInfo;
	Mat frame_gray;

	std::stringstream temp;
	std::stringstream ss1;
	ss1 << "{\"id\":" << counter << ",\"type\": \"original\",\"path\":" << "\""
			<< temp.str() << "\"" << "}";

	cvtColor(frame, frame_gray, CV_BGR2GRAY);
	equalizeHist(frame_gray, frame_gray);
	//-- Detect faces
	face_cascade.detectMultiScale(frame_gray, faces, 1.1, 2,
			0 | CV_HAAR_SCALE_IMAGE, Size(30, 30));

	ss1.str("");
	ss1 << "{\"id\":" << counter << ",\"type\": \"facefound\", [";

	for (int i = 0; i < (int) faces.size(); i++) {
		Rect roi(faces[i].x - 10, faces[i].y - 10, faces[i].width + 10,
				faces[i].height + 10);
		Mat image_roi = frame(roi);
		temp.str("");
		int uniqueNumber = rand() * 100;
		temp << "/usr/demos/adventtracker/images/facefound" << uniqueNumber << ".png";
		imwrite(temp.str(), image_roi);

		ss1 << "{\"path\":" << "\"" << temp.str() << "\"}" << ",";

		temp.str("");
		cout << temp.str();
		temp << "#" << i;

		putText(frame, temp.str(),
				cvPoint(faces[i].x + faces[i].width * 0.5,
						faces[i].y + faces[i].height * 0.5),
				FONT_HERSHEY_COMPLEX_SMALL, 0.5, cvScalar(100, 100, 250), 1,
				CV_AA);
		Point center(faces[i].x + faces[i].width * 0.5,
				faces[i].y + faces[i].height * 0.5);
		ellipse(frame, center,
				Size(faces[i].width * 0.5, faces[i].height * 0.5), 0, 0, 360,
				Scalar(255, 0, 255), 2, 8, 0);
		//Mat faceROI = frame_gray( faces[i] );

	}
	ss1 << "{\"path\":\"\"}]}";

	if ((int) faces.size() > 0) {
		//Update file for reading from NodeJS
		faceInfo.open("facefound.json");
		faceInfo << ss1.str();
		// close the opened file.
		faceInfo.close();
	}

	//Picture with eclipse marking the face
	//temp.str("");
	//temp << "/usr/demos/adventtracker/images/allfaces" << counter << ".png";
	//imwrite(temp.str(), frame);

	ss1.str("");
	ss1 << "{\"id\":" << counter << ",\"type\": \"allfaces\", \"path\":" << "\""
			<< temp.str() << "\"" << "}";

	//Update file for reading from NodeJS
	faceInfo.open("allface.json");
	faceInfo << ss1.str();
	// close the opened file.
	faceInfo.close();

}
