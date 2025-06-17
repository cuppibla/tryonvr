# **App Name**: Virtual Dresser

## Core Features:

- Camera Access: Enable the device's camera to provide a real-time video stream. The video stream will be mirrored.
- Model Upload: Allow users to upload 3D models of clothing in common formats (.glb, .gltf). Display the name of the successfully loaded model.
- Pose Tracking: Use MediaPipe Pose to detect the user's body pose in the video stream, providing real-time skeletal tracking to determine where to place the clothing model. This tool will return the coordinates of landmarks.
- Virtual Try-On: Render the uploaded 3D clothing model on top of the live video feed, aligning it with the user's detected pose.
- Camera Toggle: A toggle button will enable/disable the camera.

## Style Guidelines:

- Primary color: Slate blue (#778DA9) to create a calm and tech-forward feel.
- Background color: Very light gray (#F1F1F1) to keep the focus on the virtual try-on experience.
- Accent color: Pale lavender (#B0B8D9) for interactive elements.
- Body and headline font: 'Inter' sans-serif font for clear UI.
- Simple, clean icons for upload, settings, and camera toggle.
- Keep the video feed prominent, with controls at the bottom.
- Subtle fade-in animations when loading models or detecting pose.