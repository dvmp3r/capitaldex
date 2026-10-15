import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
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

  useImperativeHandle(ref, () => ({
    turn: () => sim.turn(),
    drop: (r) => sim.drop(r),
    open: () => sim.open(),
    reset: () => { sim.reset(); draw.current(); },
    skip: (r) => { sim.skip(r); draw.current(); },
  }), [sim]);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    if (import.meta.env.DEV) (window as unknown as { __gachaSim: GachaSim }).__gachaSim = sim;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(26, 5 / 7, 0.1, 30);
    const camBase = new THREE.Vector3(1.0, 3.0, 9.6);
    const lookAt = new THREE.Vector3(0, 2.0, 0);
    camera.position.copy(camBase);
    camera.lookAt(lookAt);

    // Luces suaves, sin sombras: aspecto de ilustración plana.
    scene.add(new THREE.HemisphereLight(0xffffff, 0x33333a, 1.25));
    const key = new THREE.DirectionalLight(0xfff3e0, 1.9);
    key.position.set(4, 7, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xa9c2ff, 0.5);
    fill.position.set(-5, 3, 4);
    scene.add(fill);

    // Materiales
    const red = new THREE.MeshPhongMaterial({ color: 0xd3362c, specular: 0x5a2a28, shininess: 35 });
    const redDark = new THREE.MeshPhongMaterial({ color: 0x9c231c, specular: 0x331010, shininess: 20 });
    const chrome = new THREE.MeshPhongMaterial({ color: 0xd9dde3, specular: 0xffffff, shininess: 120 });
    const steel = new THREE.MeshPhongMaterial({ color: 0xb3b9c2, specular: 0xffffff, shininess: 90 });
    const dark = new THREE.MeshPhongMaterial({ color: 0x17171b, specular: 0x222222, shininess: 20 });
    const white = new THREE.MeshPhongMaterial({ color: 0xf2f2f2, specular: 0x666666, shininess: 40 });
    const glass = new THREE.MeshPhongMaterial({ color: 0xdfeaff, specular: 0xffffff, shininess: 150, transparent: true, opacity: 0.14, depthWrite: false });
    const glassEdge = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, side: THREE.BackSide, depthWrite: false });

    const machine = new THREE.Group();
    scene.add(machine);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      machine.add(m);
      return m;
    };
    const { min: cm, max: cM } = GEOM.chamber;
    const W = 2.12; // ancho del cuerpo
    const D = 1.56; // fondo del cuerpo
    const FRONT = D / 2; // z de la cara delantera

    // Pie con bandeja delante (la cápsula cae ahí)
    add(new RoundedBoxGeometry(W + 0.16, 0.26, D + 0.9, 3, 0.06), dark, 0, 0.15, 0.45);
    add(new RoundedBoxGeometry(W + 0.1, 0.05, D + 0.84, 2, 0.02), steel, 0, 0.295, 0.45);
    // Cuerpo rojo inferior
    add(new RoundedBoxGeometry(W, 1.76, D, 4, 0.1), red, 0, 1.2, 0);
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
    // Ranura de monedas y cerradura
    add(new RoundedBoxGeometry(0.34, 0.16, 0.04, 2, 0.02), white, -0.72, 1.78, FRONT + 0.015);
    add(new THREE.BoxGeometry(0.12, 0.03, 0.03), dark, -0.72, 1.78, FRONT + 0.04);
    const lock = add(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 20), chrome, 0.72, 1.78, FRONT + 0.03);
    lock.rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(0.02, 0.1, 0.03), dark, 0.72, 1.78, FRONT + 0.06);

    // Mando: anillo, disco y asa; gira sobre z
    const knobY = 1.55;
    const knobZ = FRONT + 0.06;
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

    // Sombra de contacto
    const shadowTex = (() => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 128;
      const g = cv.getContext("2d")!;
      const grad = g.createRadialGradient(64, 64, 10, 64, 64, 64);
      grad.addColorStop(0, "rgba(0,0,0,0.6)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(cv);
    })();
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.6), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.002, 0.4);
    scene.add(shadow);

    // Cápsulas de la vitrina: una malla instanciada, un color por cápsula
    const r = GEOM.capR;
    const capMat = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0xcccccc, shininess: 80 });
    const caps = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 18, 12), capMat, sim.caps.length);
    caps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    sim.caps.forEach((cp, i) => caps.setColorAt(i, RARITY_COLOR[cp.rarity]));
    machine.add(caps);

    // Cápsula que cae: mitad inferior de color, tapa transparente que se abre, luz propia
    const drop = new THREE.Group();
    drop.visible = false;
    const dropMat = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0xffffff, shininess: 90, emissive: 0x000000 });
    const dR = GEOM.dropR;
    const lower = new THREE.Mesh(new THREE.SphereGeometry(dR, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), dropMat);
    const lowerCap = new THREE.Mesh(new THREE.CircleGeometry(dR, 28), dropMat);
    lowerCap.rotation.x = -Math.PI / 2;
    const upper = new THREE.Mesh(new THREE.SphereGeometry(dR, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), dropMat);
    const upperCap = new THREE.Mesh(new THREE.CircleGeometry(dR, 28), dropMat);
    upperCap.rotation.x = Math.PI / 2;
    upper.add(upperCap);
    drop.add(lower, lowerCap, upper);
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
      if (Math.abs(vx) > 150) sim.nudge(clamp(-vx * 0.004, -3, 3), Math.min(2.5, Math.abs(vx) * 0.0025), 0);
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
      machine.rotation.set(view.pitch, view.yaw, 0);
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
      // En reposo no se dibuja nada: cámara quieta, sin temblores ni consumo.
      const live = sim.busy() || turning;
      if (!live && !dirty.current) return;
      dirty.current = live;
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
