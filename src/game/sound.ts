import type { Rarity } from "./types";

/**
 * Sonidos sintetizados con WebAudio: sin archivos, sin descargas.
 * Se crean bajo demanda tras un gesto del usuario (requisito de los navegadores).
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, gain = 0.08, type: OscillatorType = "sine") {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(ac.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

/** Chasquido corto al voltear la carta. */
export function playFlip() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 520, t, 0.07, 0.05, "triangle");
  tone(ac, 780, t + 0.05, 0.08, 0.04, "triangle");
}

/** Acorde según rareza: más notas y más largo cuanto más rara. */
export function playReveal(rarity: Rarity) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.35; // tras el volteo
  const chords: Record<Rarity, number[]> = {
    comun: [],
    poco_comun: [660],
    rara: [660, 880],
    epica: [587, 740, 880],
    legendaria: [523, 659, 784, 1047, 1319],
  };
  chords[rarity].forEach((f, i) => tone(ac, f, t + i * 0.09, rarity === "legendaria" ? 0.9 : 0.35, 0.07));
}
