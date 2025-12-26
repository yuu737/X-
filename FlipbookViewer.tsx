/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';

interface FlipbookViewerProps {
  frames: string[];
  fps: number;
}

export const FlipbookViewer: React.FC<FlipbookViewerProps> = ({ frames, fps }) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const animate = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        const interval = 1000 / fps;
        
        if (deltaTime > interval) {
          previousTimeRef.current = time - (deltaTime % interval);
          setCurrentFrameIndex(prevIndex => (prevIndex + 1) % frames.length);
        }
      } else {
        previousTimeRef.current = time;
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    if (frames.length > 0) {
      previousTimeRef.current = undefined;
      requestRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [frames, fps]);
  
  if (frames.length === 0) {
    return null;
  }

  return (
    <div className="w-full aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center">
        <img
            src={frames[currentFrameIndex]}
            alt={`Frame ${currentFrameIndex + 1}`}
            className="w-full h-full object-contain"
        />
    </div>
  );
};