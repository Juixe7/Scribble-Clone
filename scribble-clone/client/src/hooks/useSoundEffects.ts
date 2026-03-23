import { useCallback, useRef, useState, useEffect } from 'react';

type SoundName =
  | 'correctGuess'
  | 'closeGuess'
  | 'yourTurn'
  | 'timerTick'
  | 'timerExpired'
  | 'turnEnd'
  | 'gameEnd'
  | 'playerJoined'
  | 'playerLeft'
  | 'voteKick'
  | 'roundStart'
  | 'wordSelected';

export default function useSoundEffects() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(() => localStorage.getItem('skribbl-muted') === 'true');

  useEffect(() => {
    localStorage.setItem('skribbl-muted', String(muted));
  }, [muted]);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  // Helper: play a sequence of tones
  const playTones = useCallback((
    frequencies: number[],
    durations: number[],
    type: OscillatorType = 'sine',
    volume = 0.15
  ) => {
    const ctx = getCtx();
    let startTime = ctx.currentTime;
    for (let i = 0; i < frequencies.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = frequencies[i]!;
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + durations[i]!);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + durations[i]!);
      startTime += durations[i]! * 0.85; // slight overlap
    }
  }, [getCtx]);

  // Helper: white noise burst
  const playNoiseBurst = useCallback((duration = 0.12, volume = 0.08) => {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // fade out
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }, [getCtx]);

  const playSound = useCallback((name: SoundName) => {
    if (muted) return;
    try {
      switch (name) {
        case 'correctGuess':
          // Rising chime C5 → E5
          playTones([523, 659], [0.15, 0.2], 'sine', 0.12);
          break;
        case 'closeGuess':
          // Quick low wobble
          playTones([220, 200], [0.08, 0.08], 'triangle', 0.1);
          break;
        case 'yourTurn':
          // 3-note fanfare C4→E4→G4
          playTones([262, 330, 392], [0.15, 0.15, 0.25], 'sine', 0.15);
          break;
        case 'timerTick':
          // Short click
          playTones([800], [0.03], 'square', 0.04);
          break;
        case 'timerExpired':
          // Descending G4→C4
          playTones([392, 262], [0.2, 0.3], 'sine', 0.12);
          break;
        case 'turnEnd':
          // Whoosh noise burst
          playNoiseBurst(0.15, 0.08);
          break;
        case 'gameEnd':
          // Victory jingle: C5→E5→G5→C6
          playTones([523, 659, 784, 1047], [0.12, 0.12, 0.12, 0.35], 'sine', 0.15);
          break;
        case 'playerJoined':
          // Soft chime
          playTones([660], [0.15], 'sine', 0.06);
          break;
        case 'playerLeft':
          // Low thud
          playTones([150], [0.12], 'sine', 0.08);
          break;
        case 'voteKick':
          // Alert ping
          playTones([880, 660], [0.08, 0.1], 'triangle', 0.1);
          break;
        case 'roundStart':
          // Ascending 2 notes
          playTones([440, 550], [0.12, 0.18], 'sine', 0.1);
          break;
        case 'wordSelected':
          // Quick pop
          playTones([500, 600], [0.06, 0.1], 'sine', 0.08);
          break;
      }
    } catch (_) {
      // AudioContext may not be available in some environments
    }
  }, [muted, playTones, playNoiseBurst]);

  return { playSound, muted, setMuted };
}
