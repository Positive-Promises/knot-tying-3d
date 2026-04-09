/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './Scene';
import { UI } from './UI';
import { useGameStore } from './store';

export default function App() {
  const arMode = useGameStore(s => s.arMode);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (arMode && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => console.error("AR camera error:", err));
    } else if (!arMode && videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  }, [arMode]);

  return (
    <div className={`w-full h-screen overflow-hidden relative select-none touch-none ${arMode ? 'bg-transparent' : 'bg-[#010a16]'}`}>
      {arMode && (
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover z-0" />
      )}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 3.2, 5.8], fov: 42 }} gl={{ alpha: true }}>
          <Scene />
        </Canvas>
      </div>
      
      {/* Scanlines effect */}
      {!arMode && <div className="absolute inset-0 z-10 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.025) 2px,rgba(0,0,0,.025) 4px)' }} />}
      
      {/* Vignette effect */}
      {!arMode && <div className="absolute inset-0 z-20 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center,transparent 52%,rgba(0,0,0,.6) 100%)' }} />}
      
      <div className="absolute inset-0 z-30 pointer-events-none">
        <UI />
      </div>
    </div>
  );
}
