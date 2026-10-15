import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RARITY_HEX } from "../../game/rarity";
import type { Rarity } from "../../game/types";
import type { MachineHandle } from "./Machine2D";
import { useGame } from "../../store/gameStore";
import { GEOM, GachaSim } from "./sim";

interface Props {
  dimmed?: boolean;
  idle?: boolean;
  className?: string;
}

const RARITY_COLOR: Record<Rarity, THREE.Color> = {
  comun: new THREE.Color(RARITY_HEX.comun),
  poco_comun: new THREE.Color(RARITY_HEX.poco_comun),
  rara: new THREE.Color(RARITY_HEX.rara),
  epica: new THREE.Color(RARITY_HEX.epica),
  legendaria: new THREE.Color(RARITY_HEX.legendaria),
};

const MAX_PARTICLES = 40;
/** Paleta de la máquina: la misma de la web (grafito y oro). */
const GOLD = "#e2b34a";
const INK_DARK = "#1b1b1f";

/** Textura con un texto centrado sobre un fondo (para placas y rótulos). */
function makeTextTexture(text: string, w: number, h: number, ink: string, bg: string | null, size: number, weight = 800): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d")!;
  if (bg) {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
  }
  g.fillStyle = ink;
  g.font = `${weight} ${size}px "Bricolage Grotesque", "Segoe UI", sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Máquina gashapon en 3D estilizado, a juego con la web: cuerpo de grafito, detalles dorados y vitrina
 * de cristal con las cápsulas del color de cada rareza. Geometría acorde a GEOM de sim.ts.
 * Sombras reales de una sola luz y materiales PBR con un entorno muy tenue. En reposo dibuja a 24 fps
 * (balanceo lento); con la pestaña oculta la simulación sigue por intervalo para que las fases terminen.
 */
export const Machine3D = forwardRef<MachineHandle, Props>(function Machine3D({ dimmed = false, className = "" }, ref) {
  const sim = useMemo(() => new GachaSim(), []);
  const mount = useRef<HTMLDivElement>(null);
  /** Hay que volver a dibujar (cambios fuera del paso de simulación: skip/reset, tamaño). */
  const dirty = useRef(true);
  /** Dibuja un fotograma ahora mismo (para skip/reset, que cambian el estado sin animación). */
  const draw = useRef<() => void>(() => {});
  const dimmedRef = useRef(dimmed);
  dimmedRef.current = dimmed;

  useImperativeHandle(ref, () => ({
    turn: () => sim.turn(),
    drop: (r) => sim.drop(r),
    open: () => sim.open(),
    reset: () => { sim.reset(); draw.current(); },
    skip: (r) => { sim.skip(r); draw.current(); },
    collect: () => { sim.collect(); dirty.current = true; },
  }), [sim]);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    if (import.meta.env.DEV) (window as unknown as { __gachaSim: GachaSim }).__gachaSim = sim;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // Entorno neutro muy tenue: da volumen a los materiales PBR y hace que el oro se lea como oro.
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.35;
    pmrem.dispose();
    const camera = new THREE.PerspectiveCamera(26, 5 / 7, 0.1, 30);
    const camBase = new THREE.Vector3(0.8, 2.35, 8.8);
    const lookAt = new THREE.Vector3(0, 1.68, 0);
    camera.position.copy(camBase);
    camera.lookAt(lookAt);

    // Luces: la principal proyecta sombras (un solo mapa de 1024, tope ajustado a la máquina).
    scene.add(new THREE.HemisphereLight(0xe8e8ee, 0x1a1a1e, 0.5));
    const rimLight = new THREE.DirectionalLight(0xffe2a8, 1.1);
    rimLight.position.set(-2, 5, -6);
    scene.add(rimLight);
    const { min: cm, max: cM } = GEOM.chamber;
    // Luz interior de la vitrina: las bolas se iluminan desde arriba como en un escaparate
    const showcase = new THREE.PointLight(0xfff4dc, 1.5, 2.8, 1.6);
    showcase.position.set(0, cM.y - 0.05, 0);
    scene.add(showcase);
    const key = new THREE.DirectionalLight(0xfff3e0, 2.3);
    key.position.set(4, 7, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -2;
    key.shadow.camera.right = 2;
    key.shadow.camera.top = 4.2;
    key.shadow.camera.bottom = -0.6;
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 20;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.015;
    key.shadow.radius = 3;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xa9c2ff, 0.45);
    fill.position.set(-5, 3, 4);
    scene.add(fill);

    // Materiales: grafito (cuerpo), grafito oscuro (base y placas), oro (detalles), gris metal (mecanismo)
    const graphite = new THREE.MeshStandardMaterial({ color: 0x27272c, roughness: 0.48, metalness: 0.12 });
    const graphiteDark = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.55, metalness: 0.1 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.65, metalness: 0.1 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd9a52a, roughness: 0.34, metalness: 0.82, emissive: 0x2a1d05 });
    const gunmetal = new THREE.MeshStandardMaterial({ color: 0x4a4c52, roughness: 0.45, metalness: 0.7 });
    const glass = new THREE.MeshPhongMaterial({ color: 0xe6efff, specular: 0xffffff, shininess: 180, transparent: true, opacity: 0.1, depthWrite: false });
    const glassEdge = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false });

    const machine = new THREE.Group();
    scene.add(machine);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      machine.add(m);
      return m;
    };
    const W = 1.56; // ancho del cuerpo
    const D = 1.1; // fondo del cuerpo
    const FRONT = D / 2; // z de la cara delantera

    // Pie: zócalo oscuro sobre cuatro patas
    add(new RoundedBoxGeometry(W - 0.08, 0.18, D - 0.08, 2, 0.04), graphiteDark, 0, 0.21, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 16), dark, sx * (W / 2 - 0.18), 0.06, sz * (D / 2 - 0.18));
    // Bandeja delantera donde cae la cápsula: cubeta poco profunda con borde dorado
    const trayZ = 0.9;
    add(new RoundedBoxGeometry(0.8, 0.06, 0.5, 2, 0.02), graphiteDark, 0, GEOM.trayY - 0.03, trayZ);
    add(new RoundedBoxGeometry(0.82, 0.025, 0.035, 1, 0.01), gold, 0, GEOM.trayY + 0.015, trayZ + 0.24);
    add(new RoundedBoxGeometry(0.035, 0.025, 0.5, 1, 0.01), gold, -0.4, GEOM.trayY + 0.015, trayZ);
    add(new RoundedBoxGeometry(0.035, 0.025, 0.5, 1, 0.01), gold, 0.4, GEOM.trayY + 0.015, trayZ);
    add(new THREE.CylinderGeometry(0.04, 0.05, 0.2, 12), dark, -0.32, 0.1, trayZ + 0.16);
    add(new THREE.CylinderGeometry(0.04, 0.05, 0.2, 12), dark, 0.32, 0.1, trayZ + 0.16);
    // Cuerpo de grafito
    add(new RoundedBoxGeometry(W, 1.56, D, 4, 0.09), graphite, 0, 1.08, 0);
    // Banda dorada fina a media altura y marco entre cuerpo y vitrina
    add(new RoundedBoxGeometry(W + 0.02, 0.035, D + 0.02, 1, 0.012), gold, 0, 0.5, 0);
    add(new RoundedBoxGeometry(W + 0.05, 0.09, D + 0.05, 2, 0.03), graphiteDark, 0, cm.y - 0.05, 0);
    add(new RoundedBoxGeometry(W + 0.06, 0.02, D + 0.06, 1, 0.008), gold, 0, cm.y - 0.1, 0);
    // Vitrina de cristal
    const chamberH = cM.y - cm.y;
    const chamberY = (cm.y + cM.y) / 2;
    const chamber = new THREE.Mesh(new RoundedBoxGeometry(W - 0.1, chamberH - 0.02, D - 0.1, 3, 0.07), glass);
    chamber.position.set(0, chamberY + 0.01, 0);
    chamber.renderOrder = 10;
    machine.add(chamber);
    const chamberEdge = new THREE.Mesh(new RoundedBoxGeometry(W - 0.08, chamberH + 0.02, D - 0.08, 3, 0.08), glassEdge);
    chamberEdge.position.copy(chamber.position);
    chamberEdge.renderOrder = 9;
    machine.add(chamberEdge);
    // Suelo oscuro de la vitrina y postes dorados en las esquinas
    add(new THREE.BoxGeometry(W - 0.16, 0.04, D - 0.16), dark, 0, cm.y + 0.03, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.BoxGeometry(0.04, chamberH, 0.04), gold, sx * (W / 2 - 0.05), chamberY, sz * (D / 2 - 0.05));
    // Tapa superior con rótulo dorado y remate
    add(new RoundedBoxGeometry(W + 0.05, 0.3, D + 0.05, 3, 0.08), graphite, 0, cM.y + 0.15, 0);
    add(new RoundedBoxGeometry(W + 0.06, 0.02, D + 0.06, 1, 0.008), gold, 0, cM.y + 0.005, 0);
    add(new RoundedBoxGeometry(W - 0.44, 0.17, 0.05, 2, 0.025), graphiteDark, 0, cM.y + 0.16, FRONT + 0.02); // placa del rótulo
    const labelTex = makeTextTexture("CAPITALDEX", 512, 64, GOLD, null, 44, 700);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.5, (W - 0.5) / 8), new THREE.MeshBasicMaterial({ map: labelTex, transparent: true }));
    label.position.set(0, cM.y + 0.16, FRONT + 0.05);
    machine.add(label);
    add(new THREE.CylinderGeometry(0.16, 0.2, 0.08, 24), gold, 0, cM.y + 0.34, 0);
    add(new THREE.SphereGeometry(0.07, 16, 12), gold, 0, cM.y + 0.42, 0);

    // Placa frontal del mecanismo (gris metal) con el mando y la boca
    const plateY = 1.08;
    add(new RoundedBoxGeometry(0.8, 1.22, 0.05, 2, 0.03), gunmetal, 0, plateY, FRONT + 0.01);
    add(new RoundedBoxGeometry(0.84, 1.26, 0.02, 2, 0.03), gold, 0, plateY, FRONT - 0.004); // filo dorado
    // Etiqueta de precio
    const tagTex = makeTextTexture("1 CARTERA", 320, 72, GOLD, INK_DARK, 34);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.09), new THREE.MeshBasicMaterial({ map: tagTex }));
    tag.position.set(0.55, 0.76, FRONT + 0.012);
    machine.add(tag);
    // Cartel dentro de la vitrina (al fondo): logo y los cinco colores
    const posterTex = (() => {
      const cv = document.createElement("canvas");
      cv.width = 512;
      cv.height = 512;
      const g = cv.getContext("2d")!;
      g.fillStyle = INK_DARK;
      g.fillRect(0, 0, 512, 512);
      g.fillStyle = "#d9a52a";
      g.fillRect(0, 0, 512, 92);
      g.fillStyle = INK_DARK;
      g.font = '800 54px "Bricolage Grotesque", "Segoe UI", sans-serif';
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("CAPITALDEX", 256, 48);
      g.fillStyle = "#f2f2f2";
      g.font = '700 40px "Bricolage Grotesque", "Segoe UI", sans-serif';
      g.fillText("EMPRESAS REALES", 256, 160);
      g.font = '500 28px "Bricolage Grotesque", "Segoe UI", sans-serif';
      g.fillStyle = "#9a9a9e";
      g.fillText("1 117 cotizadas · 5 rarezas", 256, 215);
      const colors = [RARITY_HEX.comun, RARITY_HEX.poco_comun, RARITY_HEX.rara, RARITY_HEX.epica, RARITY_HEX.legendaria];
      colors.forEach((c, i) => {
        g.fillStyle = c;
        g.beginPath();
        g.arc(96 + i * 80, 320, 30, 0, Math.PI * 2);
        g.fill();
      });
      g.fillStyle = GOLD;
      g.font = '800 44px "Bricolage Grotesque", "Segoe UI", sans-serif';
      g.fillText("¡GIRA Y COLECCIONA!", 256, 430);
      return new THREE.CanvasTexture(cv);
    })();
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: posterTex }));
    poster.position.set(0, chamberY + 0.06, cm.z - 0.06);
    machine.add(poster);
    // Ranura de monedas (dorada) y cerradura
    add(new RoundedBoxGeometry(0.28, 0.13, 0.035, 2, 0.015), gold, -0.5, 1.64, FRONT + 0.012);
    add(new THREE.BoxGeometry(0.1, 0.025, 0.03), dark, -0.5, 1.64, FRONT + 0.035);
    const lock = add(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 20), gold, 0.5, 1.64, FRONT + 0.025);
    lock.rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(0.018, 0.08, 0.03), dark, 0.5, 1.64, FRONT + 0.05);

    // Mando: plato con flechas doradas, anillo dorado, disco oscuro y asa dorada; gira sobre z
    const knobY = 1.38;
    const knobZ = FRONT + 0.05;
    const arrowsTex = (() => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 256;
      const g = cv.getContext("2d")!;
      g.fillStyle = "#1e1e22";
      g.beginPath();
      g.arc(128, 128, 124, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = GOLD;
      g.lineWidth = 7;
      g.lineCap = "round";
      for (let k = 0; k < 3; k++) {
        const a0 = (k / 3) * Math.PI * 2 + 0.25;
        g.beginPath();
        g.arc(128, 128, 104, a0, a0 + 1.45);
        g.stroke();
        const ax = 128 + Math.cos(a0 + 1.45) * 104;
        const ay = 128 + Math.sin(a0 + 1.45) * 104;
        g.beginPath();
        g.moveTo(ax + Math.cos(a0 + 1.45 + 2.6) * 16, ay + Math.sin(a0 + 1.45 + 2.6) * 16);
        g.lineTo(ax, ay);
        g.lineTo(ax + Math.cos(a0 + 1.45 - 2.6 + Math.PI) * 16, ay + Math.sin(a0 + 1.45 - 2.6 + Math.PI) * 16);
        g.stroke();
      }
      return new THREE.CanvasTexture(cv);
    })();
    const arrows = new THREE.Mesh(new THREE.CircleGeometry(0.4, 40), new THREE.MeshBasicMaterial({ map: arrowsTex, transparent: true }));
    arrows.position.set(0, knobY, FRONT + 0.04);
    machine.add(arrows);
    add(new THREE.TorusGeometry(0.32, 0.035, 10, 48), gold, 0, knobY, knobZ);
    const knob = new THREE.Group();
    knob.position.set(0, knobY, knobZ);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.08, 40), graphiteDark);
    disc.rotation.x = Math.PI / 2;
    disc.castShadow = true;
    knob.add(disc);
    const handle = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.11, 0.08, 2, 0.035), gold);
    handle.position.z = 0.075;
    handle.castShadow = true;
    knob.add(handle);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 12), dark);
    pin.rotation.x = Math.PI / 2;
    pin.position.z = 0.125;
    knob.add(pin);
    machine.add(knob);

    // Boca de salida: hueco oscuro con arco, bajo el mando, con labio dorado
    const mouthY = 0.72;
    add(new THREE.BoxGeometry(0.52, 0.42, 0.52), dark, 0, mouthY - 0.08, FRONT - 0.16);
    const arch = add(new THREE.CylinderGeometry(0.26, 0.26, 0.54, 24, 1, false, 0, Math.PI), dark, 0, mouthY + 0.13, FRONT - 0.16);
    arch.rotation.x = Math.PI / 2;
    arch.rotation.z = Math.PI / 2;
    add(new THREE.BoxGeometry(0.56, 0.03, 0.07), gold, 0, mouthY - 0.31, FRONT + 0.07); // labio

    // Podio de exposición: disco casi negro con sombra de contacto pintada y aro dorado discreto
    const shadowTex = (() => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 256;
      const g = cv.getContext("2d")!;
      const grad = g.createRadialGradient(128, 118, 20, 128, 128, 128);
      grad.addColorStop(0, "#0d0d0f");
      grad.addColorStop(0.55, "#131315");
      grad.addColorStop(1, "#1b1b1d");
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(cv);
    })();
    const podiumSide = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.7, metalness: 0.1 });
    const podiumTop = new THREE.MeshStandardMaterial({ map: shadowTex, roughness: 0.6, metalness: 0.15 });
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.12, 64), [podiumSide, podiumTop, podiumSide]);
    podium.position.set(0, -0.06, 0.2);
    podium.receiveShadow = true;
    scene.add(podium);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.39, 0.014, 10, 96), new THREE.MeshStandardMaterial({ color: 0x9a7424, roughness: 0.4, metalness: 0.75, emissive: 0x1a1204 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.004, 0.2);
    scene.add(ring);

    // Cápsulas de la vitrina: una malla instanciada, un color por cápsula
    const r = GEOM.capR;
    const capMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0 });
    const caps = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 20, 14), capMat, sim.caps.length);
    caps.castShadow = true;
    caps.receiveShadow = true;
    caps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    sim.caps.forEach((cp, i) => caps.setColorAt(i, RARITY_COLOR[cp.rarity]));
    machine.add(caps);

    // Cápsula que cae: del color de la rareza, la tapa se abre, luz propia
    const drop = new THREE.Group();
    drop.visible = false;
    const dropMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0, emissive: 0x000000 });
    const dR = GEOM.dropR;
    const lower = new THREE.Mesh(new THREE.SphereGeometry(dR, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), dropMat);
    const lowerCap = new THREE.Mesh(new THREE.CircleGeometry(dR, 28), dropMat);
    lowerCap.rotation.x = -Math.PI / 2;
    const upper = new THREE.Mesh(new THREE.SphereGeometry(dR, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), dropMat);
    const upperCap = new THREE.Mesh(new THREE.CircleGeometry(dR, 28), dropMat);
    upperCap.rotation.x = Math.PI / 2;
    upper.add(upperCap);
    drop.add(lower, lowerCap, upper);
    for (const m of [lower, lowerCap, upper, upperCap]) { m.castShadow = true; m.receiveShadow = true; }
    const dropLight = new THREE.PointLight(0xffffff, 0, 3, 2);
    dropLight.position.y = 0.2;
    drop.add(dropLight);
    machine.add(drop);

    // Partículas
    const parts = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_PARTICLES);
    parts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    parts.count = 0;
    machine.add(parts);

    // Vista: arrastrar gira la máquina (vuelve sola al frente) y sacude las cápsulas.
    const view = { yaw: 0, pitch: 0, yawT: 0, pitchT: 0, dragging: false, dragged: false, x: 0, y: 0, t: 0 };
    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
    const canvas = renderer.domElement;
    canvas.style.touchAction = "pan-y";
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      view.dragging = true;
      view.dragged = false;
      view.x = e.clientX;
      view.y = e.clientY;
      view.t = performance.now();
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!view.dragging) return;
      const dx = e.clientX - view.x;
      const dy = e.clientY - view.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) view.dragged = true;
      view.yawT = clamp(view.yawT + dx * 0.008, -0.8, 0.8);
      view.pitchT = clamp(view.pitchT + dy * 0.004, -0.25, 0.3);
      const now = performance.now();
      const dt = Math.max(8, now - view.t) / 1000;
      const vx = dx / dt; // px/s
      // Inclinar la máquina: las bolas resbalan hacia el lado contrario; un tirón fuerte las levanta un poco.
      if (Math.abs(vx) > 60) sim.shake(clamp(-vx * 0.012, -7, 7), Math.min(1.5, Math.max(0, Math.abs(vx) - 400) * 0.004), 0);
      if (Math.abs(vx) > 450) useGame.getState().noteShake();
      view.x = e.clientX;
      view.y = e.clientY;
      view.t = now;
      canvas.style.cursor = "grabbing";
    };
    const onUp = () => {
      view.dragging = false;
      view.yawT = 0;
      view.pitchT = 0;
      canvas.style.cursor = "";
    };
    // Un arrastre no debe contar como clic en la máquina (abrir cartera / saltar animación).
    const onClick = (e: MouseEvent) => {
      if (view.dragged) {
        e.stopPropagation();
        view.dragged = false;
      }
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("click", onClick);

    const tmp = new THREE.Object3D();
    const tmpColor = new THREE.Color();
    const whiteC = new THREE.Color(0xffffff);

    const sync = () => {
      for (let i = 0; i < sim.caps.length; i++) {
        const cp = sim.caps[i];
        tmp.position.set(cp.p.x, cp.p.y, cp.p.z);
        tmp.rotation.set(cp.rot.x, cp.rot.y, cp.rot.z);
        tmp.scale.setScalar(1);
        tmp.updateMatrix();
        caps.setMatrixAt(i, tmp.matrix);
      }
      caps.instanceMatrix.needsUpdate = true;
      knob.rotation.z = -sim.crank.angle;

      const d = sim.capsule;
      drop.visible = d.active;
      if (d.active) {
        drop.position.set(d.p.x, d.p.y, d.p.z);
        drop.scale.set(d.scale.x, d.scale.y, d.scale.z);
        const col = RARITY_COLOR[d.rarity];
        dropMat.color.copy(col);
        dropMat.emissive.copy(col).multiplyScalar(0.2 + d.glow * 0.9);
        dropLight.color.copy(col);
        dropLight.intensity = 0.6 + d.glow * 6;
        upper.position.y = d.lid * 0.36;
        upper.position.z = d.lid * 0.09;
        upper.rotation.x = -d.lid * 1.1;
      }
      const n = Math.min(MAX_PARTICLES, sim.particles.length);
      for (let i = 0; i < n; i++) {
        const pt = sim.particles[i];
        tmp.position.set(pt.p.x, pt.p.y, pt.p.z);
        tmp.rotation.set(0, 0, 0);
        tmp.scale.setScalar(pt.size * (0.5 + pt.life));
        tmp.updateMatrix();
        parts.setMatrixAt(i, tmp.matrix);
      }
      parts.count = n;
      if (n) {
        parts.instanceMatrix.needsUpdate = true;
        (parts.material as THREE.MeshBasicMaterial).color.copy(tmpColor.copy(RARITY_COLOR[d.rarity]).lerp(whiteC, 0.4));
      }
    };

    draw.current = () => {
      sync();
      renderer.render(scene, camera);
      dirty.current = false;
    };

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      dirty.current = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let last = performance.now();
    let lastFrame = 0;
    let lastDraw = 0;
    let raf = 0;
    let disposed = false;

    const frame = (now: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      lastFrame = now;
      sim.step(dt);
      // Giro de la vista con muelle de vuelta al frente
      const k = Math.min(1, dt * (view.dragging ? 14 : 5));
      view.yaw += (view.yawT - view.yaw) * k;
      view.pitch += (view.pitchT - view.pitch) * k;
      const turning = view.dragging || Math.abs(view.yawT - view.yaw) > 0.002 || Math.abs(view.pitchT - view.pitch) > 0.002;
      // Balanceo de exposición muy lento (±5°) cuando no se arrastra ni hay carta encima; a 24 fps.
      const idleSway = !view.dragging && !dimmedRef.current;
      const swayYaw = idleSway ? Math.sin(now / 1000 * 0.35) * 0.09 : 0;
      const live = sim.busy() || turning;
      if (!live && !dirty.current && !(idleSway && now - lastDraw >= 1000 / 24)) return;
      lastDraw = now;
      dirty.current = live;
      machine.rotation.set(view.pitch, view.yaw + swayYaw, 0);
      sync();
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    const ticker = window.setInterval(() => {
      const now = performance.now();
      if (now - lastFrame > 120) {
        sim.step(Math.min(0.05, (now - last) / 1000));
        last = now;
      }
    }, 50);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearInterval(ticker);
      ro.disconnect();
      renderer.dispose();
      draw.current = () => {};
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("click", onClick);
      labelTex.dispose();
      tagTex.dispose();
      posterTex.dispose();
      arrowsTex.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      shadowTex.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [sim]);

  return <div ref={mount} className={`machine3d ${dimmed ? "machine-dimmed" : ""} ${className}`} aria-hidden="true" />;
});
