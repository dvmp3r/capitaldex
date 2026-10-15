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

/** Textura con un texto centrado sobre un fondo (para placas y rótulos). */
function makeTextTexture(text: string, w: number, h: number, ink: string, bg: string, size: number): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = ink;
  g.font = `800 ${size}px "Bricolage Grotesque", "Segoe UI", sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2 + 2);
  return new THREE.CanvasTexture(cv);
}

/**
 * Máquina gashapon en 3D estilizado (three.js plano, sin entorno ni refracción).
 * Caja roja con vitrina de cristal arriba, placa cromada delante con el mando grande y la boca de
 * salida debajo; las cápsulas son de dos mitades (color de la rareza + transparente).
 * Geometría acorde a GEOM de sim.ts. En reposo dibuja a 24 fps; con la pestaña oculta la
 * simulación sigue por intervalo para que las fases terminen.
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
    renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // Entorno neutro muy suave: da volumen a los materiales PBR sin reflejos marcados (los metales van mates).
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.2;
    pmrem.dispose();
    const camera = new THREE.PerspectiveCamera(26, 5 / 7, 0.1, 30);
    const camBase = new THREE.Vector3(0.9, 2.7, 9.4);
    const lookAt = new THREE.Vector3(0, 1.95, 0);
    camera.position.copy(camBase);
    camera.lookAt(lookAt);

    // Luces: la principal proyecta sombras (un solo mapa de 1024, tope ajustado a la máquina).
    scene.add(new THREE.HemisphereLight(0xe8e8ee, 0x1a1a1e, 0.5));
    const rimLight = new THREE.DirectionalLight(0xffe2a8, 1.0);
    rimLight.position.set(-2, 5, -6);
    scene.add(rimLight);
    // Luz interior de la vitrina: las bolas se iluminan desde arriba como en un escaparate
    const showcase = new THREE.PointLight(0xfff4dc, 1.6, 3.2, 1.6);
    showcase.position.set(0, 3.45, 0);
    scene.add(showcase);
    const key = new THREE.DirectionalLight(0xfff3e0, 2.3);
    key.position.set(4, 7, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -2.4;
    key.shadow.camera.right = 2.4;
    key.shadow.camera.top = 4.8;
    key.shadow.camera.bottom = -0.6;
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 20;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.015;
    key.shadow.radius = 3;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xa9c2ff, 0.5);
    fill.position.set(-5, 3, 4);
    scene.add(fill);

    // Materiales
    const red = new THREE.MeshStandardMaterial({ color: 0xc02f26, roughness: 0.45, metalness: 0.05 });
    const redDark = new THREE.MeshStandardMaterial({ color: 0x9c231c, roughness: 0.55, metalness: 0.05 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xc9cdd3, roughness: 0.42, metalness: 0.8 });
    const steel = new THREE.MeshStandardMaterial({ color: 0xa9afb7, roughness: 0.5, metalness: 0.7 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x17171b, roughness: 0.6, metalness: 0.1 });
    const white = new THREE.MeshStandardMaterial({ color: 0xe9e9e6, roughness: 0.55, metalness: 0 });
    const glass = new THREE.MeshPhongMaterial({ color: 0xe6efff, specular: 0xffffff, shininess: 180, transparent: true, opacity: 0.1, depthWrite: false });
    const glassEdge = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, side: THREE.BackSide, depthWrite: false });

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
    const { min: cm, max: cM } = GEOM.chamber;
    const W = 1.9; // ancho del cuerpo
    const D = 1.28; // fondo del cuerpo
    const FRONT = D / 2; // z de la cara delantera

    // Pie: zócalo oscuro algo más estrecho que el cuerpo, sobre cuatro patas
    add(new RoundedBoxGeometry(W - 0.1, 0.16, D - 0.1, 2, 0.04), dark, 0, 0.16, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.CylinderGeometry(0.07, 0.08, 0.08, 16), dark, sx * (W / 2 - 0.2), 0.04, sz * (D / 2 - 0.2));
    // Bandeja delantera donde cae la cápsula: cubeta poco profunda con borde cromado
    const trayZ = 1.06;
    add(new RoundedBoxGeometry(0.98, 0.06, 0.62, 2, 0.02), dark, 0, GEOM.trayY - 0.03, trayZ);
    add(new RoundedBoxGeometry(1.0, 0.03, 0.04, 1, 0.01), chrome, 0, GEOM.trayY + 0.02, trayZ + 0.3);
    add(new RoundedBoxGeometry(0.04, 0.03, 0.62, 1, 0.01), chrome, -0.49, GEOM.trayY + 0.02, trayZ);
    add(new RoundedBoxGeometry(0.04, 0.03, 0.62, 1, 0.01), chrome, 0.49, GEOM.trayY + 0.02, trayZ);
    add(new THREE.CylinderGeometry(0.05, 0.06, 0.2, 12), dark, -0.4, 0.1, trayZ + 0.2);
    add(new THREE.CylinderGeometry(0.05, 0.06, 0.2, 12), dark, 0.4, 0.1, trayZ + 0.2);
    // Cuerpo rojo inferior
    add(new RoundedBoxGeometry(W, 1.84, D, 4, 0.1), red, 0, 1.16, 0);
    // Banda decorativa clara alrededor del cuerpo, a media altura
    add(new RoundedBoxGeometry(W + 0.02, 0.07, D + 0.02, 1, 0.02), white, 0, 0.62, 0);
    // Marco entre cuerpo y vitrina
    add(new RoundedBoxGeometry(W + 0.06, 0.1, D + 0.06, 2, 0.03), redDark, 0, cm.y - 0.05, 0);
    // Vitrina de cristal
    const chamberH = cM.y - cm.y;
    const chamberY = (cm.y + cM.y) / 2;
    const chamber = new THREE.Mesh(new RoundedBoxGeometry(W - 0.1, chamberH - 0.02, D - 0.1, 3, 0.08), glass);
    chamber.position.set(0, chamberY + 0.01, 0);
    chamber.renderOrder = 10;
    machine.add(chamber);
    const chamberEdge = new THREE.Mesh(new RoundedBoxGeometry(W - 0.08, chamberH + 0.02, D - 0.08, 3, 0.09), glassEdge);
    chamberEdge.position.copy(chamber.position);
    chamberEdge.renderOrder = 9;
    machine.add(chamberEdge);
    // Suelo oscuro de la vitrina y esquinas (para que el cristal se lea como caja)
    add(new THREE.BoxGeometry(W - 0.16, 0.04, D - 0.16), dark, 0, cm.y + 0.03, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.BoxGeometry(0.05, chamberH, 0.05), chrome, sx * (W / 2 - 0.06), chamberY, sz * (D / 2 - 0.06));
    // Tapa superior
    add(new RoundedBoxGeometry(W + 0.06, 0.34, D + 0.06, 3, 0.09), red, 0, cM.y + 0.17, 0);
    add(new RoundedBoxGeometry(W - 0.5, 0.18, 0.06, 2, 0.03), white, 0, cM.y + 0.19, FRONT + 0.02); // rótulo
    const labelTex = (() => {
      const cv = document.createElement("canvas");
      cv.width = 512;
      cv.height = 64;
      const g = cv.getContext("2d")!;
      g.fillStyle = "#1c1c1f";
      g.font = '700 44px "Bricolage Grotesque", "Segoe UI", sans-serif';
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("CAPITALDEX", 256, 34);
      const tex = new THREE.CanvasTexture(cv);
      tex.anisotropy = 4;
      return tex;
    })();
    const label = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.1625), new THREE.MeshBasicMaterial({ map: labelTex, transparent: true }));
    label.position.set(0, cM.y + 0.19, FRONT + 0.056);
    machine.add(label);
    add(new THREE.CylinderGeometry(0.22, 0.26, 0.1, 24), chrome, 0, cM.y + 0.39, 0);

    // Placa cromada delantera con el mando y la boca
    const plateY = 1.22;
    add(new RoundedBoxGeometry(0.98, 1.4, 0.06, 2, 0.03), steel, 0, plateY, FRONT + 0.01);
    // Placa de precio abajo a la derecha y pegatina de "1 cartera"
    const tagTex = makeTextTexture("1 CARTERA", 320, 72, "#1c1c1f", "#f5f5f5", 34);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.1125), new THREE.MeshBasicMaterial({ map: tagTex }));
    tag.position.set(0.6, 0.95, FRONT + 0.012);
    machine.add(tag);
    // Cartel dentro de la vitrina (al fondo): logo y los cinco colores
    const posterTex = (() => {
      const cv = document.createElement("canvas");
      cv.width = 512;
      cv.height = 512;
      const g = cv.getContext("2d")!;
      g.fillStyle = "#f6f6f4";
      g.fillRect(0, 0, 512, 512);
      g.fillStyle = "#d3362c";
      g.fillRect(0, 0, 512, 92);
      g.fillStyle = "#ffffff";
      g.font = '800 54px "Bricolage Grotesque", "Segoe UI", sans-serif';
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("CAPITALDEX", 256, 48);
      g.fillStyle = "#1c1c1f";
      g.font = '700 40px "Bricolage Grotesque", "Segoe UI", sans-serif';
      g.fillText("EMPRESAS REALES", 256, 160);
      g.font = '500 28px "Bricolage Grotesque", "Segoe UI", sans-serif';
      g.fillStyle = "#555";
      g.fillText("1 117 cotizadas · 5 rarezas", 256, 215);
      const colors = [RARITY_HEX.comun, RARITY_HEX.poco_comun, RARITY_HEX.rara, RARITY_HEX.epica, RARITY_HEX.legendaria];
      colors.forEach((c, i) => {
        g.fillStyle = c;
        g.beginPath();
        g.arc(96 + i * 80, 320, 30, 0, Math.PI * 2);
        g.fill();
      });
      g.fillStyle = "#1c1c1f";
      g.font = '800 44px "Bricolage Grotesque", "Segoe UI", sans-serif';
      g.fillText("¡GIRA Y COLECCIONA!", 256, 430);
      return new THREE.CanvasTexture(cv);
    })();
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map: posterTex }));
    poster.position.set(0, chamberY + 0.1, cm.z - 0.08);
    machine.add(poster);
    // Ranura de monedas y cerradura
    add(new RoundedBoxGeometry(0.34, 0.16, 0.04, 2, 0.02), white, -0.62, 1.78, FRONT + 0.015);
    add(new THREE.BoxGeometry(0.12, 0.03, 0.03), dark, -0.62, 1.78, FRONT + 0.04);
    const lock = add(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 20), chrome, 0.62, 1.78, FRONT + 0.03);
    lock.rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(0.02, 0.1, 0.03), dark, 0.62, 1.78, FRONT + 0.06);

    // Mando: anillo, disco y asa; gira sobre z
    const knobY = 1.55;
    const knobZ = FRONT + 0.06;
    const arrowsTex = (() => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 256;
      const g = cv.getContext("2d")!;
      g.fillStyle = "#2a63d4";
      g.beginPath();
      g.arc(128, 128, 124, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#ffffff";
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
    const arrows = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), new THREE.MeshBasicMaterial({ map: arrowsTex, transparent: true }));
    arrows.position.set(0, knobY, FRONT + 0.045);
    machine.add(arrows);
    add(new THREE.TorusGeometry(0.4, 0.045, 10, 48), chrome, 0, knobY, knobZ);
    const knob = new THREE.Group();
    knob.position.set(0, knobY, knobZ);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.35, 0.1, 40), white);
    disc.rotation.x = Math.PI / 2;
    knob.add(disc);
    const handle = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.14, 0.1, 2, 0.04), redDark);
    handle.position.z = 0.09;
    knob.add(handle);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12), dark);
    pin.rotation.x = Math.PI / 2;
    pin.position.z = 0.15;
    knob.add(pin);
    machine.add(knob);

    // Boca de salida: hueco oscuro con arco, bajo el mando
    const mouthY = 0.85;
    add(new THREE.BoxGeometry(0.62, 0.5, 0.56), dark, 0, mouthY - 0.1, FRONT - 0.18);
    const arch = add(new THREE.CylinderGeometry(0.31, 0.31, 0.58, 24, 1, false, 0, Math.PI), dark, 0, mouthY + 0.15, FRONT - 0.18);
    arch.rotation.x = Math.PI / 2;
    arch.rotation.z = Math.PI / 2;
    add(new THREE.BoxGeometry(0.66, 0.04, 0.08), chrome, 0, mouthY - 0.37, FRONT + 0.08); // labio

    // Podio de exposición: disco oscuro con sombra de contacto pintada y aro dorado
    const shadowTex = (() => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 256;
      const g = cv.getContext("2d")!;
      const grad = g.createRadialGradient(128, 118, 20, 128, 128, 128);
      grad.addColorStop(0, "#0e0e10");
      grad.addColorStop(0.55, "#141416");
      grad.addColorStop(1, "#1c1c1e");
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(cv);
    })();
    const podiumSide = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.7, metalness: 0.1 });
    const podiumTop = new THREE.MeshStandardMaterial({ map: shadowTex, roughness: 0.6, metalness: 0.15 });
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.85, 0.14, 64), [podiumSide, podiumTop, podiumSide]);
    podium.position.set(0, -0.07, 0.25);
    podium.receiveShadow = true;
    scene.add(podium);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.74, 0.016, 10, 96), new THREE.MeshStandardMaterial({ color: 0x8a6a20, roughness: 0.45, metalness: 0.7, emissive: 0x1a1204 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.004, 0.25);
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

    // Cápsula que cae: mitad inferior de color, tapa transparente que se abre, luz propia
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
        upper.position.y = d.lid * 0.4;
        upper.position.z = d.lid * 0.1;
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
