import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { RARITY_HEX } from "../../game/rarity";
import type { Rarity } from "../../game/types";
import type { MachineHandle } from "./Machine2D";
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
const IDLE_FPS = 24;

/**
 * Máquina de cápsulas en 3D estilizado (three.js sin entorno ni refracción: barata de dibujar).
 * La geometría sigue a GEOM de sim.ts: cúpula en (0, 2.95) r 0.95, boca de salida en x 0.55, bandeja en y 0.55.
 * Cuando no hay animación dibuja a 24 fps; con la pestaña oculta la simulación sigue por intervalo
 * para que las promesas de fase se resuelvan igualmente.
 */
export const Machine3D = forwardRef<MachineHandle, Props>(function Machine3D({ dimmed = false, className = "" }, ref) {
  const sim = useMemo(() => new GachaSim(), []);
  const mount = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    turn: () => sim.turn(),
    drop: (r) => sim.drop(r),
    open: () => sim.open(),
    reset: () => sim.reset(),
    skip: (r) => sim.skip(r),
  }), [sim]);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    if (import.meta.env.DEV) (window as unknown as { __gachaSim: GachaSim }).__gachaSim = sim;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(27, 5 / 7, 0.1, 30);
    const camBase = new THREE.Vector3(0, 2.6, 9.6);
    const lookAt = new THREE.Vector3(0, 2.05, 0);
    camera.position.copy(camBase);
    camera.lookAt(lookAt);

    // Luces: cielo/suelo + un foco cálido + relleno frío. Sin sombras.
    scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a2e, 1.1));
    const key = new THREE.DirectionalLight(0xfff1dc, 2.2);
    key.position.set(3, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9fb8ff, 0.6);
    fill.position.set(-4, 2, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.8);
    rim.position.set(0, 4, -6);
    scene.add(rim);

    // Materiales (Phong: barato y con brillo de "juguete")
    const red = new THREE.MeshPhongMaterial({ color: 0xc8302a, specular: 0x7a3a36, shininess: 60 });
    const darkRed = new THREE.MeshPhongMaterial({ color: 0x7a1b17, specular: 0x331010, shininess: 30 });
    const chrome = new THREE.MeshPhongMaterial({ color: 0xcfd3d8, specular: 0xffffff, shininess: 140 });
    const black = new THREE.MeshPhongMaterial({ color: 0x1b1b1f, specular: 0x333333, shininess: 25 });
    const glass = new THREE.MeshPhongMaterial({ color: 0xdfe9ff, specular: 0xffffff, shininess: 160, transparent: true, opacity: 0.16, depthWrite: false });
    const glassRim = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.BackSide, depthWrite: false });

    const machine = new THREE.Group();
    scene.add(machine);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      machine.add(m);
      return m;
    };

    // Pie y cuerpo
    add(new THREE.CylinderGeometry(0.95, 1.05, 0.5, 48), black, 0, 0.25);
    add(new THREE.CylinderGeometry(0.9, 0.95, 0.08, 48), chrome, 0, 0.54);
    add(new THREE.CylinderGeometry(0.82, 0.9, 1.42, 48), red, 0, 1.29);
    add(new THREE.CylinderGeometry(0.9, 0.82, 0.1, 48), darkRed, 0, 2.03);
    add(new THREE.TorusGeometry(0.92, 0.045, 12, 64), chrome, 0, 2.08).rotation.x = Math.PI / 2;

    // Cúpula de cristal y remate
    const { c: dc, r: dr } = GEOM.dome;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(dr, 48, 32), glass);
    dome.position.set(dc.x, dc.y, dc.z);
    dome.renderOrder = 10;
    machine.add(dome);
    const domeRim = new THREE.Mesh(new THREE.SphereGeometry(dr * 1.01, 48, 32), glassRim);
    domeRim.position.copy(dome.position);
    domeRim.renderOrder = 9;
    machine.add(domeRim);
    add(new THREE.CylinderGeometry(0.2, 0.26, 0.12, 24), chrome, 0, dc.y + dr - 0.02);
    add(new THREE.SphereGeometry(0.11, 20, 14), red, 0, dc.y + dr + 0.1);

    // Manivela (gira sobre z; mira al frente)
    const knob = new THREE.Group();
    knob.position.set(-0.3, 1.45, 0.86);
    const knobDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 32), chrome);
    knobDisc.rotation.x = Math.PI / 2;
    knob.add(knobDisc);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.08), black);
    bar.position.z = 0.1;
    knob.add(bar);
    const barCap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 16), chrome);
    barCap.rotation.x = Math.PI / 2;
    barCap.position.set(0, 0, 0.15);
    knob.add(barCap);
    machine.add(knob);
    add(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 32), darkRed, -0.3, 1.45, 0.84).rotation.x = Math.PI / 2;

    // Boca de salida: hueco oscuro, bandeja y ventanita
    // (vitrina estrecha con fondo oscuro, marco cromado y cristal delante; la cápsula cae dentro)
    const mouthX = GEOM.spawn.x;
    const mouthY = (GEOM.trayY + 1.62) / 2;
    const mouthH = 1.62 - GEOM.trayY;
    add(new THREE.BoxGeometry(0.64, mouthH, 0.42), black, mouthX, mouthY, 0.66);
    add(new THREE.BoxGeometry(0.72, 0.07, 0.5), chrome, mouthX, GEOM.trayY - 0.035, 1.04);
    add(new THREE.BoxGeometry(0.72, 0.05, 0.5), chrome, mouthX, 1.62 + 0.025, 1.04);
    add(new THREE.BoxGeometry(0.04, mouthH, 0.44), chrome, mouthX - 0.34, mouthY, 1.06);
    add(new THREE.BoxGeometry(0.04, mouthH, 0.44), chrome, mouthX + 0.34, mouthY, 1.06);
    const windowPane = new THREE.Mesh(new THREE.BoxGeometry(0.64, mouthH, 0.02), glass);
    windowPane.position.set(mouthX, mouthY, 1.28);
    windowPane.renderOrder = 11;
    machine.add(windowPane);

    // Sombra de contacto: círculo degradado dibujado en un lienzo
    const shadowTex = (() => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 128;
      const g = cv.getContext("2d")!;
      const grad = g.createRadialGradient(64, 64, 10, 64, 64, 64);
      grad.addColorStop(0, "rgba(0,0,0,0.55)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(cv);
    })();
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.005;
    scene.add(shadow);

    // Cápsulas de la cúpula: una malla instanciada con color por instancia
    const capGeo = new THREE.SphereGeometry(GEOM.capR, 18, 12);
    const capMat = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0xffffff, shininess: 90 });
    const caps = new THREE.InstancedMesh(capGeo, capMat, sim.caps.length);
    caps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    sim.caps.forEach((cp, i) => caps.setColorAt(i, RARITY_COLOR[cp.rarity]));
    machine.add(caps);

    // Cápsula que cae: dos mitades, luz propia
    const drop = new THREE.Group();
    drop.visible = false;
    const dropMat = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0xffffff, shininess: 100, emissive: 0x000000 });
    const lower = new THREE.Mesh(new THREE.SphereGeometry(GEOM.dropR, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), dropMat);
    const upper = new THREE.Mesh(new THREE.SphereGeometry(GEOM.dropR, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), dropMat);
    const lowerCap = new THREE.Mesh(new THREE.CircleGeometry(GEOM.dropR, 24), dropMat);
    lowerCap.rotation.x = -Math.PI / 2;
    const upperCap = new THREE.Mesh(new THREE.CircleGeometry(GEOM.dropR, 24), dropMat);
    upperCap.rotation.x = Math.PI / 2;
    upper.add(upperCap);
    drop.add(lower, lowerCap, upper);
    const dropLight = new THREE.PointLight(0xffffff, 0, 2.5, 2);
    drop.add(dropLight);
    machine.add(drop);

    // Partículas
    const parts = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_PARTICLES);
    parts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    parts.count = 0;
    machine.add(parts);

    const tmp = new THREE.Object3D();
    const tmpColor = new THREE.Color();

    const sync = () => {
      // bolas de la cúpula
      for (let i = 0; i < sim.caps.length; i++) {
        const cp = sim.caps[i];
        tmp.position.set(cp.p.x, cp.p.y, cp.p.z);
        tmp.rotation.set(cp.rot.x, cp.rot.y, cp.rot.z);
        tmp.scale.setScalar(1);
        tmp.updateMatrix();
        caps.setMatrixAt(i, tmp.matrix);
      }
      caps.instanceMatrix.needsUpdate = true;
      // manivela
      knob.rotation.z = -sim.crank.angle;
      // cápsula de la rareza
      const d = sim.capsule;
      drop.visible = d.active;
      if (d.active) {
        drop.position.set(d.p.x, d.p.y, d.p.z);
        drop.scale.set(d.scale.x, d.scale.y, d.scale.z);
        const col = RARITY_COLOR[d.rarity];
        dropMat.color.copy(col);
        dropMat.emissive.copy(col).multiplyScalar(0.25 + d.glow * 0.9);
        dropLight.color.copy(col);
        dropLight.intensity = 0.8 + d.glow * 5;
        upper.position.y = d.lid * 0.42;
        upper.rotation.x = -d.lid * 0.9;
        upper.position.z = d.lid * 0.12;
      }
      // partículas
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
        (parts.material as THREE.MeshBasicMaterial).color.copy(tmpColor.copy(RARITY_COLOR[d.rarity]).lerp(new THREE.Color(0xffffff), 0.4));
      }
    };

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
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
      // En reposo, 24 fps bastan.
      if (!sim.busy() && now - lastDraw < 1000 / IDLE_FPS) return;
      lastDraw = now;
      const t = now / 1000;
      camera.position.set(camBase.x + Math.sin(t * 0.35) * 0.18, camBase.y + Math.sin(t * 0.5) * 0.05, camBase.z);
      camera.lookAt(lookAt);
      sync();
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    // Con la pestaña oculta no hay rAF: la simulación avanza por intervalo para que las fases terminen.
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
