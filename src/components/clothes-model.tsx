"use client";

import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import type * as THREE from 'three';

export interface ModelParameters {
  scale: number;
  rotationY: number;
  positionX: number;
  positionY: number;
  positionZ: number;
}

interface ClothesModelProps {
  url: string;
  modelParameters: ModelParameters;
}

export function ClothesModel({ url, modelParameters }: ClothesModelProps) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null!);

  useEffect(() => {
    if (modelRef.current && scene) {
      // Apply a base scale to the scene if models are generally too large/small
      // For example, if your models are designed in meters and your scene is in cm, scale by 100
      const baseScale = 0.05; // Adjust this based on your model's typical scale

      modelRef.current.scale.set(
        modelParameters.scale * baseScale,
        modelParameters.scale * baseScale,
        modelParameters.scale * baseScale
      );
      modelRef.current.rotation.y = modelParameters.rotationY;
      modelRef.current.position.set(
        modelParameters.positionX,
        modelParameters.positionY,
        modelParameters.positionZ
      );
    }
  }, [scene, modelParameters]);

  // Clone the scene to avoid issues with multiple instances or HMR
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);

  return <primitive object={clonedScene} ref={modelRef} dispose={null} />;
}
