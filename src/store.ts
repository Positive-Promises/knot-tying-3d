import { create } from 'zustand';

export const playSound = (type: 'drag' | 'snug' | 'success' | 'fail') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'success') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'fail') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'snug') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'drag') {
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 1000;
      noise.connect(noiseFilter);
      noiseFilter.connect(gain);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      noise.start(); noise.stop(ctx.currentTime + 0.05);
      return;
    }
  } catch (e) {}
};

export const DIFF = {
  intern: { req: [72, 58, 72, 58, 72, 52], limit: 0, xpM: 1.0, label: 'Intern' },
  resident: { req: [100, 78, 100, 78, 100, 68], limit: 120, xpM: 1.5, label: 'Resident' },
  consultant: { req: [134, 100, 134, 100, 134, 88], limit: 72, xpM: 2.5, label: 'Consultant' },
};

export const STEPS = [
  { active: 'blue', hint: 'Grab & drag <b class="text-[#8aaeff]">BLUE</b> strand OVER the vessel loop (left-over-right)' },
  { active: 'both', hint: 'Pull <b class="text-[#8aaeff]">both ends</b> outward — snug the first throw firmly against the vessel' },
  { active: 'red', hint: 'Grab <b class="text-[#ff8888]">RED</b> strand OVER vessel in OPPOSITE direction (right-over-left)' },
  { active: 'both', hint: 'Tighten second throw until the knot lies completely flat — square knot secured' },
  { active: 'blue', hint: 'Grab <b class="text-[#8aaeff]">BLUE</b> again — same direction as Step 1 (locking throw)' },
  { active: 'both', hint: 'Equal outward tension both ends — three-throw ligation <b class="text-[#00ff8c]">COMPLETE!</b>' },
];

interface GameState {
  currentStep: number;
  stepProg: number;
  dragAccum: number;
  isDragging: boolean;
  activeStrand: 'blue' | 'red' | null;
  doneMask: boolean[];
  totalScore: number;
  xpTotal: number;
  comboStreak: number;
  errCount: number;
  sesTime: number;
  timerRun: boolean;
  curDiff: keyof typeof DIFF;
  curMode: 'one' | 'two' | 'inst';
  staticCam: boolean;
  floorMode: 'off' | 'grid' | 'tissue';
  showSuccess: boolean;
  toastMsg: { msg: string; type: 'ok' | 'err' | 'info' } | null;
  precSamples: number[];
  allPrecSamples: number[];
  holdProgress: number;
  
  lightIntensity: number;
  sutureRadius: number;
  showInfoModal: boolean;
  tension: number;
  arMode: boolean;
  leftHanded: boolean;
  sutureGauge: string;
  sutureType: string;
  
  // Suture length settings (in mm)
  sutureLength: number;
  foldedLength: number;
  procedurePreset: string;
  
  setDragState: (isDragging: boolean, strand?: 'blue' | 'red' | null) => void;
  addDrag: (amount: number, smooth: number) => void;
  setHoldProgress: (v: number) => void;
  advanceStep: () => void;
  undoStep: () => void;
  resetSim: () => void;
  setDiff: (diff: keyof typeof DIFF) => void;
  setMode: (mode: 'one' | 'two' | 'inst') => void;
  setCam: (staticCam: boolean) => void;
  setFloor: (mode: 'off' | 'grid' | 'tissue') => void;
  tickTimer: () => void;
  startTimer: () => void;
  stopTimer: () => void;
  setToast: (msg: string, type: 'ok' | 'err' | 'info') => void;
  
  setLight: (v: number) => void;
  setSutureRadius: (v: number) => void;
  setInfoModal: (v: boolean) => void;
  setTension: (v: number) => void;
  setARMode: (v: boolean) => void;
  setLeftHanded: (v: boolean) => void;
  setSutureGauge: (v: string) => void;
  setSutureType: (v: string) => void;
  setSutureLength: (v: number) => void;
  setFoldedLength: (v: number) => void;
  setProcedurePreset: (v: string) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentStep: 1,
  stepProg: 0,
  dragAccum: 0,
  isDragging: false,
  activeStrand: null,
  doneMask: Array(6).fill(false),
  totalScore: 0,
  xpTotal: 0,
  comboStreak: 0,
  errCount: 0,
  sesTime: 0,
  timerRun: false,
  curDiff: 'intern',
  curMode: 'two',
  staticCam: false,
  floorMode: 'grid',
  showSuccess: false,
  toastMsg: null,
  precSamples: [],
  allPrecSamples: [],
  holdProgress: 0,
  
  lightIntensity: 1.1,
  sutureRadius: 0.046,
  showInfoModal: false,
  tension: 0,
  arMode: false,
  leftHanded: false,
  sutureGauge: '2-0',
  sutureType: 'Vicryl',
  sutureLength: 900,
  foldedLength: 450,
  procedurePreset: 'Intestinal Anastomosis',

  setDragState: (isDragging, strand = null) => set({ isDragging, activeStrand: strand }),
  
  addDrag: (amount, smooth) => set((state) => {
    const req = DIFF[state.curDiff].req[state.currentStep - 1];
    const newAccum = state.dragAccum + amount;
    const newProg = Math.min(1, newAccum / req);
    
    return {
      dragAccum: newAccum,
      stepProg: newProg,
      precSamples: [...state.precSamples, smooth],
      allPrecSamples: [...state.allPrecSamples, smooth]
    };
  }),

