import React, { useEffect, useState } from 'react';
import { useGameStore, STEPS, DIFF } from './store';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

const SvgVideoPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const duration = 12;

  useEffect(() => {
    let raf: number;
    let lastTime = performance.now();
    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;
      if (isPlaying) {
        setProgress(p => {
          let next = p + (dt / duration) * 100;
          if (next >= 100) next = 0;
          return next;
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, duration]);

  const currentAnimStep = Math.min(6, Math.max(1, Math.floor((progress / 100) * 6) + 1));

  const paths = {
    1: {
      blue: "M 20 40 C 60 40, 100 20, 140 60 C 160 80, 180 80, 180 80",
      red:  "M 20 80 C 60 80, 100 80, 140 40 C 160 20, 180 20, 180 20"
    },
    2: {
      blue: "M 20 40 C 80 40, 120 100, 100 60 C 80 20, 140 20, 180 80",
      red:  "M 20 80 C 60 80, 100 80, 140 40 C 160 20, 180 20, 180 20"
    },
    3: {
      blue: "M 20 40 C 80 40, 90 60, 100 60 C 110 60, 120 40, 180 40",
      red:  "M 20 80 C 80 80, 90 60, 100 60 C 110 60, 120 80, 180 80"
    },
    4: {
      blue: "M 20 40 C 60 40, 100 40, 140 80 C 160 80, 180 80, 180 80",
      red:  "M 20 80 C 60 80, 100 60, 140 40 C 160 40, 180 40, 180 40"
    },
    5: {
      blue: "M 20 40 C 60 40, 100 40, 140 80 C 160 80, 180 80, 180 80",
      red:  "M 20 80 C 80 80, 120 20, 100 60 C 80 100, 140 100, 180 40"
    },
    6: {
      blue: "M 20 40 C 80 40, 90 50, 100 50 C 110 50, 120 40, 180 40",
      red:  "M 20 80 C 80 80, 90 50, 100 50 C 110 50, 120 80, 180 80"
    }
  };

  return (
    <div className="relative w-full aspect-video bg-[#000] flex flex-col group">
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        <svg viewBox="0 0 200 100" className="w-full h-full drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
          <motion.path
            d={paths[currentAnimStep as keyof typeof paths].red}
            stroke="#ff3333"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            animate={{ d: paths[currentAnimStep as keyof typeof paths].red }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
          <motion.path
            d={paths[currentAnimStep as keyof typeof paths].blue}
            stroke="#1a5eff"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            animate={{ d: paths[currentAnimStep as keyof typeof paths].blue }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
        </svg>
        <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-[9px] text-[#00ff8c] font-['Space_Mono'] border border-[#00ff8c]/30">
          STEP {currentAnimStep} / 6
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={progress}
          onChange={(e) => {
            setProgress(parseFloat(e.target.value));
            setIsPlaying(false);
          }}
          className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[#00e5ff]"
        />
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsPlaying(!isPlaying)} className="text-white hover:text-[#00e5ff] transition-colors">
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button onClick={() => setIsMuted(!isMuted)} className="text-white hover:text-[#00e5ff] transition-colors">
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <span className="text-[9px] text-gray-300 font-mono">
              00:{(progress / 100 * duration).toFixed(0).padStart(2, '0')} / 00:{duration}
            </span>
          </div>
          <div className="text-[9px] text-[#00e5ff] font-bold tracking-wider">
            ABOK #1204
          </div>
        </div>
      </div>
    </div>
  );
};

export function UI() {
  const { 
    currentStep, stepProg, totalScore, xpTotal, comboStreak, 
    sesTime, curDiff, curMode, staticCam, floorMode,
    setDiff, setMode, setCam, setFloor, resetSim,
    showSuccess, toastMsg, precSamples, allPrecSamples, tickTimer,
    lightIntensity, setLight, sutureGauge, setSutureGauge,
    arMode, setARMode, leftHanded, setLeftHanded, undoStep,
    showInfoModal, setInfoModal, tension, isDragging, holdProgress
  } = useGameStore();

  useEffect(() => {
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [tickTimer]);

  const formatTime = (time: number) => {
    const m = String(Math.floor(time / 60)).padStart(2, '0');
    const s = String(time % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const curStepData = STEPS[Math.min(currentStep - 1, 5)];
  const avgPrec = precSamples.length > 0 
    ? Math.round(precSamples.reduce((a, b) => a + b, 0) / precSamples.length) 
    : 0;

  return (
    <div className="absolute inset-0 pointer-events-none font-['Exo_2'] text-[#c6e8f8]">
      
      {/* HUD Panel */}
      <div className="absolute top-4 left-4 w-[clamp(218px,22vw,272px)] bg-[#011022]/95 border border-[#00e5ff]/20 rounded-xl flex flex-col overflow-hidden backdrop-blur-md shadow-[0_8px_44px_rgba(0,0,0,0.82)] pointer-events-auto">
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#0064b9]/20 to-transparent border-b border-[#00e5ff]/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#003e88] to-[#001e46] border border-[#009be1]/30 flex items-center justify-center text-sm">⚕</div>
            <div className="font-['Orbitron'] text-[0.6rem] font-bold tracking-widest uppercase text-[#00e5ff]">SurgicalPro</div>
          </div>
        </div>
        
        <div className="p-3 overflow-y-auto max-h-[calc(100vh-100px)]">
          {/* Step Dots */}
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                i < currentStep ? 'bg-[#00ff8c] shadow-[0_0_9px_rgba(0,255,140,0.5)]' :
                i === currentStep ? 'bg-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.7)] animate-pulse' :
                'bg-white/5'
              }`} />
            ))}
          </div>

          {/* Legend */}
          <div className="flex gap-1.5 mb-3">
            <div className="flex-1 py-1.5 px-1 rounded text-center text-[10px] font-bold leading-tight bg-[#002daa]/30 border border-[#005aff]/30 text-[#8aaeff]">◉ BLUE · LEFT</div>
            <div className="flex-1 py-1.5 px-1 rounded text-center text-[10px] font-bold leading-tight bg-[#820016]/30 border border-[#c80000]/20 text-[#ff8888]">◉ RED · RIGHT</div>
          </div>

          {/* XP Row */}
          <div className="flex justify-between items-center mb-2.5 p-2 bg-[#00ff8c]/5 border border-[#00ff8c]/10 rounded">
            <span className="text-[10px] text-[#00ff8c] font-bold font-['Space_Mono'] tracking-wider">⚡ XP EARNED</span>
            <span className="font-['Orbitron'] text-[10px] text-[#00ff8c] font-bold">{xpTotal}</span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-1 mb-3">
            <div className="p-1.5 bg-[#001630]/60 border border-[#0064b9]/10 rounded">
              <div className="text-[9px] text-[#b4daf0]/50 tracking-wider uppercase">Streak</div>
              <div className="font-['Space_Mono'] text-[10px] text-[#00e5ff] font-bold">×{comboStreak + 1}</div>
            </div>
            <div className="p-1.5 bg-[#001630]/60 border border-[#0064b9]/10 rounded">
              <div className="text-[9px] text-[#b4daf0]/50 tracking-wider uppercase">Score</div>
              <div className="font-['Space_Mono'] text-[10px] text-[#00e5ff] font-bold">{totalScore}</div>
            </div>
          </div>

          {/* Difficulty */}
          <div className="text-[10px] tracking-widest text-[#00e5ff]/40 uppercase mb-1.5 mt-1">Difficulty</div>
          <div className="flex gap-1 mb-2.5">
            {(Object.keys(DIFF) as Array<keyof typeof DIFF>).map(d => (
              <button 
                key={d}
                onClick={() => setDiff(d)}
                className={`flex-1 py-1.5 text-center text-[10px] font-bold rounded border transition-all ${
                  curDiff === d 
                    ? d === 'intern' ? 'bg-[#005028]/60 border-[#00dc6e]/50 text-[#00ff8c] shadow-[0_0_12px_rgba(0,220,110,0.2)]'
                    : d === 'resident' ? 'bg-[#504600]/60 border-[#dcc800]/50 text-[#ffd60a] shadow-[0_0_12px_rgba(220,200,0,0.2)]'
                    : 'bg-[#5a0014]/60 border-[#dc2846]/50 text-[#ff2d55] shadow-[0_0_12px_rgba(220,40,70,0.2)]'
                    : 'bg-white/5 border-white/10 text-white/40'
                }`}
              >
                {DIFF[d].label}
              </button>
            ))}
          </div>

          {/* Camera */}
          <div className="text-[10px] tracking-widest text-[#00e5ff]/40 uppercase mb-1.5 mt-1">Camera</div>
          <div className="flex gap-1 mb-2.5">
            <button onClick={() => setCam(false)} className={`flex-1 py-1.5 text-center text-[10px] font-semibold rounded border ${!staticCam ? 'bg-[#005ca5]/30 border-[#00c3f5]/40 text-[#00e5ff]' : 'bg-[#001630]/80 border-[#005591]/20 text-[#64afd7]/60'}`}>🔄 Free</button>
            <button onClick={() => setCam(true)} className={`flex-1 py-1.5 text-center text-[10px] font-semibold rounded border ${staticCam ? 'bg-[#005ca5]/30 border-[#00c3f5]/40 text-[#00e5ff]' : 'bg-[#001630]/80 border-[#005591]/20 text-[#64afd7]/60'}`}>📌 Lock</button>
          </div>

          {/* Operative Field */}
          <div className="text-[10px] tracking-widest text-[#00e5ff]/40 uppercase mb-1.5 mt-1">Operative Field</div>
          <div className="flex gap-1 mb-2.5">
            {['off', 'grid', 'tissue'].map(m => (
              <button 
                key={m} onClick={() => setFloor(m as any)} 
                className={`flex-1 py-1.5 text-center text-[10px] font-semibold rounded border capitalize ${floorMode === m ? 'bg-[#005ca5]/30 border-[#00c3f5]/40 text-[#00e5ff]' : 'bg-[#001630]/80 border-[#005591]/20 text-[#64afd7]/60'}`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Suture Gauge */}
          <div className="text-[10px] tracking-widest text-[#00e5ff]/40 uppercase mb-1.5 mt-1">Suture Gauge</div>
          <div className="flex gap-1 mb-2.5">
            {['2-0', '3-0', '4-0', '5-0'].map(g => (
              <button 
                key={g} onClick={() => setSutureGauge(g)} 
                className={`flex-1 py-1.5 text-center text-[10px] font-semibold rounded border ${sutureGauge === g ? 'bg-[#005ca5]/30 border-[#00c3f5]/40 text-[#00e5ff]' : 'bg-[#001630]/80 border-[#005591]/20 text-[#64afd7]/60'}`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Light Intensity */}
          <div className="text-[10px] tracking-widest text-[#00e5ff]/40 uppercase mb-1.5 mt-1 flex justify-between">
            <span>Light Intensity</span>
            <span>{Math.round(lightIntensity * 100)}%</span>
          </div>
          <input 
            type="range" min="0.2" max="2.0" step="0.1" 
            value={lightIntensity} onChange={(e) => setLight(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#002040] rounded-lg appearance-none cursor-pointer mb-3"
          />

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-1 mb-2.5">
            <button onClick={() => setARMode(!arMode)} className={`py-1.5 text-center text-[10px] font-semibold rounded border ${arMode ? 'bg-[#005ca5]/30 border-[#00c3f5]/40 text-[#00e5ff]' : 'bg-[#001630]/80 border-[#005591]/20 text-[#64afd7]/60'}`}>
              📷 AR Mode
            </button>
            <button onClick={() => setLeftHanded(!leftHanded)} className={`py-1.5 text-center text-[10px] font-semibold rounded border ${leftHanded ? 'bg-[#005ca5]/30 border-[#00c3f5]/40 text-[#00e5ff]' : 'bg-[#001630]/80 border-[#005591]/20 text-[#64afd7]/60'}`}>
              ✋ Left-Handed
            </button>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-1 mb-2.5">
            <button onClick={undoStep} disabled={currentStep <= 1} className="py-1.5 text-center text-[10px] font-semibold rounded border bg-[#001630]/80 border-[#005591]/20 text-[#64afd7]/60 disabled:opacity-50">
              ↩ Undo Step
            </button>
            <button onClick={() => setInfoModal(true)} className="py-1.5 text-center text-[10px] font-semibold rounded border bg-[#001630]/80 border-[#005591]/20 text-[#64afd7]/60">
              📖 ABOK Ref
            </button>
          </div>

          {/* Tension Indicator */}
          {isDragging && (
            <>
              <div className="text-[10px] tracking-widest text-[#00e5ff]/40 uppercase mb-1.5 mt-1 flex justify-between">
                <span>Rope Tension</span>
                <span className={tension > 0.8 ? 'text-[#ff2d55]' : tension > 0.5 ? 'text-[#ffd60a]' : 'text-[#00ff8c]'}>
                  {Math.round(tension * 100)}%
                </span>
              </div>
              <div className="h-1.5 bg-[#002040]/80 rounded-full mb-3 overflow-hidden border border-[#0069b9]/10">
                <div 
                  className={`h-full rounded-full transition-all duration-75 ${
                    tension > 0.8 ? 'bg-gradient-to-r from-[#dc2846] to-[#ff2d55]' : 
                    tension > 0.5 ? 'bg-gradient-to-r from-[#dcc800] to-[#ffd60a]' : 
                    'bg-gradient-to-r from-[#00b25a] to-[#00ff8c]'
                  }`} 
                  style={{ width: `${tension * 100}%` }} 
                />
              </div>
            </>
          )}

          {/* Progress */}
          <div className="text-[10px] tracking-widest text-[#00e5ff]/40 uppercase mb-1.5 mt-1">Step Progress</div>
          <div className="flex justify-between items-center text-[10px] mb-1 text-[#b4daf0]/50">
            <span>Step {Math.min(currentStep, 6)} of 6</span>
            <span>{Math.round(stepProg * 100)}%</span>
          </div>
          <div className="h-1.5 bg-[#002040]/80 rounded-full mb-3 overflow-hidden border border-[#0069b9]/10">
            <div className="h-full bg-gradient-to-r from-[#005ab2] to-[#00e5ff] rounded-full transition-all duration-100" style={{ width: `${stepProg * 100}%` }} />
          </div>

          {isDragging && stepProg >= 1 && currentStep <= 6 && (
            <>
              <div className="text-[10px] tracking-widest text-[#00ff8c]/40 uppercase mb-1.5 mt-1">Hold to Advance</div>
              <div className="h-1.5 bg-[#002040]/80 rounded-full mb-3 overflow-hidden border border-[#00ff8c]/10">
                <div className="h-full bg-gradient-to-r from-[#00b25a] to-[#00ff8c] rounded-full transition-all duration-100" style={{ width: `${holdProgress * 100}%` }} />
              </div>
            </>
          )}

          <button onClick={resetSim} className="w-full py-2 mt-2 text-center bg-[#00122c]/90 border border-[#b92020]/20 rounded text-[#ff7878]/70 text-[10px] font-semibold hover:border-[#ff3232]/40 hover:text-[#ff2d55] transition-all">
            ⟳ Reset Simulation
          </button>
        </div>
      </div>

      {/* Top Strand Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#010d1e]/90 border border-[#00e5ff]/20 rounded-full px-5 py-1.5 backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide">
          <div className="w-2 h-2 rounded-full bg-[#1a5eff] shadow-[0_0_9px_rgba(26,94,255,0.85)]" />
          <span>LEFT (Blue)</span>
        </div>
        <div className="w-px h-4 bg-[#00e5ff]/20" />
        <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide">
          <span>RIGHT (Red)</span>
          <div className="w-2 h-2 rounded-full bg-[#ff3333] shadow-[0_0_9px_rgba(255,51,51,0.85)]" />
        </div>
        <div className="w-px h-4 bg-[#00e5ff]/20" />
        <div className="font-['Orbitron'] text-[10px] font-bold text-[#ffd60a] px-3 py-0.5 rounded-full bg-[#ffd60a]/10 border border-[#ffd60a]/20">
          {String(totalScore).padStart(5, '0')}
        </div>
      </div>

      {/* Timer */}
      <div className={`absolute top-4 right-4 font-['Orbitron'] text-lg font-bold tracking-widest bg-[#010d1e]/90 border border-[#00e5ff]/20 rounded-lg px-4 py-2 ${
        DIFF[curDiff].limit > 0 && (DIFF[curDiff].limit - sesTime) <= 8 ? 'text-[#ff2d55] animate-pulse' : 
        DIFF[curDiff].limit > 0 && (DIFF[curDiff].limit - sesTime) <= 18 ? 'text-[#ffd60a]' : 'text-[#00e5ff]'
      }`}>
        {formatTime(sesTime)}
      </div>

      {/* Reference Video Panel */}
      <div className="absolute top-20 right-4 w-[clamp(200px,22vw,280px)] bg-[#011022]/95 border border-[#00e5ff]/20 rounded-xl flex flex-col overflow-hidden backdrop-blur-md shadow-[0_8px_44px_rgba(0,0,0,0.82)] pointer-events-auto">
        <div className="p-2 bg-gradient-to-r from-[#0064b9]/20 to-transparent border-b border-[#00e5ff]/10 text-[10px] font-bold text-[#00e5ff] tracking-widest uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00ff8c] animate-pulse" />
          Animation Reference
        </div>
        <SvgVideoPlayer />
        <div className="p-2 text-[10px] text-[#b4daf0]/70 leading-tight border-t border-[#00e5ff]/10 bg-[#001630]/50">
          Observe the 6-step square knot technique. Pay close attention to the alternating throws and hand positioning.
        </div>
      </div>

      {/* Step Panel */}
      {!showSuccess && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[min(91vw,660px)] bg-[#010d1e]/95 border border-[#00e5ff]/20 rounded-xl p-3 px-6 flex flex-col items-center gap-2 backdrop-blur-xl shadow-[0_8px_44px_rgba(0,0,0,0.82),0_0_34px_rgba(0,229,255,0.04)]">
          <div className="flex items-center gap-3 w-full justify-center flex-wrap">
            <div className="bg-gradient-to-br from-[#003070] to-[#005c9e] text-white font-['Orbitron'] text-[10px] font-bold px-3.5 py-1 rounded-full shadow-[0_0_14px_rgba(0,100,220,0.4)]">
              STEP {Math.min(currentStep, 6)} / 6
            </div>
            <div className="text-sm text-[#c3e6f8]/90 text-center" dangerouslySetInnerHTML={{ __html: curStepData.hint }} />
          </div>
          <div className="flex items-center gap-4 w-full mt-1">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[10px] text-[#b4daf0]/50 font-['Space_Mono']">PRECISION</span>
              <div className="flex-1 h-1.5 bg-[#002040]/80 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-150 bg-gradient-to-r from-[#ff2d55] via-[#ffd60a] to-[#00ff8c]" style={{ width: `${avgPrec}%` }} />
              </div>
              <span className="text-[10px] text-[#b4daf0]/50 font-['Space_Mono'] w-8 text-right">{avgPrec}%</span>
            </div>
            <div className="w-px h-4 bg-[#00e5ff]/20" />
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[10px] text-[#b4daf0]/50 font-['Space_Mono']">TENSION</span>
              <div className="flex-1 h-1.5 bg-[#002040]/80 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-150 bg-gradient-to-r from-[#00ff8c] via-[#ffd60a] to-[#ff2d55]" style={{ width: `${Math.min(100, tension * 100)}%` }} />
              </div>
              <span className="text-[10px] text-[#b4daf0]/50 font-['Space_Mono'] w-8 text-right">{Math.round(tension * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ABOK Modal */}
      <AnimatePresence>
        {showInfoModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#01140a]/95 border border-[#00ff8c]/40 rounded-2xl p-6 w-[min(90vw,400px)] backdrop-blur-2xl shadow-[0_0_68px_rgba(0,255,140,0.1),0_8px_44px_rgba(0,0,0,0.82)] pointer-events-auto z-50"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="font-['Orbitron'] text-xl font-black text-[#00ff8c]">ABOK #1204</div>
              <button onClick={() => setInfoModal(false)} className="text-[#00ff8c]/50 hover:text-[#00ff8c]">✕</button>
            </div>
            <div className="text-sm text-[#b4daf0]/80 mb-4 leading-relaxed">
              The <strong>Surgical Square Knot</strong> (Reef Knot) is the standard knot used to tie off blood vessels or suture tissue. 
              It consists of two half-knots tied in opposite directions.
            </div>
            <div className="text-sm text-[#b4daf0]/80 mb-4 leading-relaxed">
              When tied correctly, the strands exit the knot parallel to each other, ensuring the knot lies flat and does not slip under tension.
            </div>
            <div className="bg-[#00160d]/70 border border-[#00ff8c]/10 rounded-lg p-3 text-xs text-[#00ff8c]/70 font-['Space_Mono']">
              "The Surgeon's Knot is a modification of the Square Knot, with an extra twist in the first throw to increase friction."
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-24 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full text-sm font-semibold backdrop-blur-md whitespace-nowrap shadow-lg ${
              toastMsg.type === 'err' ? 'bg-[#910f0f]/95 border border-[#ff2d2d]/40 text-white shadow-[0_0_24px_rgba(255,0,0,0.3)]' :
              toastMsg.type === 'ok' ? 'bg-[#056930]/95 border border-[#19da5c]/40 text-white shadow-[0_0_24px_rgba(0,255,100,0.2)]' :
              'bg-[#003469]/95 border border-[#00cdff]/30 text-white'
            }`}
          >
            {toastMsg.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Screen */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#01140a]/95 border border-[#00ff8c]/40 rounded-2xl p-10 text-center w-[min(90vw,510px)] backdrop-blur-2xl shadow-[0_0_68px_rgba(0,255,140,0.1),0_8px_44px_rgba(0,0,0,0.82)] pointer-events-auto"
          >
            <div className="font-['Orbitron'] text-3xl font-black text-[#00ff8c] drop-shadow-[0_0_36px_rgba(0,255,140,0.5)] mb-2">🏆 Ligation Complete</div>
            <div className="text-sm text-[#b4daf0]/50 mb-6">Three-throw surgical square knot performed.<br/>Vessel securely ligated.</div>
            
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 bg-[#00160d]/70 border border-[#00ff8c]/10 rounded-lg">
                <div className="font-['Orbitron'] text-2xl text-[#ffd60a] font-bold">{totalScore}</div>
                <div className="text-[10px] text-[#b4daf0]/50 mt-1 tracking-wider">Score</div>
              </div>
              <div className="p-3 bg-[#00160d]/70 border border-[#00ff8c]/10 rounded-lg">
                <div className="font-['Orbitron'] text-2xl text-[#ffd60a] font-bold">{formatTime(sesTime)}</div>
                <div className="text-[10px] text-[#b4daf0]/50 mt-1 tracking-wider">Time</div>
              </div>
              <div className="p-3 bg-[#00160d]/70 border border-[#00ff8c]/10 rounded-lg">
                <div className="font-['Orbitron'] text-2xl text-[#ffd60a] font-bold">
                  {allPrecSamples.length > 0 ? Math.round(allPrecSamples.reduce((a, b) => a + b, 0) / allPrecSamples.length) : 82}%
                </div>
                <div className="text-[10px] text-[#b4daf0]/50 mt-1 tracking-wider">Precision</div>
              </div>
            </div>
            
            <div className="font-['Orbitron'] text-lg text-[#ffd60a] font-black tracking-widest p-3 bg-[#ffd60a]/5 border border-[#ffd60a]/20 rounded-lg mb-6 uppercase">
              {totalScore > 2000 ? '⭐⭐⭐ ATTENDING' : totalScore > 1300 ? '⭐⭐ FELLOW' : totalScore > 750 ? '⭐ RESIDENT' : 'INTERN'}
            </div>
            
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={resetSim} className="px-6 py-3 rounded-full font-bold text-sm bg-[#00522a]/60 border border-[#00da5c]/30 text-[#00ff8c] hover:bg-[#006634]/80 transition-all">
                ↺ Practice Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
