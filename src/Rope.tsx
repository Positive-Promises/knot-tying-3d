import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  uniform float time;
  
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
    
    vec3 displacedPosition = position + normal * (macroNoise + fiberDisp + thicknessVariation);
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
  uniform float emissiveIntensity;
  
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
    float fiberPattern = sin(twist * fiberDensity);
    float fiberPattern2 = sin(twist * fiberDensity * 0.5 + 1.0);
    
    float microNoise = fbm(vec2(vUv.x * 400.0, vUv.y * 100.0));
    float fuzzyDetail = fbm(vec2(vUv.x * 2000.0, vUv.y * 400.0)) * 0.5;
    
    float ao = smoothstep(-1.0, 1.0, fiberPattern) * 0.6 + 0.4;
    ao *= smoothstep(-1.0, 1.0, fiberPattern2) * 0.8 + 0.2;
    ao *= smoothstep(-1.0, 1.0, microNoise) * 0.5 + 0.5;
    
    vec3 dPositiondx = dFdx(vWorldPosition);
    vec3 dPositiondy = dFdy(vWorldPosition);
    vec3 faceNormal = normalize(cross(dPositiondx, dPositiondy));
    
    float bump = fiberPattern * 0.5 + microNoise * 0.4 + fuzzyDetail * 0.2;
    
    vec3 lightDir = normalize(vec3(5.0, 10.0, 5.0));
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 halfDir = normalize(lightDir + viewDir);
    
    float diff = max(dot(faceNormal, lightDir), 0.0);
    
    vec3 tangent = normalize(vec3(1.0, twistAmount, 0.0));
    float dotTH = dot(tangent, halfDir);
    float sinTH = sqrt(1.0 - dotTH * dotTH);
    float spec = pow(sinTH, 20.0) * 0.3;
    
    vec3 finalColor = baseColor * ao * (diff * 0.8 + 0.2);
    finalColor += vec3(spec);
    finalColor *= 1.0 + microNoise * 0.15;
    
    // Add emissive glow
    finalColor += baseColor * emissiveIntensity;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

interface RopeProps {
  points: THREE.Vector3[];
  colorLeft?: string;
  colorRight?: string;
  radius?: number;
  isHit?: boolean;
  emissiveIntensity?: number;
  pulseRef?: React.MutableRefObject<number>;
  onPointerDown?: (e: any) => void;
}

export function Rope({ 
  points, 
  colorLeft = '#0055ff', 
  colorRight = '#0055ff', 
  radius = 0.046, 
  isHit = false,
  emissiveIntensity = 0,
  pulseRef,
  onPointerDown
}: RopeProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(points);
  }, [points]);

  const uniforms = useMemo(() => ({
    time: { value: 0 },
    colorLeft: { value: new THREE.Color(colorLeft) },
    colorRight: { value: new THREE.Color(colorRight) },
    twistAmount: { value: 40.0 },
    fiberDensity: { value: 120.0 },
    emissiveIntensity: { value: emissiveIntensity }
  }), [colorLeft, colorRight, emissiveIntensity]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      const pulse = pulseRef?.current || 0;
      materialRef.current.uniforms.emissiveIntensity.value = emissiveIntensity + pulse;
    }
  });

  if (isHit) {
    return (
      <mesh onPointerDown={onPointerDown}>
        <tubeGeometry args={[curve, 64, radius * 2.5, 8, false]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
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
