import React, { useMemo, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Rope } from './Rope';
import { useGameStore } from './store';

// --- KEYFRAME LOGIC ---
const CROSS_H = 0.94;
const BASE_Y = 0.08;
const SETTLE_Y = 0.46;
const ZR = [-3.5, -2.4, -1.2, 0, 1.2, 2.4, 3.5];
const STRAND_OFF = 0.22;
const B_PEAK = STRAND_OFF + 0.15;
const R_PEAK = -(STRAND_OFF + 0.15);

function buildPts(zRange: number[], xBase: number, shape: 'flat' | 'arc' | 'settled', xPeak: number) {
  return zRange.map((z) => {
    const nz = z / 3.5;
    const inCtr = Math.abs(nz) < 0.52;
    let y = BASE_Y, x = xBase;

    if (shape === 'arc') {
      const fac = inCtr ? Math.pow(1 - Math.abs(nz) / 0.52, 0.6) : 0;
      y = BASE_Y + (CROSS_H - BASE_Y) * fac;
      x = xBase + (xPeak - xBase) * (inCtr ? Math.pow(1 - Math.abs(nz) / 0.52, 0.8) : 0);
    } else if (shape === 'settled') {
      const fac = inCtr ? Math.pow(1 - Math.abs(nz) / 0.52, 0.7) : 0;
      y = BASE_Y + (SETTLE_Y - BASE_Y) * fac;
      x = xBase + (0 - xBase) * (inCtr ? fac : 0);
    }
    return new THREE.Vector3(x, y, z);
  });
}

const BKF = [
  [buildPts(ZR, -STRAND_OFF, 'flat', B_PEAK), buildPts(ZR, -STRAND_OFF, 'arc', B_PEAK)],
  [buildPts(ZR, -STRAND_OFF, 'arc', B_PEAK), buildPts(ZR, -STRAND_OFF, 'settled', 0)],
  [buildPts(ZR, -STRAND_OFF, 'settled', 0), buildPts(ZR, -STRAND_OFF, 'settled', 0)],
  [buildPts(ZR, -STRAND_OFF, 'settled', 0), buildPts(ZR, -STRAND_OFF, 'settled', 0)],
  [buildPts(ZR, -STRAND_OFF, 'settled', 0), buildPts(ZR, -STRAND_OFF, 'arc', B_PEAK)],
  [buildPts(ZR, -STRAND_OFF, 'arc', B_PEAK), buildPts(ZR, -STRAND_OFF, 'settled', 0)],
];

const RKF = [
  [buildPts(ZR, +STRAND_OFF, 'flat', R_PEAK), buildPts(ZR, +STRAND_OFF, 'flat', R_PEAK)],
  [buildPts(ZR, +STRAND_OFF, 'flat', R_PEAK), buildPts(ZR, +STRAND_OFF, 'flat', R_PEAK)],
  [buildPts(ZR, +STRAND_OFF, 'flat', R_PEAK), buildPts(ZR, +STRAND_OFF, 'arc', R_PEAK)],
  [buildPts(ZR, +STRAND_OFF, 'arc', R_PEAK), buildPts(ZR, +STRAND_OFF, 'settled', 0)],
  [buildPts(ZR, +STRAND_OFF, 'settled', 0), buildPts(ZR, +STRAND_OFF, 'settled', 0)],
  [buildPts(ZR, +STRAND_OFF, 'settled', 0), buildPts(ZR, +STRAND_OFF, 'settled', 0)],
];

