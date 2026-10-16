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

/** La marca tal cual aparece en la cabecera: icono de cápsula + "Capital" en blanco + "Dex" en oro. */
function makeWordmarkTexture(bg: string | null): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 96;
  const g = cv.getContext("2d")!;
  if (bg) {
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 96);
  }
  g.font = '800 54px "Bricolage Grotesque", "Segoe UI", sans-serif';
  g.textBaseline = "middle";
  const wCapital = g.measureText("Capital").width;
  const wDex = g.measureText("Dex").width;
  const icon = 56;
  const gap = 14;
  const total = icon + gap + wCapital + wDex;
  let x = (512 - total) / 2;
  const s = icon / 64;
  g.save();
  g.translate(x, (96 - icon) / 2);
  g.scale(s, s);
  g.fillStyle = "#141416";
  g.beginPath();
  g.roundRect(0, 0, 64, 64, 14);
  g.fill();
  g.fillStyle = "#c48a0e";
  g.beginPath();
  g.arc(32, 32, 19, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#f5b921";
  g.beginPath();
  g.arc(32, 32, 19, Math.PI, 0);
  g.fill();
  g.strokeStyle = "#141416";
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(13, 32);
  g.lineTo(51, 32);
  g.stroke();
  g.strokeStyle = "#3ddc84";
  g.lineWidth = 4;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(10, 49);
  g.lineTo(21, 40);
  g.lineTo(28, 45);
  g.lineTo(36, 34);
  g.lineTo(42, 37);
  g.lineTo(54, 19);
  g.stroke();
  g.restore();
  x += icon + gap;
  g.textAlign = "left";
  g.fillStyle = "#f2f2f2";
  g.fillText("Capital", x, 50);
  g.fillStyle = GOLD;
  g.fillText("Dex", x + wCapital, 50);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  return tex;
}