  setHoldProgress: (v) => set({ holdProgress: v }),

  advanceStep: () => set((state) => {
    const newMask = [...state.doneMask];
    newMask[state.currentStep - 1] = true;
    
    const avg = state.precSamples.length > 0 
      ? state.precSamples.reduce((a, b) => a + b, 0) / state.precSamples.length 
      : 80;
    const perfect = avg >= 82;
    
    const m = DIFF[state.curDiff].xpM * (1 + state.comboStreak * 0.18);
    const pts = Math.round((100 + Math.round(avg)) * m);
    
    const newStreak = perfect ? state.comboStreak + 1 : Math.max(0, state.comboStreak - 1);
    
    if (state.currentStep < 6) {
      playSound('snug');
      if (navigator.vibrate) {
        if (perfect) {
          navigator.vibrate([50, 30, 50, 30, 100]); // Special pattern for perfect
        } else {
          navigator.vibrate(100); // Standard snug
        }
      }
      return {
        currentStep: state.currentStep + 1,
        dragAccum: 0,
        stepProg: 0,
        doneMask: newMask,
        totalScore: state.totalScore + pts,
        xpTotal: state.xpTotal + Math.round(pts * 0.28),
        comboStreak: newStreak,
        precSamples: [],
        toastMsg: { msg: `✓ Step ${state.currentStep} — +${pts} pts${perfect ? ' ✨ PERFECT!' : ''}`, type: 'ok' }
      };
    } else {
      playSound('success');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
      return {
        doneMask: newMask,
        totalScore: state.totalScore + pts,
        xpTotal: state.xpTotal + Math.round(pts * 0.28),
        comboStreak: newStreak,
        showSuccess: true,
        timerRun: false,
        toastMsg: { msg: `✓ Step 6 — +${pts} pts${perfect ? ' ✨ PERFECT!' : ''}`, type: 'ok' }
      };
    }
  }),

  undoStep: () => set((state) => {
    if (state.currentStep > 1) {
      const newMask = [...state.doneMask];
      newMask[state.currentStep - 2] = false;
      return {
        currentStep: state.currentStep - 1,
        stepProg: 0,
        dragAccum: 0,
        doneMask: newMask,
        precSamples: [],
        toastMsg: { msg: `↩ Undid Step ${state.currentStep - 1}`, type: 'info' }
      };
    }
    return state;
  }),

  resetSim: () => set({
    currentStep: 1,
    dragAccum: 0,
    stepProg: 0,
    doneMask: Array(6).fill(false),
    totalScore: 0,
    xpTotal: 0,
    comboStreak: 0,
    errCount: 0,
    sesTime: 0,
    timerRun: false,
    showSuccess: false,
    precSamples: [],
    allPrecSamples: [],
    toastMsg: { msg: 'Simulation reset — Train like a surgeon. Save a life.', type: 'info' }
  }),

  setDiff: (diff) => set({ curDiff: diff }),
  setMode: (mode) => set({ curMode: mode }),
  setCam: (staticCam) => set({ staticCam }),
  setFloor: (mode) => set({ floorMode: mode }),
  
  tickTimer: () => set((state) => {
    if (!state.timerRun) return state;
    const newTime = state.sesTime + 1;
    const lim = DIFF[state.curDiff].limit;
    
    if (lim > 0 && newTime >= lim) {
      return {
        sesTime: newTime,
        timerRun: false,
        toastMsg: { msg: '⏰ Time expired — reset!', type: 'err' },
        showSuccess: true
      };
    }
    return { sesTime: newTime };
  }),
  
  startTimer: () => set({ timerRun: true }),
  stopTimer: () => set({ timerRun: false }),
  setToast: (msg, type) => set({ toastMsg: { msg, type } }),
  
  setLight: (v) => set({ lightIntensity: v }),
  setSutureRadius: (v) => set({ sutureRadius: v }),
  setInfoModal: (v) => set({ showInfoModal: v }),
  setTension: (v) => set({ tension: v }),
  setARMode: (v) => set({ arMode: v }),
  setLeftHanded: (v) => set({ leftHanded: v }),
  setSutureType: (v) => set({ sutureType: v }),
  setSutureGauge: (v) => {
    const radiusMap: Record<string, number> = {
      '2-0': 0.046,
      '3-0': 0.035,
      '4-0': 0.025,
      '5-0': 0.015,
      '6-0': 0.010,
      '7-0': 0.007
    };
    set({ sutureGauge: v, sutureRadius: radiusMap[v] || 0.046 });
  },
  
  setSutureLength: (v) => set({ sutureLength: v }),
  setFoldedLength: (v) => set({ foldedLength: v }),
  setProcedurePreset: (v) => {
    let newLen = 900;
    let newFold = 450;
    if (v === 'Vascular Suturing') {
      newLen = 750;
      newFold = 300;
    } else if (v === 'Skin Closure') {
      newLen = 1200;
      newFold = 600;
    } else if (v === 'Intestinal Anastomosis') {
      newLen = 900;
      newFold = 450;
    }
    set({ procedurePreset: v, sutureLength: newLen, foldedLength: newFold });
  }
}));
