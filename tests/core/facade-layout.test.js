import { describe, expect, it } from 'vitest';
import { MODELS } from '../../src/data/catalog.js';
import { createDefaultConfig } from '../../src/core/config.js';
import { canonicalToWorld, edgeWall, facadeOpenings, wallLength, wallLocalX } from '../../src/core/facade-layout.js';
import { houseGeometry, roofUndersideAt } from '../../src/core/geometry.js';

const one = createDefaultConfig('one');

function variants() {
  const list = [];
  Object.values(MODELS).forEach((model) => {
    model.floorOptions.forEach((floors) => {
      ['pult', 'sattel', 'flach'].forEach((roof) => {
        [3, 4, 5, 6].forEach((rooms) => {
          const area = model.areaMax;
          list.push({ ...createDefaultConfig(model.id), floors, roof, rooms, area, secondBath: true });
        });
        list.push({ ...createDefaultConfig(model.id), floors, roof, area: model.areaMin, rooms: 3 });
      });
    });
  });
  return list;
}

/** Weltkoordinate der Öffnungsmitte auf der Außenfläche. */
function worldOf(geo, o) {
  const W = geo.outer.width;
  const D = geo.outer.depth;
  if (o.wall === 'S') return { x: o.x - W / 2, z: D / 2 };
  if (o.wall === 'N') return { x: W / 2 - o.x, z: -D / 2 };
  if (o.wall === 'E') return { x: W / 2, z: D / 2 - o.x };
  return { x: -W / 2, z: o.x - D / 2 };
}

describe('coordinate helpers', () => {
  it('maps canonical edges to world walls', () => {
    expect(edgeWall('ew', 'vS')).toBe('S');
    expect(edgeWall('ew', 'uL')).toBe('E');
    expect(edgeWall('ns', 'uL')).toBe('S');
    expect(edgeWall('ns', 'vS')).toBe('W');
  });

  it('round-trips world positions along each wall', () => {
    const geo = houseGeometry(one);
    const p = canonicalToWorld(geo, geo.inner.long, 1);
    expect(p.x).toBeCloseTo(geo.inner.long / 2, 6);
    expect(wallLocalX(geo, 'S', 0, 0)).toBeCloseTo(geo.outer.width / 2, 6);
    expect(wallLocalX(geo, 'N', geo.outer.width / 2, 0)).toBeCloseTo(0, 6);
    expect(wallLength(geo, 'E')).toBe(geo.outer.depth);
  });
});

describe('facadeOpenings', () => {
  it('has exactly one front door on the entrance wall', () => {
    const doorWall = (config) => facadeOpenings(config).find((o) => o.kind === 'door').wall;
    expect(doorWall(one)).toBe('E');
    expect(doorWall({ ...one, roof: 'sattel' })).toBe('S');
    variants().forEach((config) => {
      const doors = facadeOpenings(config).filter((o) => o.kind === 'door');
      expect(doors).toHaveLength(1);
    });
  });

  it('gives the living room a panorama glazing towards the garden', () => {
    const panorama = facadeOpenings(one).find((o) => o.kind === 'panorama');
    expect(panorama).toMatchObject({ wall: 'S', floor: 0, roomId: 'wohnen' });
    expect(panorama.panes).toBeGreaterThan(1);
  });

  it('keeps every opening inside its wall and below the roof', () => {
    variants().forEach((config) => {
      const geo = houseGeometry(config);
      facadeOpenings(config, geo).forEach((o) => {
        const length = wallLength(geo, o.wall);
        expect(o.x - o.width / 2, o.id).toBeGreaterThanOrEqual(geo.wallThickness);
        expect(o.x + o.width / 2, o.id).toBeLessThanOrEqual(length - geo.wallThickness);
        const w = worldOf(geo, o);
        expect(o.y + o.height, o.id).toBeLessThan(roofUndersideAt(geo, w.x, w.z) - 0.2);
        expect(o.width).toBeGreaterThanOrEqual(0.45);
      });
    });
  });

  it('never overlaps two openings on the same wall and floor', () => {
    variants().forEach((config) => {
      const openings = facadeOpenings(config);
      for (let i = 0; i < openings.length; i++) {
        for (let j = i + 1; j < openings.length; j++) {
          const a = openings[i];
          const b = openings[j];
          if (a.wall !== b.wall || a.floor !== b.floor) continue;
          const gap = Math.abs(a.x - b.x) - (a.width + b.width) / 2;
          expect(gap, `${a.id} / ${b.id}`).toBeGreaterThan(0.1);
        }
      }
    });
  });
});
