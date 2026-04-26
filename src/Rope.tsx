import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  uniform float time;
  uniform float wiggleBlue;
  uniform float wiggleRed;
  uniform float currentTension;
  
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vUv = uv;
    vNormal = normal;
    vPosition = position;
    
    float thicknessVariation = snoise(vec2(uv.x * 15.0, 0.0)) * 0.015 + snoise(vec2(uv.x * 5.0, 0.0)) * 0.03;
    float macroNoise = snoise(vec2(uv.x * 2.0, 0.0)) * 0.05;
    float fiberPattern = sin((uv.x * 40.0 + uv.y) * 60.0);
    float fiberDisp = fiberPattern * 0.005;
    
    // Snakelike wiggle logic
    float envBlue = max(0.0, sin(uv.x * 6.28318)) * wiggleBlue;
    float envRed = max(0.0, sin((uv.x - 0.5) * 6.28318)) * wiggleRed;
    
    // Long, sweeping snakelike curves (lower frequency, slower time)
    float waveBlueX = sin(uv.x * 10.0 - time * 5.0) + sin(uv.x * 20.0 - time * 8.0) * 0.3;
    float waveBlueY = cos(uv.x * 8.0 - time * 4.0) + cos(uv.x * 15.0 - time * 7.0) * 0.3;
    float waveBlueZ = sin(uv.x * 12.0 - time * 6.0) + sin(uv.x * 22.0 - time * 9.0) * 0.3;
    
    float waveRedX = sin(uv.x * 10.0 + time * 5.0) + sin(uv.x * 20.0 + time * 8.0) * 0.3;
    float waveRedY = cos(uv.x * 8.0 + time * 4.0) + cos(uv.x * 15.0 + time * 7.0) * 0.3;
    float waveRedZ = sin(uv.x * 12.0 + time * 6.0) + sin(uv.x * 22.0 + time * 9.0) * 0.3;
    
    vec3 snakeBlue = vec3(waveBlueX, waveBlueY, waveBlueZ) * envBlue * 0.12;
    vec3 snakeRed = vec3(waveRedX, waveRedY, waveRedZ) * envRed * 0.12;
    vec3 snake = snakeBlue + snakeRed;
    
    // Thin the rope when under tension
    float tensionThinning = currentTension * 0.022;
    
    // As tension increases, the snake (wiggle) should straighten out
    float snakeReduction = smoothstep(0.0, 0.5, currentTension);
    vec3 displacedPosition = position + normal * (macroNoise + fiberDisp + thicknessVariation - tensionThinning) + mix(snake, vec3(0.0), snakeReduction);
    vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  
  uniform vec3 colorLeft;
  uniform vec3 colorRight;
  uniform float twistAmount;
  uniform float fiberDensity;
  uniform float emissiveBlue;
  uniform float emissiveRed;
  uniform float isMonofilament;
  uniform float flipMultiplier;
  uniform float currentTension;
  uniform float specularPower;
  uniform float specularIntensity;
  uniform float roughnessFactor;
  
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  float fbm(vec2 x) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < 4; ++i) {
      v += a * snoise(x);
      x = rot * x * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float mixFactor = smoothstep(0.48, 0.52, vUv.x);
    vec3 baseColor = mix(colorLeft, colorRight, mixFactor);
    
    float twist = vUv.x * twistAmount + vUv.y;
    float fiberPattern = mix(sin(twist * fiberDensity), 1.0, isMonofilament);
    float fiberPattern2 = mix(sin(twist * fiberDensity * 0.5 + 1.0), 1.0, isMonofilament);
    
    float microNoise = fbm(vec2(vUv.x * 400.0, vUv.y * 100.0)) * mix(1.0, 0.2, isMonofilament);
    float fuzzyDetail = fbm(vec2(vUv.x * 2000.0, vUv.y * 400.0)) * 0.5 * mix(1.0, 0.1, isMonofilament);
    
    float ao = smoothstep(-1.0, 1.0, fiberPattern) * 0.6 + 0.4;
    ao *= smoothstep(-1.0, 1.0, fiberPattern2) * 0.8 + 0.2;
    ao *= smoothstep(-1.0, 1.0, microNoise) * 0.5 + 0.5;
    
    vec3 dPositiondx = dFdx(vWorldPosition);
    vec3 dPositiondy = dFdy(vWorldPosition);
    vec3 faceNormal = normalize(cross(dPositiondx, dPositiondy)) * flipMultiplier;
    
    float bump = fiberPattern * 0.5 + microNoise * 0.4 + fuzzyDetail * 0.2;
    
    vec3 lightDir = normalize(vec3(5.0, 10.0, 5.0));
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 halfDir = normalize(lightDir + viewDir);
    
    float diff = max(dot(faceNormal, lightDir), 0.0);
    
    vec3 tangent = normalize(vec3(1.0, twistAmount, 0.0));
    float dotTH = dot(tangent, halfDir);
    float sinTH = sqrt(max(0.0, 1.0 - dotTH * dotTH));
    // Use the dynamic tension-based uniforms
    float spec = pow(max(sinTH, 0.00001), specularPower) * specularIntensity;
    
    vec3 finalColor = baseColor * ao * (diff * 0.8 * roughnessFactor + 0.2);
    finalColor += vec3(spec);
    finalColor *= 1.0 + microNoise * 0.15 * roughnessFactor;
    
    if (currentTension > 0.0) {
      vec3 tensionColor = vec3(1.0, 0.05, 0.0); // very bright red
      float tempTensionFactor = smoothstep(0.3, 0.95, currentTension);
      finalColor = mix(finalColor, mix(finalColor, tensionColor, 0.9), tempTensionFactor);
      
      // boost emissive brightness significantly more on high tension
      finalColor += tensionColor * smoothstep(0.5, 1.0, currentTension) * 1.5;
    }
    
    // Add emissive glow targeted to correct side
    float emissiveMultiplier = mix(emissiveBlue, emissiveRed, mixFactor);
    finalColor += baseColor * emissiveMultiplier;
    
    // Proper gamma correction
    finalColor = max(finalColor, vec3(0.0));
    finalColor = pow(finalColor, vec3(1.0 / 2.2));
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

interface RopeProps {
  points: THREE.Vector3[];
  colorLeft?: string;
  colorRight?: string;
  radius?: number;
  isHit?: boolean;
  emissiveBlue?: number;
  emissiveRed?: number;
  pulseRef?: React.MutableRefObject<number>;
  isDragging?: boolean;
  activeStrand?: 'blue' | 'red' | null;
  tension?: number;
  sutureType?: string;
  leftHanded?: boolean;
  isTargetGlow?: 'blue' | 'red' | 'both' | false;
  isHoveredGlow?: 'blue' | 'red' | false;
  onPointerDown?: (e: any) => void;
  onPointerOver?: (e: any) => void;
  onPointerOut?: (e: any) => void;
}

export function Rope({ 
  points, 
  colorLeft = '#0055ff', 
  colorRight = '#0055ff', 
  radius = 0.046, 
  isHit = false,
  emissiveBlue = 0,
  emissiveRed = 0,
  pulseRef,
  isDragging = false,
  activeStrand = null,
  tension = 0,
  sutureType = 'Vicryl',
  leftHanded = false,
  isTargetGlow = false,
  isHoveredGlow = false,
  onPointerDown,
  onPointerOver,
  onPointerOut
}: RopeProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(points);
  }, [points]);

  const uniforms = useMemo(() => {
    const isMonofilament = (sutureType === 'Nylon' || sutureType === 'Prolene') ? 1.0 : 0.0;
    return {
      time: { value: 0 },
      colorLeft: { value: new THREE.Color(colorLeft) },
      colorRight: { value: new THREE.Color(colorRight) },
      twistAmount: { value: 40.0 },
      fiberDensity: { value: 120.0 },
      emissiveBlue: { value: emissiveBlue },
      emissiveRed: { value: emissiveRed },
      wiggleBlue: { value: 0.0 },
      wiggleRed: { value: 0.0 },
      currentTension: { value: 0.0 },
      specularPower: { value: isMonofilament ? 80.0 : 20.0 },
      specularIntensity: { value: isMonofilament ? 0.8 : 0.3 },
      roughnessFactor: { value: 1.0 },
      isMonofilament: { value: isMonofilament },
      flipMultiplier: { value: leftHanded ? -1.0 : 1.0 }
    };
  }, [colorLeft, colorRight, emissiveBlue, emissiveRed, sutureType, leftHanded]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      const pulse = pulseRef?.current || 0;
      
      let extraBlue = 0;
      let extraRed = 0;
      
      if (isTargetGlow === 'blue' || isTargetGlow === 'both') {
        extraBlue = 0.3 + Math.sin(state.clock.elapsedTime * 6.0) * 0.15;
      }
      if (isTargetGlow === 'red' || isTargetGlow === 'both') {
        extraRed = 0.3 + Math.sin(state.clock.elapsedTime * 6.0) * 0.15;
      }
      
      if (isHoveredGlow === 'blue') extraBlue = 1.0;
      if (isHoveredGlow === 'red') extraRed = 1.0;
      
      materialRef.current.uniforms.emissiveBlue.value = Math.max(emissiveBlue, pulse + extraBlue);
      materialRef.current.uniforms.emissiveRed.value = Math.max(emissiveRed, pulse + extraRed);
      
      const targetWiggleBlue = isDragging && activeStrand === 'blue' ? Math.max(0, 1.0 - tension * 1.2) : 0;
      const targetWiggleRed = isDragging && activeStrand === 'red' ? Math.max(0, 1.0 - tension * 1.2) : 0;
      
      materialRef.current.uniforms.wiggleBlue.value = THREE.MathUtils.lerp(materialRef.current.uniforms.wiggleBlue.value, targetWiggleBlue, 0.1);
      materialRef.current.uniforms.wiggleRed.value = THREE.MathUtils.lerp(materialRef.current.uniforms.wiggleRed.value, targetWiggleRed, 0.1);
      const lerpedTension = THREE.MathUtils.lerp(materialRef.current.uniforms.currentTension.value, tension, 0.15);
      materialRef.current.uniforms.currentTension.value = lerpedTension;

      // Tension calculation for uniforms based on real-time tension physics
      const isMonofilament = (sutureType === 'Nylon' || sutureType === 'Prolene');
      const baseSpecPower = isMonofilament ? 80.0 : 20.0;
      const baseSpecIntensity = isMonofilament ? 0.8 : 0.3;
      
      let specIntensityMultiplier = 1.0;
      let roughnessMultiplier = 1.0;
      
      if (lerpedTension > 0.7) {
        // smoothstep between 0.7 and 1.0
        const tensionFactor = THREE.MathUtils.smoothstep(lerpedTension, 0.7, 1.0);
        // increase specular intensity by 15-25% (say 20%)
        specIntensityMultiplier = 1.0 + 0.20 * tensionFactor;
        // decrease surface roughness by 20-30% (say 25% -> roughness 0.75)
        roughnessMultiplier = 1.0 - 0.25 * tensionFactor;
      }
      
      materialRef.current.uniforms.specularPower.value = baseSpecPower / roughnessMultiplier;
      materialRef.current.uniforms.specularIntensity.value = baseSpecIntensity * specIntensityMultiplier;
      materialRef.current.uniforms.roughnessFactor.value = roughnessMultiplier;
    }
  });

  if (isHit) {
    return (
      <mesh 
        onPointerDown={onPointerDown} 
        onPointerOver={onPointerOver} 
        onPointerOut={onPointerOut}
      >
        <tubeGeometry args={[curve, 64, radius * 2.5, 8, false]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    );
  }

  return (
    <mesh castShadow receiveShadow>
      <tubeGeometry args={[curve, 120, radius, 12, false]} />
      <shaderMaterial
        ref={materialRef}
        attach="material"
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
