import { describe, expect, it } from "vitest";
import { GEOM, GachaSim } from "./sim";

const run = (sim: GachaSim, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) sim.step(1 / 60);
};

describe("simulación de la máquina", () => {
  it("las cápsulas quedan dentro de la cúpula y en reposo", () => {
    const sim = new GachaSim();
    run(sim, 2);
    for (const c of sim.caps) {
      const d = Math.hypot(c.p.x - GEOM.dome.c.x, c.p.y - GEOM.dome.c.y, c.p.z - GEOM.dome.c.z);
      expect(d).toBeLessThanOrEqual(GEOM.dome.r - GEOM.capR + 1e-6);
      expect(Math.hypot(c.v.x, c.v.y, c.v.z)).toBeLessThan(0.5);
    }
  });

  it("girar la manivela da una vuelta completa y agita las cápsulas", async () => {
    const sim = new GachaSim();
    run(sim, 1);
    const before = sim.caps.map((c) => ({ ...c.p }));
    const p = sim.turn();
    run(sim, 0.5);
    const moved = sim.caps.filter((c, i) => Math.hypot(c.p.x - before[i].x, c.p.y - before[i].y, c.p.z - before[i].z) > 0.05).length;
    expect(moved).toBeGreaterThan(sim.caps.length / 2);
    run(sim, 0.6);
    await p;
    expect(sim.crank.angle).toBeCloseTo(Math.PI * 2, 1);
  });

  it("la cápsula cae, rebota y se asienta en la bandeja con su rareza", async () => {
    const sim = new GachaSim();
    const p = sim.drop("epica");
    expect(sim.capsule.active).toBe(true);
    expect(sim.capsule.rarity).toBe("epica");
    run(sim, 1.6);
    await p;
    expect(sim.capsule.settled).toBe(true);
    expect(sim.capsule.bounces).toBeGreaterThanOrEqual(1);
    expect(sim.capsule.p.y).toBeCloseTo(GEOM.trayY + GEOM.dropR, 5);
  });

  it("al abrir, la tapa se levanta y salen partículas que se apagan", async () => {
    const sim = new GachaSim();
    sim.skip("legendaria");
    sim.capsule.lid = 0;
    const p = sim.open();
    run(sim, 0.8);
    expect(sim.particles.length).toBeGreaterThan(0);
    run(sim, 0.4);
    await p;
    expect(sim.capsule.lid).toBeCloseTo(1, 2);
    run(sim, 1.2);
    expect(sim.particles.length).toBe(0);
  });

  it("skip deja la cápsula abierta en la bandeja y reset la esconde", () => {
    const sim = new GachaSim();
    sim.skip("rara");
    expect(sim.capsule.active && sim.capsule.settled && sim.capsule.lid === 1).toBe(true);
    sim.reset();
    expect(sim.capsule.active).toBe(false);
  });
});
