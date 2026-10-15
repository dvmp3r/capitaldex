import { ContactShadows, Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { RARITY_HEX } from "../../game/rarity";
import type { Rarity } from "../../game/types";
import { GEOM, GachaSim } from "./sim";

/** Misma interfaz que la máquina SVG anterior: GachaStage la dirige por fases. */
export interface MachineHandle {
  turn: () => Promise<void>;
  drop: (rarity: Rarity) => Promise<void>;
  open: () => Promise<void>;
  reset: () => void;
  skip: (rarity: Rarity) => void;
}

interface Props {
  dimmed?: boolean;
  idle?: boolean;
  className?: string;
}

/** Máquina de cápsulas en 3D (three.js). Cristal, metal, luz y física real para las cápsulas. */
export const GachaMachine3D = forwardRef<MachineHandle, Props>(function GachaMachine3D({ dimmed = false, className = "" }, ref) {
  const sim = useMemo(() => new GachaSim(), []);
  // Para depurar desde la consola (solo desarrollo). En un efecto, no en el useMemo: StrictMode lo ejecutaría dos veces.
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __gachaSim?: GachaSim }).__gachaSim = sim;
  }, [sim]);

  // En una pestaña oculta no hay fotogramas y el reloj de la simulación no avanza: tope de tiempo real por fase.
  const settle = (p: Promise<void>, ms: number) => Promise.race([p, new Promise<void>((r) => window.setTimeout(r, ms))]);

  useImperativeHandle(
    ref,
    () => ({
      turn: () => settle(sim.turn(), 1100),
      drop: (r) => settle(sim.drop(r), 2000),
      open: () => settle(sim.open(), 1400),
      reset: () => sim.reset(),
      skip: (r) => sim.skip(r),
    }),
    [sim],
  );

  return (
    <div className={`${dimmed ? "machine-dimmed" : ""} ${className}`}>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 2.35, 8.6], fov: 30, near: 0.1, far: 40 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ camera }) => camera.lookAt(0, 1.95, 0)}
        style={{ background: "transparent" }}
      >
        <Scene sim={sim} />
      </Canvas>
    </div>
  );
});

/* ---------- Escena ---------- */

const STEP = 1 / 60;

function Scene({ sim }: { sim: GachaSim }) {
  // Paso fijo con acumulador: física estable a 60 Hz y, si faltan fotogramas, recupera hasta 10 pasos por fotograma.
  const acc = useRef(0);
  useFrame((_, dt) => {
    acc.current = Math.min(acc.current + dt, STEP * 10);
    let n = 0;
    while (acc.current >= STEP && n++ < 10) {
      sim.step(STEP);
      acc.current -= STEP;
    }
  }, -1);
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[3.5, 7, 5]} intensity={2.2} />
      <pointLight position={[-4, 5, -2]} intensity={40} color="#bcd4ff" />
      <pointLight position={[2.5, 1.5, 4]} intensity={18} color="#ffe9cf" />
      <Environment resolution={128}>
        <group>
          <Lightformer intensity={1.6} rotation={[Math.PI / 2, 0, 0]} position={[0, 6, 0]} scale={[12, 12, 1]} />
          <Lightformer intensity={1.4} rotation={[0, Math.PI / 2, 0]} position={[-6, 2, 0]} scale={[10, 4, 1]} color="#dbe6ff" />
          <Lightformer intensity={1} rotation={[0, -Math.PI / 2, 0]} position={[6, 2, 0]} scale={[10, 4, 1]} color="#fff1dc" />
          <Lightformer intensity={0.6} position={[0, 2, -8]} scale={[12, 6, 1]} color="#ffffff" />
        </group>
      </Environment>
      <MachineBody sim={sim} />
      <DomeCapsules sim={sim} />
      <Dome />
      <DropCapsule sim={sim} />
      <Particles sim={sim} />
      <ContactShadows position={[0, 0.002, 0]} opacity={0.75} scale={7} blur={2.4} far={3.5} color="#000000" />
    </>
  );
}

/* ---------- Materiales y geometrías compartidos ---------- */

