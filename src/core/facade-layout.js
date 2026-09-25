import { layoutFloorplan } from './floorplan.js';
import { houseGeometry } from './geometry.js';

/**
 * Leitet Fenster und Haustür aus dem Grundriss ab – so passen 3D-Fassade und 2D-Plan zusammen.
 * Wandlokale Koordinate x: von außen betrachtet von links nach rechts, gemessen ab Außenecke.
 */

export const OPENING_TYPES = Object.freeze({
  panorama: { sill: 0.05, height: 2.35 },
  french: { sill: 0.05, height: 2.3 },
  standard: { sill: 0.85, height: 1.45 },
  small: { sill: 1.4, height: 0.85 },
  door: { sill: 0, height: 2.25 },
  sidelight: { sill: 0, height: 2.25 },
});

const PANE_MAX = 2.4;
const DOOR_WIDTH = 1.1;
const SIDELIGHT_WIDTH = 0.45;

/** Kanonische Grundrisskoordinate → Welt (Innenmaß-Bezug). */
export function canonicalToWorld(geo, u, v) {
  const L = geo.inner.long;
  const S = geo.inner.short;
  if (geo.orientation === 'ew') return { x: -L / 2 + u, z: -S / 2 + v };
  return { x: S / 2 - v, z: -L / 2 + u };
}

/** Welche Außenwand liegt an welcher Grundrisskante? */
export function edgeWall(orientation, edge) {
  const map =
    orientation === 'ew'
      ? { v0: 'N', vS: 'S', u0: 'W', uL: 'E' }
      : { v0: 'E', vS: 'W', u0: 'N', uL: 'S' };
  return map[edge];
}

export function wallLength(geo, wall) {
  return wall === 'N' || wall === 'S' ? geo.outer.width : geo.outer.depth;
}

export function wallLocalX(geo, wall, x, z) {
  const W = geo.outer.width;
  const D = geo.outer.depth;
  if (wall === 'S') return x + W / 2;
  if (wall === 'N') return W / 2 - x;
  if (wall === 'E') return D / 2 - z;
  return z + D / 2;
}

function gardenOpening(r) {
  if (r.kind === 'living') {
    const width = Math.min(8.4, Math.max(1.6, r.w - 1.4));
    return { kind: 'panorama', width, panes: Math.ceil(width / PANE_MAX) };
  }
  const width = Math.min(1.8, r.w - 0.9);
  return width >= 0.8 ? { kind: 'french', width, panes: 1 } : null;
}

const MIN_OPENING_WIDTH = 0.45;

function serviceOpening(r) {
  const small = { bath: 1.2, shower: 0.8, wc: 0.6, utility: 0.9 };
  if (small[r.kind]) {
    const width = Math.min(small[r.kind], r.w - 0.8);
    return width >= MIN_OPENING_WIDTH ? { kind: 'small', width, panes: 1 } : null;
  }
  const width = r.kind === 'hall' ? 1.0 : r.kind === 'landing' ? 1.2 : Math.min(1.4, r.w - 0.8);
  return width >= 0.6 ? { kind: 'standard', width, panes: 1 } : null;
}

function endOpening(r) {
  if (r.h < 2.2) return null;
  if (['bath', 'shower', 'wc', 'utility'].includes(r.kind)) return { kind: 'small', width: 0.8, panes: 1 };
  if (r.kind === 'living') return { kind: 'standard', width: Math.min(2.4, r.h - 0.9), panes: 2 };
  return { kind: 'standard', width: Math.min(1.3, r.h - 0.8), panes: 1 };
}

function makeOpening(geo, { edge, u, v, floor, roomId, kind, width, panes }) {
  const wall = edgeWall(geo.orientation, edge);
  const world = canonicalToWorld(geo, u, v);
  const type = OPENING_TYPES[kind];
  return {
    id: `${floor.id}-${roomId}-${edge}-${kind}`,
    wall,
    edge,
    u,
    v,
    floor: floor.level,
    kind,
    roomId,
    x: wallLocalX(geo, wall, world.x, world.z),
    y: geo.floorLevels[floor.level] + type.sill,
    width,
    height: type.height,
    panes,
  };
}

/** Alle Öffnungen (Fenster, Haustür, Seitenteil) der Außenwände. */
export function facadeOpenings(config, geo = houseGeometry(config), plan = layoutFloorplan(config, geo)) {
  const { L, S } = plan;
  const openings = [];
  plan.floors.forEach((floor) => {
    const bands = { service: floor.rooms.filter((r) => r.band === 'service'), garden: floor.rooms.filter((r) => r.band === 'garden') };
    floor.rooms.forEach((r) => {
      const along = r.band === 'garden' ? gardenOpening(r) : serviceOpening(r);
      if (along) {
        const edge = r.band === 'garden' ? 'vS' : 'v0';
        openings.push(makeOpening(geo, { edge, u: r.u + r.w / 2, v: r.band === 'garden' ? S : 0, floor, roomId: r.id, ...along }));
      }
    });
    Object.values(bands).forEach((band) => {
      const first = band[0];
      const last = band[band.length - 1];
      const startOpening = first && endOpening(first);
      if (startOpening) {
        openings.push(makeOpening(geo, { edge: 'u0', u: 0, v: first.v + first.h / 2, floor, roomId: first.id, ...startOpening }));
      }
      const isEntrance = floor.entrance && last?.kind === 'hall';
      const endOpen = last && last !== first && !isEntrance ? endOpening(last) : null;
      if (endOpen) {
        openings.push(makeOpening(geo, { edge: 'uL', u: L, v: last.v + last.h / 2, floor, roomId: last.id, ...endOpen }));
      }
    });
    if (floor.entrance) {
      const hall = floor.rooms.find((r) => r.kind === 'hall');
      openings.push(
        makeOpening(geo, { edge: 'uL', u: L, v: floor.entrance.v, floor, roomId: hall.id, kind: 'door', width: DOOR_WIDTH, panes: 1 }),
      );
      const sideV = floor.entrance.v + DOOR_WIDTH / 2 + 0.12 + SIDELIGHT_WIDTH / 2;
      if (sideV + SIDELIGHT_WIDTH / 2 < hall.v + hall.h - 0.15) {
        openings.push(
          makeOpening(geo, { edge: 'uL', u: L, v: sideV, floor, roomId: hall.id, kind: 'sidelight', width: SIDELIGHT_WIDTH, panes: 1 }),
        );
      }
    }
  });
  return openings;
}

/** Die Wand, an der sich die Haustür befindet (für Vordach, SmartScan & Kamera). */
export function entranceInfo(config, geo = houseGeometry(config), openings = facadeOpenings(config, geo)) {
  const door = openings.find((o) => o.kind === 'door');
  return door ? { wall: door.wall, x: door.x, width: door.width, height: door.height } : null;
}
