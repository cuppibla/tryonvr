"use client";

import React, { useRef, useState, useEffect, Suspense, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { PoseLandmarker, FilesetResolver, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { improveModelFit, type ImproveModelFitInput } from '@/ai/flows/improve-model-fit';
import { ClothesModel, type ModelParameters } from './clothes-model';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, Camera, CameraOff, Loader2, RefreshCw } from 'lucide-react';

const initialModelParameters: ModelParameters = {
  scale: 20, // Initial guess, AI will adjust this.
  rotationY: 0,
  positionX: 0,
  positionY: -0.5, // Shifted down slightly to align better with torso
  positionZ: 0,
};

const videoConstraints = {
  width: 640,
  height: 480,
  facingMode: "user",
};

export default function VirtualTryOnClient() {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedModelUrl, setUploadedModelUrl] = useState<string | null>(null);
  const [uploadedModelName, setUploadedModelName] = useState<string | null>(null);
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
  const [poseLandmarks, setPoseLandmarks] = useState<NormalizedLandmark[] | null>(null);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isAdjustingModel, setIsAdjustingModel] = useState(false);
  const [modelParameters, setModelParameters] = useState<ModelParameters>(initialModelParameters);
  const { toast } = useToast();
  const animationFrameId = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);


  useEffect(() => {
    const createPoseLandmarker = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
        );
        const landmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1
        });
        setPoseLandmarker(landmarker);
        toast({ title: "Pose detection ready", description: "Webcam can now be enabled." });
      } catch (error) {
        console.error("Error initializing PoseLandmarker:", error);
        toast({ variant: "destructive", title: "Initialization Error", description: "Could not initialize pose detection." });
      } finally {
        setIsInitializing(false);
      }
    };
    createPoseLandmarker();
  }, [toast]);

  const predictWebcam = useCallback(async () => {
    if (!webcamEnabled || !poseLandmarker || !webcamRef.current?.video) {
      setIsDetecting(false);
      return;
    }

    const video = webcamRef.current.video;
    if (video.readyState < 2) { // Ensure video is ready
        animationFrameId.current = requestAnimationFrame(predictWebcam);
        return;
    }
    
    if (video.currentTime !== lastVideoTimeRef.current) {
      setIsDetecting(true);
      lastVideoTimeRef.current = video.currentTime;
      const startTimeMs = performance.now();
      const results = poseLandmarker.detectForVideo(video, startTimeMs);

      if (results.landmarks && results.landmarks.length > 0) {
        const currentLandmarks = results.landmarks[0];
        setPoseLandmarks(currentLandmarks);

        if (uploadedModelUrl && !isAdjustingModel) {
          setIsAdjustingModel(true);
          try {
            const videoWidth = video.videoWidth || videoConstraints.width;
            const videoHeight = video.videoHeight || videoConstraints.height;
            
            const aiInput: ImproveModelFitInput = {
              poseLandmarks: currentLandmarks.map(lm => ({ x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility ?? 0 })),
              modelParameters: { ...modelParameters },
              videoWidth,
              videoHeight,
            };
            const aiOutput = await improveModelFit(aiInput);
            setModelParameters(aiOutput.updatedModelParameters);
            // toast({ title: "Model Adjusted", description: "AI has updated the model fit." });
          } catch (error) {
            console.error("Error adjusting model fit with AI:", error);
            toast({ variant: "destructive", title: "AI Error", description: "Could not adjust model fit." });
          } finally {
            setIsAdjustingModel(false);
          }
        }
      } else {
        setPoseLandmarks(null);
      }
      setIsDetecting(false);
    }
    animationFrameId.current = requestAnimationFrame(predictWebcam);
  }, [webcamEnabled, poseLandmarker, uploadedModelUrl, modelParameters, toast, isAdjustingModel]);


  useEffect(() => {
    if (webcamEnabled && poseLandmarker) {
      lastVideoTimeRef.current = -1; // Reset video time tracking
      animationFrameId.current = requestAnimationFrame(predictWebcam);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      setIsDetecting(false);
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [webcamEnabled, poseLandmarker, predictWebcam]);

  const handleModelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (uploadedModelUrl) {
        URL.revokeObjectURL(uploadedModelUrl);
      }
      const url = URL.createObjectURL(file);
      setUploadedModelUrl(url);
      setUploadedModelName(file.name);
      setModelParameters(initialModelParameters); // Reset parameters for new model
      toast({ title: "Model Loaded", description: `${file.name} is ready.` });
    }
  };

  const toggleWebcam = () => {
    if (isInitializing) {
      toast({ title: "Please wait", description: "Pose detection is still initializing." });
      return;
    }
    setWebcamEnabled(prev => !prev);
    if (webcamEnabled) { // If turning off
      setPoseLandmarks(null);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleManualAdjust = async () => {
    if (!poseLandmarks || !uploadedModelUrl) {
      toast({ title: "Cannot adjust", description: "Enable webcam, load a model, and ensure pose is detected." });
      return;
    }
    if (isAdjustingModel) return;

    setIsAdjustingModel(true);
    try {
      const video = webcamRef.current?.video;
      if (!video) throw new Error("Webcam video not available");

      const videoWidth = video.videoWidth || videoConstraints.width;
      const videoHeight = video.videoHeight || videoConstraints.height;

      const aiInput: ImproveModelFitInput = {
        poseLandmarks: poseLandmarks.map(lm => ({ x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility ?? 0 })),
        modelParameters: { ...modelParameters },
        videoWidth,
        videoHeight,
      };
      const aiOutput = await improveModelFit(aiInput);
      setModelParameters(aiOutput.updatedModelParameters);
      toast({ title: "Model Re-Adjusted", description: "AI has updated the model fit based on current pose." });
    } catch (error) {
      console.error("Error manually adjusting model fit with AI:", error);
      toast({ variant: "destructive", title: "AI Error", description: "Could not re-adjust model fit." });
    } finally {
      setIsAdjustingModel(false);
    }
  };

  return (
    <div className="relative flex flex-col w-screen h-screen overflow-hidden bg-[#F1F1F1]">
      <div className="relative flex-grow w-full h-full">
        {webcamEnabled && (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            className="absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1]"
            onUserMedia={() => console.log("Webcam stream active")}
            onUserMediaError={(error) => {
              console.error("Webcam error:", error);
              toast({variant: "destructive", title: "Webcam Error", description: "Could not access webcam."});
              setWebcamEnabled(false);
            }}
          />
        )}

        {webcamEnabled && uploadedModelUrl && poseLandmarks && (
          <Canvas
            camera={{ position: [0, 0, 2.5], fov: 50 }} // Adjust camera for better view
            className="absolute top-0 left-0 w-full h-full bg-transparent"
            gl={{ alpha: true, antialias: true }}
            style={{ pointerEvents: 'none' }} // Make canvas non-interactive for OrbitControls unless needed
          >
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <Environment preset="city" />
            <Suspense fallback={null}>
              <ClothesModel url={uploadedModelUrl} modelParameters={modelParameters} />
            </Suspense>
            {/* <OrbitControls /> */} {/* Enable for debugging */}
          </Canvas>
        )}

        {/* Status indicators could be placed here, e.g., top-right corner */}
        <div className="absolute top-4 right-4 p-2 bg-card/80 rounded-md shadow-lg text-sm text-card-foreground">
          {isInitializing && <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Initializing...</div>}
          {!isInitializing && webcamEnabled && isDetecting && <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Detecting Pose...</div>}
          {!isInitializing && webcamEnabled && !isDetecting && poseLandmarks && <div className="text-green-500">Pose Detected!</div>}
          {!isInitializing && webcamEnabled && !isDetecting && !poseLandmarks && <div>Searching for Pose...</div>}
        </div>
      </div>

      <Card className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-md shadow-xl rounded-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-headline">Virtual Dresser</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="model-upload" className="text-sm font-medium">Upload 3D Model (.glb, .gltf)</Label>
            <Button variant="outline" onClick={triggerFileUpload} disabled={isInitializing}>
              <UploadCloud className="mr-2 h-4 w-4" /> Select Model
            </Button>
            <Input
              id="model-upload"
              ref={fileInputRef}
              type="file"
              accept=".glb,.gltf"
              onChange={handleModelUpload}
              className="hidden"
              disabled={isInitializing}
            />
            {uploadedModelName && <p className="text-xs text-muted-foreground text-center">Loaded: {uploadedModelName}</p>}
          </div>
          
          <div className="flex items-center justify-center space-x-2">
            <Button onClick={toggleWebcam} disabled={isInitializing} className="w-1/2">
              {webcamEnabled ? <CameraOff className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
              {webcamEnabled ? 'Disable Webcam' : 'Enable Webcam'}
            </Button>
            <Button 
              onClick={handleManualAdjust} 
              disabled={!webcamEnabled || !uploadedModelUrl || !poseLandmarks || isAdjustingModel || isInitializing} 
              variant="secondary"
              className="w-1/2"
            >
              {isAdjustingModel ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Adjust Fit
            </Button>
          </div>

        </CardContent>
        <CardFooter className="text-xs text-muted-foreground justify-center">
          <p>Position yourself in good lighting for best results.</p>
        </CardFooter>
      </Card>
    </div>
  );
}
