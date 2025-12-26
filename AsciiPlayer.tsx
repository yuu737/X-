/// <reference lib="dom" />
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';

interface AsciiPlayerProps {
  frames: string[];
  fps: number;
}

export const AsciiPlayer: React.FC<AsciiPlayerProps> = ({ frames, fps }) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [fontSize, setFontSize] = useState(10);
  
  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

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
      setCurrentFrameIndex(0); // Reset to first frame
      requestRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [frames, fps]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      if (frames.length === 0 || !container) return;
      
      const { width, height } = container.getBoundingClientRect();
      if(width === 0 || height === 0) return;

      const firstFrame = frames[0];
      const lines = firstFrame.split('\n');
      const asciiWidthChars = lines[0]?.length || 1;
      const asciiHeightChars = lines.length || 1;
      
      const charAspectRatio = 0.6; 
      
      const widthBasedFontSize = (width / asciiWidthChars) / charAspectRatio;
      const heightBasedFontSize = height / asciiHeightChars;
      
      const newSize = Math.floor(Math.min(widthBasedFontSize, heightBasedFontSize));
      setFontSize(Math.max(1, newSize));
    });

    observer.observe(container);
    // Initial calculation
    const { width, height } = container.getBoundingClientRect();
    if(width > 0 && height > 0) {
        const firstFrame = frames[0];
        const lines = firstFrame.split('\n');
        const asciiWidthChars = lines[0]?.length || 1;
        const asciiHeightChars = lines.length || 1;
        const charAspectRatio = 0.6;
        const widthBasedFontSize = (width / asciiWidthChars) / charAspectRatio;
        const heightBasedFontSize = height / asciiHeightChars;
        const newSize = Math.floor(Math.min(widthBasedFontSize, heightBasedFontSize));
        setFontSize(Math.max(1, newSize));
    }


    return () => observer.disconnect();
  }, [frames]);
  
  if (frames.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-black rounded-md flex items-center justify-center overflow-hidden p-1">
      <pre
        className="font-mono leading-none text-slate-300"
        style={{ fontSize: `${fontSize}px` }}
        aria-live="polite"
        aria-atomic="true"
      >
        {frames[currentFrameIndex]}
      </pre>
    </div>
  );
};