function Clamps() {
  const CLAMP_Z = 2.92;
  const positions = [
    [-STRAND_OFF, -CLAMP_Z],
    [+STRAND_OFF, -CLAMP_Z],
    [-STRAND_OFF, CLAMP_Z],
    [+STRAND_OFF, CLAMP_Z],
  ];

  return (
    <group>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, 0.084, z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.06, 0.026, 0.07]} />
            <meshStandardMaterial color="#d4a840" metalness={0.88} roughness={0.08} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <torusGeometry args={[0.04, 0.01, 7, 18]} />
            <meshStandardMaterial color="#d4a840" metalness={0.88} roughness={0.08} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Scene() {
  const { currentStep, stepProg, isDragging, activeStrand, setDragState, addDrag, advanceStep, setHoldProgress, staticCam, floorMode, startTimer, timerRun, lightIntensity, leftHanded, setTension, sutureRadius } = useGameStore();
  const { gl, camera } = useThree();
  const holdTimerRef = useRef(0);
  const pulseRef = useRef(0);

  // Handle global drag
  useEffect(() => {
    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = Math.abs(e.clientX - lastX);
      const dy = Math.abs(e.clientY - lastY);
      const dt = Date.now() - lastTime;
      
      let smooth = 80;
      if (dt > 0 && dt < 200) {
        const v = Math.sqrt(dx * dx + dy * dy) / dt;
        // Simplified precision calculation
        smooth = Math.max(0, Math.min(100, 100 - v * 20));
        setTension(Math.min(1, v * 0.5)); // Update tension metric
      } else {
        setTension(0);
      }
      
      addDrag(Math.max(dx, dy) * 0.74, smooth);
      
      lastX = e.clientX;
      lastY = e.clientY;
      lastTime = Date.now();
    };

    const onPointerUp = () => {
      if (isDragging) {
        setDragState(false);
        setTension(0);
        holdTimerRef.current = 0;
        setHoldProgress(0);
      }
    };

    const canvas = gl.domElement;
    
    // We attach the move/up to window so dragging outside canvas works
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // We need to capture the initial position when dragging starts
    const onCanvasPointerDown = (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      lastTime = Date.now();
    };
    canvas.addEventListener('pointerdown', onCanvasPointerDown);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerdown', onCanvasPointerDown);
    };
  }, [isDragging, addDrag, setDragState, setHoldProgress, gl.domElement]);

  useFrame((state, delta) => {
    if (pulseRef.current > 0) {
      pulseRef.current = Math.max(0, pulseRef.current - delta * 2.5);
    }

    if (isDragging && stepProg >= 1) {
      holdTimerRef.current += delta;
      setHoldProgress(Math.min(1, holdTimerRef.current / 5));
      if (holdTimerRef.current >= 5) {
        advanceStep();
        pulseRef.current = 1.5;
        holdTimerRef.current = 0;
        setHoldProgress(0);
        setDragState(false);
      }
    } else {
      if (holdTimerRef.current > 0) {
        holdTimerRef.current = 0;
        setHoldProgress(0);
      }
    }
  });

  // Interpolate points
  const si = Math.min(currentStep - 1, 5);
  const bp = useMemo(() => {
    const bfr = BKF[si][0];
    const bto = BKF[si][1];
    return bfr.map((p, i) => p.clone().lerp(bto[i], stepProg));
  }, [si, stepProg]);

  const rp = useMemo(() => {
    const rfr = RKF[si][0];
    const rto = RKF[si][1];
    return rfr.map((p, i) => p.clone().lerp(rto[i], stepProg));
  }, [si, stepProg]);

  const handlePointerDown = (strand: 'blue' | 'red') => (e: any) => {
    e.stopPropagation();
    const req = [
      'blue', 'both', 'red', 'both', 'blue', 'both'
    ][currentStep - 1];
    
    if (req === 'blue' && strand !== 'blue') {
      useGameStore.getState().setToast('⚠ Grab the BLUE strand!', 'err');
      return;
    }
    if (req === 'red' && strand !== 'red') {
      useGameStore.getState().setToast('⚠ Grab the RED strand!', 'err');
      return;
    }
    
    if (!timerRun && currentStep === 1) startTimer();
    setDragState(true, strand);
    import('./store').then(m => m.playSound('drag'));
  };

  const getEmissive = (strand: 'blue' | 'red') => {
    const req = ['blue', 'both', 'red', 'both', 'blue', 'both'][currentStep - 1];
    if (req === strand || req === 'both') {
      // Pulse effect could be added here via useFrame, but static is fine for now
      return 0.4;
    }
    return 0.0;
  };

  return (
    <>
      <ambientLight intensity={0.72 * lightIntensity} color="#1a2d48" />
      <directionalLight position={[2.6, 6.2, 3.2]} intensity={1.1 * lightIntensity} castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight position={[0, 5.8, 1.2]} intensity={0.82 * lightIntensity} angle={Math.PI / 4.5} penumbra={0.48} />
      
      <pointLight position={[-2.6, 2, 1.6]} intensity={0.38 * lightIntensity} color="#0042cc" />
      <pointLight position={[2.2, 1.8, -1.2]} intensity={0.32 * lightIntensity} color="#cc6644" />

      {/* Table */}
      <mesh position={[0, -0.68, 0]} receiveShadow>
        <boxGeometry args={[8.5, 0.12, 6.5]} />
        <meshStandardMaterial color="#0b1926" roughness={0.74} metalness={0.14} />
      </mesh>

      {/* Floor Grid */}
      {floorMode === 'grid' && (
        <group position={[0, -0.66, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[15, 11]} />
            <meshStandardMaterial color="#070e18" roughness={0.94} />
          </mesh>
          <gridHelper args={[15, 30, '#0e4466', '#071c2e']} position={[0, 0.01, 0]} />
        </group>
      )}
      {floorMode === 'tissue' && (
        <group position={[0, -0.66, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[15, 11, 32, 32]} />
            <meshStandardMaterial color="#5a1818" roughness={0.8} />
          </mesh>
        </group>
      )}

      <group scale={[leftHanded ? -1 : 1, 1, 1]}>
        {/* Posts */}
        <mesh position={[-1.26, 0.09, 0]} castShadow>
          <cylinderGeometry args={[0.158, 0.22, 1.62, 24]} />
          <meshStandardMaterial color="#9e7860" roughness={0.24} metalness={0.54} />
        </mesh>
        <mesh position={[1.26, 0.09, 0]} castShadow>
          <cylinderGeometry args={[0.158, 0.22, 1.62, 24]} />
          <meshStandardMaterial color="#9e7860" roughness={0.24} metalness={0.54} />
        </mesh>

        {/* Vessel */}
        <group position={[0, 0.46, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.072, 0.072, 2.88, 60]} />
            <meshStandardMaterial color="#ee7878" emissive="#440808" emissiveIntensity={0.2} roughness={0.48} />
          </mesh>
          <mesh position={[-1.44, 0, 0]}>
            <sphereGeometry args={[0.075, 12, 8]} />
            <meshStandardMaterial color="#ee7878" emissive="#440808" emissiveIntensity={0.2} roughness={0.48} />
          </mesh>
          <mesh position={[1.44, 0, 0]}>
            <sphereGeometry args={[0.075, 12, 8]} />
            <meshStandardMaterial color="#ee7878" emissive="#440808" emissiveIntensity={0.2} roughness={0.48} />
          </mesh>
        </group>

        {/* Knot Geometry Visualization */}
        {currentStep > 3 && (
          <mesh position={[0, 0.54, 0]} rotation={[Math.PI / 2, 0, 0]} scale={Math.min(1.2, (currentStep - 3 + stepProg) / 2.5)}>
            <torusKnotGeometry args={[0.05, 0.018, 128, 16, 2, 3]} />
            <meshStandardMaterial color="#8a40ff" roughness={0.4} metalness={0.2} transparent opacity={Math.min(0.8, (currentStep - 3 + stepProg) / 3)} />
          </mesh>
        )}

        <Clamps />

        {/* Hand Avatars */}
        {isDragging && activeStrand === 'blue' && (
          <Html position={bp[3].toArray()} center>
            <div className="text-5xl opacity-60 pointer-events-none drop-shadow-lg" style={{ filter: 'hue-rotate(180deg)', transform: 'scaleX(-1)' }}>
              🖐️
            </div>
          </Html>
        )}
        {isDragging && activeStrand === 'red' && (
          <Html position={rp[3].toArray()} center>
            <div className="text-5xl opacity-60 pointer-events-none drop-shadow-lg">
              🖐️
            </div>
          </Html>
        )}

        {/* Ropes */}
        <Rope 
          points={useMemo(() => {
            const reversedBp = [...bp].reverse();
            const connection = [
              new THREE.Vector3(-0.11, 0.08, -3.65),
              new THREE.Vector3(0, 0.08, -3.8),
              new THREE.Vector3(0.11, 0.08, -3.65),
            ];
            return [...reversedBp, ...connection, ...rp];
          }, [bp, rp])} 
          colorLeft="#1a5eff" 
          colorRight="#ff2222" 
          emissiveIntensity={Math.max(getEmissive('blue'), getEmissive('red'))} 
          radius={sutureRadius}
          pulseRef={pulseRef}
        />
        
        {/* Hit Meshes */}
        <Rope points={bp} isHit onPointerDown={handlePointerDown('blue')} radius={sutureRadius * 2.0} />
        <Rope points={rp} isHit onPointerDown={handlePointerDown('red')} radius={sutureRadius * 2.0} />
      </group>

      <OrbitControls 
        makeDefault 
        enabled={!staticCam && !isDragging}
        target={[0, 0.46, 0]}
        enableDamping
        dampingFactor={0.07}
        minDistance={1.8}
        maxDistance={13}
        enablePan={false}
      />
      <Environment preset="studio" />
    </>
  );
}
