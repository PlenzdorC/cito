import { describe, expect, it } from 'vitest';
import { MODELS, ROOM_OPTIONS } from '../../src/data/catalog.js';
import { createDefaultConfig, maxRoomsForArea } from '../../src/core/config.js';
import { STAIR, individualRooms, layoutFloorplan, roomProgram } from '../../src/core/floorplan.js';
import { houseGeometry } from '../../src/core/geometry.js';

const one = createDefaultConfig('one');
const INDIVIDUAL = ['master', 'child', 'office'];

function variants() {
  const list = [];
  Object.values(MODELS).forEach((model) => {
    model.floorOptions.forEach((floors) => {
      ROOM_OPTIONS.forEach((rooms) => {
        [model.areaMin, model.baseArea, model.areaMax].forEach((area) => {
          if (rooms > maxRoomsForArea(area)) return;
          [false, true].forEach((secondBath) => {
            list.push({ ...createDefaultConfig(model.id), floors, rooms, area, secondBath: secondBath && area >= 110 });
          });
        });
      });
    });
  });
  return list;
}

describe('individualRooms', () => {
  it('derives the bedroom programme from the room count', () => {
    expect(individualRooms(3).map((r) => r.name)).toEqual(['Eltern', 'Kind']);
    expect(individualRooms(4).map((r) => r.name)).toEqual(['Eltern', 'Kind 1', 'Kind 2']);
    expect(individualRooms(5).map((r) => r.name)).toEqual(['Eltern', 'Kind 1', 'Kind 2', 'Arbeiten / Gast']);
    expect(individualRooms(6).map((r) => r.name)).toEqual(['Eltern', 'Kind 1', 'Kind 2', 'Kind 3', 'Arbeiten / Gast']);
    expect(individualRooms(1)).toEqual([]);
  });
});

describe('roomProgram', () => {
  it('places living, office and services downstairs and bedrooms upstairs', () => {
    const [eg, og] = roomProgram({ ...one, rooms: 5 });
    expect(eg.garden.map((r) => r.id)).toEqual(['wohnen', 'arbeiten']);
    expect(eg.service.map((r) => r.id)).toEqual(['hwr', 'wc', 'diele']);
    expect(og.garden.map((r) => r.id)).toEqual(['eltern', 'kind1', 'kind2']);
    expect(og.service.at(-1).id).toBe('flur');
  });

  it('turns the guest WC into a shower room and names the kitchen island', () => {
    const [eg] = roomProgram({ ...one, secondBath: true, kitchen: true });
    expect(eg.service.map((r) => r.id)).toContain('dusche');
    expect(eg.garden[0].name).toContain('Kochinsel');
  });

  it('keeps everything on one level for bungalows', () => {
    const program = roomProgram(createDefaultConfig('alpha'));
    expect(program).toHaveLength(1);
    expect(program[0].stairs).toBe(false);
    expect(program[0].service.at(-1).kind).toBe('hall');
  });
});

describe('layoutFloorplan', () => {
  it('fills each floor exactly with non-overlapping rooms', () => {
    variants().forEach((config) => {
      const plan = layoutFloorplan(config);
      const geo = houseGeometry(config);
      plan.floors.forEach((floor) => {
        const area = floor.rooms.reduce((sum, r) => sum + r.area, 0);
        expect(area).toBeCloseTo(geo.netAreaPerFloor, 6);
        floor.rooms.forEach((r) => {
          expect(r.u).toBeGreaterThanOrEqual(-1e-9);
          expect(r.v).toBeGreaterThanOrEqual(-1e-9);
          expect(r.u + r.w).toBeLessThanOrEqual(plan.L + 1e-9);
          expect(r.v + r.h).toBeLessThanOrEqual(plan.S + 1e-9);
        });
        for (let i = 0; i < floor.rooms.length; i++) {
          for (let j = i + 1; j < floor.rooms.length; j++) {
            const a = floor.rooms[i];
            const b = floor.rooms[j];
            const overlap =
              a.u < b.u + b.w - 1e-6 && b.u < a.u + a.w - 1e-6 && a.v < b.v + b.h - 1e-6 && b.v < a.v + a.h - 1e-6;
            expect(overlap).toBe(false);
          }
        }
      });
    });
  });

  it('plans exactly the configured number of rooms', () => {
    variants().forEach((config) => {
      const rooms = layoutFloorplan(config).floors.flatMap((f) => f.rooms);
      const individual = rooms.filter((r) => INDIVIDUAL.includes(r.kind));
      expect(individual.length + 1).toBe(config.rooms);
    });
  });

  it('puts the stairs inside the hall on both levels', () => {
    variants()
      .filter((c) => c.floors === 2)
      .forEach((config) => {
        const plan = layoutFloorplan(config);
        plan.floors.forEach((floor) => {
          const host = floor.rooms.find((r) => r.id === (floor.level === 0 ? 'diele' : 'flur'));
          expect(floor.stairs.u).toBeGreaterThanOrEqual(host.u);
          expect(floor.stairs.u + floor.stairs.w).toBeLessThanOrEqual(host.u + host.w + 1e-9);
          expect(floor.stairs.v + floor.stairs.h).toBeLessThanOrEqual(host.v + host.h);
          expect(floor.stairs.w).toBe(STAIR.length);
        });
      });
  });

  it('places the entrance only on the ground floor', () => {
    const plan = layoutFloorplan(one);
    expect(plan.floors[0].entrance).toMatchObject({ u: plan.L });
    expect(plan.floors[1].entrance).toBeNull();
  });
});
