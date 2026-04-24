import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './src/App';
import * as THREE from 'three';

// Polyfills
Object.defineProperty(global, 'navigator', { value: { mediaDevices: { getUserMedia: async () => ({}) } }, writable: true });
(global as any).window = { AudioContext: class {} };
(global as any).self = global;

try {
  console.log("Starting render test...");
  const html = renderToString(React.createElement(App));
  console.log("Render successful, length:", html.length);
} catch (error) {
  console.error("REACT RENDER ERROR:", error);
}