/**
 * Máquina de bolas en 3D estilizado, a juego con la web: silueta clásica (pedestal cónico, cuello,
 * vitrina cilíndrica de cristal y tapa redonda) en grafito con detalles dorados. Las cápsulas llevan
 * el color de cada rareza. Geometría acorde a GEOM de sim.ts (vitrina cilíndrica).
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
    const camBase = new THREE.Vector3(0.8, 2.3, 8.6);
    const lookAt = new THREE.Vector3(0, 1.7, 0);
    camera.position.copy(camBase);
    camera.lookAt(lookAt);

    // Luces: la principal proyecta sombras (un solo mapa de 1024, tope ajustado a la máquina).
    scene.add(new THREE.HemisphereLight(0xe8e8ee, 0x1a1a1e, 0.5));
    const rimLight = new THREE.DirectionalLight(0xffe2a8, 1.1);
    rimLight.position.set(-2, 5, -6);
    scene.add(rimLight);
    const { min: cm, max: cM, radius: R } = GEOM.chamber;
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
    const glassInner = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, side: THREE.BackSide, depthWrite: false });

    const machine = new THREE.Group();
    scene.add(machine);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, parent: THREE.Object3D = machine) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    // Pedestal cónico: radio en función de la altura
    const R_BOT = 0.8;
    const R_TOP = 0.64;
    const Y0 = 0.3;
    const H = 1.5;
    const rAt = (y: number) => R_BOT + (R_TOP - R_BOT) * ((y - Y0) / H);
    /** Soporte tangente al pedestal a la altura y y ángulo phi (0 = frente), `out` por fuera de la superficie. */
    const mountAt = (y: number, phi: number, out: number) => {
      const g = new THREE.Group();
      g.position.set(Math.sin(phi) * (rAt(y) + out), y, Math.cos(phi) * (rAt(y) + out));
      g.rotation.y = phi;
      machine.add(g);
      return g;
    };
    const goldRing = (y: number, radius: number, tube = 0.016, parent: THREE.Object3D = machine) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 72), gold);
      t.rotation.x = Math.PI / 2;
      t.position.y = y;
      t.castShadow = true;
      parent.add(t);
      return t;
    };

    // Base redonda con aro dorado
    add(new THREE.CylinderGeometry(0.86, 0.92, 0.18, 56), graphiteDark, 0, 0.21, 0);
    goldRing(0.305, 0.87);
    // Bandeja delantera donde cae la cápsula: cubeta poco profunda con borde dorado
    const trayZ = 0.9;
    add(new RoundedBoxGeometry(0.8, 0.06, 0.5, 2, 0.02), graphiteDark, 0, GEOM.trayY - 0.03, trayZ);
    add(new RoundedBoxGeometry(0.82, 0.025, 0.035, 1, 0.01), gold, 0, GEOM.trayY + 0.015, trayZ + 0.24);
    add(new RoundedBoxGeometry(0.035, 0.025, 0.5, 1, 0.01), gold, -0.4, GEOM.trayY + 0.015, trayZ);
    add(new RoundedBoxGeometry(0.035, 0.025, 0.5, 1, 0.01), gold, 0.4, GEOM.trayY + 0.015, trayZ);
    add(new THREE.CylinderGeometry(0.04, 0.05, 0.2, 12), dark, -0.32, 0.1, trayZ + 0.16);
    add(new THREE.CylinderGeometry(0.04, 0.05, 0.2, 12), dark, 0.32, 0.1, trayZ + 0.16);
    // Pedestal de grafito (tronco de cono) con banda dorada
    add(new THREE.CylinderGeometry(R_TOP, R_BOT, H, 56), graphite, 0, Y0 + H / 2, 0);
    goldRing(0.52, rAt(0.52) + 0.004);
    // Cuello entre pedestal y vitrina
    add(new THREE.CylinderGeometry(R + 0.04, R_TOP + 0.06, 0.12, 56), graphiteDark, 0, 1.86, 0);
    goldRing(1.92, R + 0.03, 0.018);
    // Vitrina cilíndrica de cristal (exterior e interior) y suelo oscuro
    const chamberH = cM.y - cm.y;
    const chamberY = (cm.y + cM.y) / 2;
    const chamber = new THREE.Mesh(new THREE.CylinderGeometry(R, R, chamberH, 64, 1, true), glass);
    chamber.position.set(0, chamberY, 0);
    chamber.renderOrder = 10;
    machine.add(chamber);
    const chamberIn = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.004, R - 0.004, chamberH, 64, 1, true), glassInner);
    chamberIn.position.copy(chamber.position);
    chamberIn.renderOrder = 9;
    machine.add(chamberIn);
    add(new THREE.CylinderGeometry(R - 0.01, R - 0.01, 0.04, 56), dark, 0, cm.y + 0.02, 0);
    // Tapa redonda con aro, rótulo curvado de la marca y remate dorado
    add(new THREE.CylinderGeometry(R + 0.02, R + 0.06, 0.26, 56), graphite, 0, cM.y + 0.13, 0);
    goldRing(cM.y + 0.005, R + 0.05, 0.018);
    const labelTex = makeWordmarkTexture(INK_DARK);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.075, R + 0.075, 0.17, 32, 1, true, -0.62, 1.24), new THREE.MeshBasicMaterial({ map: labelTex }));
    label.position.y = cM.y + 0.13;
    machine.add(label);
    add(new THREE.CylinderGeometry(0.14, 0.2, 0.08, 24), gold, 0, cM.y + 0.3, 0);
    add(new THREE.SphereGeometry(0.07, 16, 12), gold, 0, cM.y + 0.38, 0);

    // Placa frontal curvada del mecanismo (gris metal con filo dorado)
    const plateY = 1.075;
    const plateH = 1.25;
    const plate = add(new THREE.CylinderGeometry(rAt(plateY + plateH / 2) + 0.012, rAt(plateY - plateH / 2) + 0.012, plateH, 32, 1, true, -0.5, 1.0), gunmetal, 0, plateY, 0);
    plate.castShadow = false;
    const plateTrim = add(new THREE.CylinderGeometry(rAt(plateY + plateH / 2) + 0.008, rAt(plateY - plateH / 2) + 0.008, plateH + 0.04, 32, 1, true, -0.53, 1.06), gold, 0, plateY, 0);
    plateTrim.castShadow = false;
    // Etiqueta de precio (a la derecha de la placa)
    const tagTex = makeTextTexture("1 CARTERA", 320, 72, GOLD, INK_DARK, 34);
    const tagMount = mountAt(0.78, 0.78, 0.006);
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.081), new THREE.MeshBasicMaterial({ map: tagTex }));
    tagMount.add(tag);
    // Cartel curvado dentro de la vitrina (al fondo): logo y los cinco colores
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
      const tex = new THREE.CanvasTexture(cv);
      // Se ve desde dentro de la vitrina: la textura va espejada para que se lea bien.
      tex.wrapS = THREE.RepeatWrapping;
      tex.repeat.x = -1;
      tex.offset.x = 1;
      return tex;
    })();
    const poster = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.03, R - 0.03, 0.8, 32, 1, true, Math.PI - 0.72, 1.44), new THREE.MeshBasicMaterial({ map: posterTex, side: THREE.BackSide }));
    poster.position.y = chamberY + 0.04;
    machine.add(poster);
    // Ranura de monedas (dorada) y cerradura, sobre la placa
    const slot = mountAt(1.62, -0.3, 0.016);
    add(new RoundedBoxGeometry(0.24, 0.12, 0.03, 2, 0.015), gold, 0, 0, 0, slot);
    add(new THREE.BoxGeometry(0.09, 0.022, 0.03), dark, 0, 0, 0.02, slot);
    const lockMount = mountAt(1.62, 0.3, 0.02);
    const lock = add(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 20), gold, 0, 0, 0, lockMount);
    lock.rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(0.016, 0.07, 0.03), dark, 0, 0, 0.025, lockMount);

    // Mando: plato con flechas doradas, anillo dorado, disco oscuro y asa dorada; gira sobre z
    const knobY = 1.36;
    const knobMount = mountAt(knobY, 0, 0.03);
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
    const arrows = new THREE.Mesh(new THREE.CircleGeometry(0.38, 40), new THREE.MeshBasicMaterial({ map: arrowsTex, transparent: true }));
    arrows.position.z = 0.012;
    knobMount.add(arrows);
    const knobRing = add(new THREE.TorusGeometry(0.3, 0.033, 10, 48), gold, 0, 0, 0.03, knobMount);
    knobRing.castShadow = false;
    const knob = new THREE.Group();
    knob.position.z = 0.03;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.265, 0.08, 40), graphiteDark);
    disc.rotation.x = Math.PI / 2;
    disc.castShadow = true;
    knob.add(disc);
    const handle = new THREE.Mesh(new RoundedBoxGeometry(0.47, 0.105, 0.08, 2, 0.035), gold);
    handle.position.z = 0.075;
    handle.castShadow = true;
    knob.add(handle);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.05, 12), dark);
    pin.rotation.x = Math.PI / 2;
    pin.position.z = 0.125;
    knob.add(pin);
    knobMount.add(knob);

    // Boca de salida: hueco oscuro con arco, bajo el mando, con labio dorado
    const mouthY = 0.72;
    const mouthZ = rAt(mouthY);
    add(new THREE.BoxGeometry(0.5, 0.42, 0.5), dark, 0, mouthY - 0.08, mouthZ - 0.15);
    const arch = add(new THREE.CylinderGeometry(0.25, 0.25, 0.52, 24, 1, false, 0, Math.PI), dark, 0, mouthY + 0.13, mouthZ - 0.15);
    arch.rotation.x = Math.PI / 2;
    arch.rotation.z = Math.PI / 2;
    add(new THREE.BoxGeometry(0.54, 0.03, 0.07), gold, 0, mouthY - 0.31, mouthZ + 0.06); // labio

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
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.45, 0.12, 64), [podiumSide, podiumTop, podiumSide]);
    podium.position.set(0, -0.06, 0.2);
    podium.receiveShadow = true;
    scene.add(podium);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.014, 10, 96), new THREE.MeshStandardMaterial({ color: 0x9a7424, roughness: 0.4, metalness: 0.75, emissive: 0x1a1204 }));
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
    // Tecla A (desde App): sacudida fuerte con bamboleo visible y bono de suerte.
    let shakeSide = 1;
    const onShakeKey = () => {
      shakeSide = -shakeSide;
      sim.shake(6.5 * shakeSide, 1.2, 0);
      view.yawT = 0.32 * shakeSide;
      view.pitchT = 0.06;
      window.setTimeout(() => { if (!view.dragging) { view.yawT = 0; view.pitchT = 0; } }, 140);
      useGame.getState().noteShake();
      dirty.current = true;
    };
    window.addEventListener("capitaldex:shake", onShakeKey);
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
      window.removeEventListener("capitaldex:shake", onShakeKey);
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