const MAT = {
  graphite: new THREE.MeshStandardMaterial({ color: "#2a2a2c", metalness: 0.55, roughness: 0.42 }),
  panel: new THREE.MeshStandardMaterial({ color: "#343437", metalness: 0.5, roughness: 0.5 }),
  dark: new THREE.MeshStandardMaterial({ color: "#0c0c0d", metalness: 0.2, roughness: 0.85 }),
  chrome: new THREE.MeshStandardMaterial({ color: "#e6e6ea", metalness: 1, roughness: 0.18 }),
  steel: new THREE.MeshStandardMaterial({ color: "#8c8c92", metalness: 0.9, roughness: 0.3 }),
  glassDome: new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    transmission: 1,
    thickness: 0.5,
    roughness: 0.06,
    ior: 1.45,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMapIntensity: 0.7,
  }),
  glassWindow: new THREE.MeshPhysicalMaterial({
    color: "#dfe7f2",
    transparent: true,
    opacity: 0.16,
    roughness: 0.04,
    metalness: 0,
    clearcoat: 1,
    depthWrite: false,
  }),
  capsuleBottom: new THREE.MeshPhysicalMaterial({ color: "#f3f3f3", transparent: true, opacity: 0.88, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1 }),
  seam: new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.6 }),
};

const capTop = (r: number) => new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
const capBottom = (r: number) => new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
const capSeam = (r: number) => new THREE.TorusGeometry(r, 0.012, 8, 40);
const GEO = {
  domeTop: capTop(GEOM.capR),
  domeBottom: capBottom(GEOM.capR),
  domeSeam: capSeam(GEOM.capR),
  dropTop: capTop(GEOM.dropR),
  dropBottom: capBottom(GEOM.dropR),
  dropSeam: capSeam(GEOM.dropR),
};

const topMaterials: Partial<Record<Rarity, THREE.MeshPhysicalMaterial>> = {};
function topMaterial(rarity: Rarity) {
  return (topMaterials[rarity] ??= new THREE.MeshPhysicalMaterial({
    color: RARITY_HEX[rarity],
    roughness: 0.28,
    metalness: rarity === "legendaria" ? 0.35 : 0,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  }));
}

/* ---------- Cuerpo de la máquina ---------- */

function MachineBody({ sim }: { sim: GachaSim }) {
  const crank = useRef<THREE.Group>(null);
  useFrame(() => {
    if (crank.current) crank.current.rotation.z = -sim.crank.angle;
  });
  const win = { x: GEOM.spawn.x, y: 1.0, z: GEOM.spawn.z, w: 0.66, h: 1.1, d: 0.44 };

  return (
    <group>
      {/* Peana y cuerpo */}
      <mesh position={[0, 0.09, 0]} material={MAT.dark}>
        <cylinderGeometry args={[1.22, 1.28, 0.18, 56]} />
      </mesh>
      <RoundedBox args={[2.1, 1.75, 1.7]} radius={0.12} smoothness={6} position={[0, 1.06, 0]} material={MAT.graphite} />
      <RoundedBox args={[1.92, 1.52, 0.05]} radius={0.05} smoothness={4} position={[0, 1.06, 0.855]} material={MAT.panel} />

      {/* Manivela cromada */}
      <group position={[-0.55, 1.06, 0.9]}>
        <mesh material={MAT.steel} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.34, 0.34, 0.06, 48]} />
        </mesh>
        <group ref={crank} position={[0, 0, 0.05]}>
          <mesh material={MAT.chrome} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.27, 0.27, 0.08, 48]} />
          </mesh>
          <mesh material={MAT.dark} position={[0, 0, 0.07]}>
            <boxGeometry args={[0.08, 0.46, 0.06]} />
          </mesh>
          <mesh material={MAT.chrome} position={[0, 0.2, 0.12]}>
            <sphereGeometry args={[0.05, 16, 12]} />
          </mesh>
        </group>
      </group>

      {/* Ventana de salida: caja de cristal sobre el frontal, con fondo oscuro y bandeja */}
      <mesh position={[win.x, win.y, 0.87]} material={MAT.dark}>
        <boxGeometry args={[win.w, win.h, 0.02]} />
      </mesh>
      <mesh position={[win.x, win.y, win.z]} material={MAT.glassWindow} renderOrder={5}>
        <boxGeometry args={[win.w, win.h, win.d]} />
      </mesh>
      {/* marco */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[win.x + (s * win.w) / 2, win.y, win.z]} material={MAT.steel}>
          <boxGeometry args={[0.03, win.h + 0.03, win.d + 0.02]} />
        </mesh>
      ))}
      <mesh position={[win.x, win.y + win.h / 2, win.z]} material={MAT.steel}>
        <boxGeometry args={[win.w + 0.03, 0.03, win.d + 0.02]} />
      </mesh>
      <mesh position={[win.x, GEOM.trayY - 0.03, win.z + 0.02]} material={MAT.chrome}>
        <boxGeometry args={[win.w + 0.08, 0.06, win.d + 0.14]} />
      </mesh>

      {/* Collar de la cúpula */}
      <mesh position={[0, 1.99, 0]} material={MAT.chrome}>
        <cylinderGeometry args={[0.98, 1.08, 0.18, 64]} />
      </mesh>
      <mesh position={[0, 2.09, 0]} material={MAT.graphite} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.96, 0.07, 16, 64]} />
      </mesh>
    </group>
  );
}

