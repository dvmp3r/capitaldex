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

/** Acorde según rareza: más notas y más largo cuanto más rara. La legendaria es una fanfarria. */
export function playReveal(rarity: Rarity) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.05;
  if (rarity === "legendaria") {
    // fanfarria: tres notas en escalera y acorde final sostenido
    [392, 523, 659].forEach((f, i) => tone(ac, f, t + i * 0.12, 0.22, 0.07, "triangle"));
    [784, 988, 1175, 1568].forEach((f, i) => tone(ac, f, t + 0.4 + i * 0.02, 1.4, 0.06, "sine"));
    noise(ac, t + 0.4, 0.5, 0.03, 6000);
    return;
  }
  const chords: Record<Rarity, number[]> = {
    comun: [523],
    poco_comun: [523, 659],
    rara: [523, 659, 784],
    epica: [587, 740, 880, 1175],
    legendaria: [],
  };
  const dur = rarity === "epica" ? 0.8 : rarity === "rara" ? 0.5 : 0.3;
  chords[rarity].forEach((f, i) => tone(ac, f, t + i * 0.08, dur, 0.07));
}

/** Clic de Operar: tic corto y seco. */
export function playClick() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 1200, t, 0.04, 0.04, "square", 700);
}

/** Comprar un titular: caja registradora (campanilla + cajón). */
export function playBuy() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 1760, t, 0.18, 0.06, "sine");
  tone(ac, 2637, t + 0.03, 0.22, 0.05, "sine");
  noise(ac, t + 0.12, 0.09, 0.06, 1400);
  tone(ac, 220, t + 0.14, 0.12, 0.08, "triangle", 110);
}

/** Noticia aprovechada: tres notas ascendentes rápidas. */
export function playNews() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  [660, 880, 1320].forEach((f, i) => tone(ac, f, t + i * 0.07, 0.16, 0.06, "triangle"));
}

/** Noticia de última hora que aparece: dos golpes de atención. */
export function playAlert() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, 988, t, 0.1, 0.05, "square");
  tone(ac, 988, t + 0.16, 0.1, 0.05, "square");
}

/** Hito de acciones alcanzado: arpegio corto. */
export function playMilestone() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, t + i * 0.06, 0.3, 0.06, "sine"));
}
