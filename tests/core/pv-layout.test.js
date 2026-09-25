import { describe, expect, it } from 'vitest';
import { createDefaultConfig } from '../../src/core/config.js';
import { distributeModules, pvLayout } from '../../src/core/pv-layout.js';

const one = createDefaultConfig('one');

describe('distributeModules', () => {
  it('splits modules evenly across planes', () => {
    expect(distributeModules(30, [24, 24])).toEqual([15, 15]);
    expect(distributeModules(31, [24, 24])).toEqual([16, 15]);
  });

  it('respects plane capacities and total capacity', () => {
    expect(distributeModules(30, [10, 40])).toEqual([10, 20]);
    expect(distributeModules(80, [10, 20])).toEqual([10, 20]);
    expect(distributeModules(10, [0, 0])).toEqual([0, 0]);
  });
});

function assertInsideAndSeparated(layout) {
  layout.planes.forEach(({ plane, fit, modules }) => {
    const sizeU = plane.flat ? fit.projected : fit.across;
    const sizeV = plane.flat ? fit.across : fit.along;
    modules.forEach((m) => {
      expect(m.u - sizeU / 2).toBeGreaterThanOrEqual(0);
      expect(m.u + sizeU / 2).toBeLessThanOrEqual(plane.uLength + 1e-9);
      expect(m.v - sizeV / 2).toBeGreaterThanOrEqual(0);
      expect(m.v + sizeV / 2).toBeLessThanOrEqual(plane.vLength + 1e-9);
    });
    for (let i = 0; i < modules.length; i++) {
      for (let j = i + 1; j < modules.length; j++) {
        const overlapU = Math.abs(modules[i].u - modules[j].u) < sizeU - 1e-6;
        const overlapV = Math.abs(modules[i].v - modules[j].v) < sizeV - 1e-6;
        expect(overlapU && overlapV).toBe(false);
      }
    }
  });
}

describe('pvLayout', () => {
  it('places every requested module on the mono-pitch roof', () => {
    ['basis', 'plus', 'max'].forEach((pv) => {
      const layout = pvLayout({ ...one, pv });
      expect(layout.total).toBe(layout.requested);
      assertInsideAndSeparated(layout);
    });
  });

  it('splits modules between east and west on the gable roof', () => {
    const layout = pvLayout({ ...one, roof: 'sattel', pv: 'plus' });
    expect(layout.planes.map((p) => p.modules.length)).toEqual([15, 15]);
    assertInsideAndSeparated(layout);
  });

  it('builds tent-shaped pairs on the flat roof', () => {
    const layout = pvLayout({ ...one, roof: 'flach', pv: 'plus' });
    const tilts = new Set(layout.planes[0].modules.map((m) => m.tiltSign));
    expect(tilts).toEqual(new Set([-1, 1]));
    expect(layout.total).toBe(30);
    assertInsideAndSeparated(layout);
  });

  it('never places more modules than fit', () => {
    const layout = pvLayout({ ...one, roof: 'flach', pv: 'max' });
    expect(layout.total).toBe(Math.min(layout.requested, layout.capacity));
    assertInsideAndSeparated(layout);
  });
});