/* ---------- Cúpula ---------- */

function Dome() {
  return (
    <mesh position={[GEOM.dome.c.x, GEOM.dome.c.y, GEOM.dome.c.z]} material={MAT.glassDome} renderOrder={10}>
      <sphereGeometry args={[GEOM.dome.r + 0.05, 64, 48]} />
    </mesh>
  );
}

/* ---------- Cápsulas dentro de la cúpula ---------- */

function DomeCapsules({ sim }: { sim: GachaSim }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    sim.caps.forEach((c, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.position.set(c.p.x, c.p.y, c.p.z);
      g.rotation.set(c.rot.x, c.rot.y, c.rot.z);
    });
  });
  return (
    <group>
      {sim.caps.map((c, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          <mesh geometry={GEO.domeTop} material={topMaterial(c.rarity)} />
          <mesh geometry={GEO.domeBottom} material={MAT.capsuleBottom} />
          <mesh geometry={GEO.domeSeam} material={MAT.seam} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      ))}
    </group>
  );
}

/* ---------- Cápsula que cae ---------- */

function DropCapsule({ sim }: { sim: GachaSim }) {
  const root = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const topMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: RARITY_HEX.comun, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.08, emissive: RARITY_HEX.comun, emissiveIntensity: 0 }), []);
  const last = useRef<Rarity | null>(null);

  useFrame(() => {
    const d = sim.capsule;
    const g = root.current;
    if (!g) return;
    g.visible = d.active;
    if (!d.active) return;
    if (last.current !== d.rarity) {
      topMat.color.set(RARITY_HEX[d.rarity]);
      topMat.emissive.set(RARITY_HEX[d.rarity]);
      topMat.metalness = d.rarity === "legendaria" ? 0.35 : 0;
      light.current?.color.set(RARITY_HEX[d.rarity]);
      last.current = d.rarity;
    }
    g.position.set(d.p.x, d.p.y, d.p.z);
    g.scale.set(d.scale.x, d.scale.y, d.scale.z);
    g.rotation.z = -d.v.x * 0.15;
    if (lid.current) {
      // la tapa gira sobre la bisagra trasera y sale despedida
      const k = d.lid;
      lid.current.position.set(-0.08 * k, 0.32 * k - 0.1 * k * k, -0.06 * k);
      lid.current.rotation.set(-1.6 * k, 0, 0.5 * k);
    }
    topMat.emissiveIntensity = d.glow * 0.9;
    if (light.current) light.current.intensity = d.glow * (d.rarity === "legendaria" ? 14 : 8);
  });

  return (
    <group ref={root} visible={false}>
      <mesh geometry={GEO.dropBottom} material={MAT.capsuleBottom} />
      <mesh geometry={GEO.dropSeam} material={MAT.seam} rotation={[Math.PI / 2, 0, 0]} />
      <group ref={lid}>
        <mesh geometry={GEO.dropTop} material={topMat} />
      </group>
      <pointLight ref={light} intensity={0} distance={2.2} decay={2} position={[0, 0.1, 0.15]} />
    </group>
  );
}

/* ---------- Partículas ---------- */

const MAX_PARTICLES = 40;
const tmp = new THREE.Object3D();

function Particles({ sim }: { sim: GachaSim }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 1.2, roughness: 0.4 }), []);
  const last = useRef<Rarity | null>(null);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    const list = sim.particles;
    if (list.length && last.current !== sim.capsule.rarity) {
      mat.color.set(RARITY_HEX[sim.capsule.rarity]);
      mat.emissive.set(RARITY_HEX[sim.capsule.rarity]);
      last.current = sim.capsule.rarity;
    }
    const n = Math.min(list.length, MAX_PARTICLES);
    for (let i = 0; i < n; i++) {
      const p = list[i];
      tmp.position.set(p.p.x, p.p.y, p.p.z);
      const s = p.size * Math.max(0, p.life);
      tmp.scale.set(s, s, s);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX_PARTICLES]} material={mat} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 6]} />
    </instancedMesh>
  );
}
