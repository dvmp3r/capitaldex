import type { Rarity } from "./types";

/**
 * Sonidos sintetizados con WebAudio: sin archivos, sin descargas.
 * Se crean bajo demanda tras un gesto del usuario (requisito de los navegadores).
 */
let ctx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, gain = 0.08, type: OscillatorType = "sine", freqEnd?: number) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, start + dur);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(ac.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

function noise(ac: AudioContext, start: number, dur: number, gain: number, freq: number) {
  if (!noiseBuffer) {
    noiseBuffer = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ac.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = 1.2;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(ac.destination);
  src.start(start);
  src.stop(start + dur + 0.02);
}

/** Giro de la manivela: dos clics mecánicos. */
export function playKnob() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 190, t, 0.04, 0.06, "square");
  tone(ac, 150, t + 0.16, 0.05, 0.06, "square");
}

/** Cápsulas agitándose dentro de la cúpula. */
export function playRattle() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  for (let i = 0; i < 7; i++) noise(ac, t + 0.05 + i * 0.065, 0.05, 0.05, 1800 + (i % 3) * 600);
}

/** La cápsula cae en la bandeja. */
export function playDrop() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 140, t, 0.16, 0.12, "sine", 55);
  noise(ac, t, 0.06, 0.05, 900);
}

/** La cápsula se abre. */
export function playPop() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 420, t, 0.09, 0.09, "sine", 980);
}

/** Acorde según rareza: más notas y más largo cuanto más rara. */
export function playReveal(rarity: Rarity) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.05;
  const chords: Record<Rarity, number[]> = {
    comun: [],
    poco_comun: [660],
    rara: [660, 880],
    epica: [587, 740, 880],
    legendaria: [523, 659, 784, 1047, 1319],
  };
  chords[rarity].forEach((f, i) => tone(ac, f, t + i * 0.09, rarity === "legendaria" ? 0.9 : 0.35, 0.07));
}
