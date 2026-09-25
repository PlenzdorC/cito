import { houseGeometry } from './geometry.js';

/**
 * Regelbasierter Grundriss-Generator.
 * Jede Etage wird in ein Gartenband (Süd, v = S) und ein Versorgungsband (Nord, v = 0) geteilt;
 * die Räume eines Bandes teilen sich die Länge L proportional zu ihrem Flächengewicht.
 * Koordinaten sind kanonisch: u ∈ [0, L] entlang der Langseite, v ∈ [0, S] entlang der Schmalseite.
 */

const WEIGHTS = Object.freeze({
  living: 3.2,
  master: 1.45,
  child: 1.15,
  office: 1.0,
  hall: 1.0,
  landing: 0.95,
  bath: 1.0,
  bathWellness: 1.2,
  shower: 0.6,
  wc: 0.3,
  utility: 0.65,
});

/** Mindestbreite von Diele bzw. Flur, damit die gerade Treppe hineinpasst. */
export const STAIR = Object.freeze({ length: 3.1, width: 1.0, wallGap: 0.15, doorClearance: 1.3 });
const STAIR_ROOM_MIN_WIDTH = STAIR.length + STAIR.doorClearance + 0.2;

const room = (id, name, kind, weight) => ({ id, name, kind, weight });

/** Individualräume (ohne Wohnen) passend zur Zimmeranzahl. */
export function individualRooms(totalRooms) {
  const k = totalRooms - 1;
  if (k <= 0) return [];
  const kids = k >= 4 ? k - 2 : k - 1;
  const list = [room('eltern', 'Eltern', 'master', WEIGHTS.master)];
  for (let i = 1; i <= kids; i++) {
    list.push(room(`kind${i}`, kids === 1 ? 'Kind' : `Kind ${i}`, 'child', WEIGHTS.child));
  }
  if (k >= 4) list.push(room('arbeiten', 'Arbeiten / Gast', 'office', WEIGHTS.office));
  return list;
}

/** Raumprogramm je Etage, Reihenfolge entspricht der Lage entlang u (Eingang bei u = L). */
export function roomProgram(config) {
  const living = room('wohnen', config.kitchen ? 'Wohnen · Essen · Kochinsel' : 'Wohnen · Essen · Kochen', 'living', WEIGHTS.living);
  const bath = room('bad', config.bath === 'wellness' ? 'Wellness-Bad' : 'Bad', 'bath', config.bath === 'wellness' ? WEIGHTS.bathWellness : WEIGHTS.bath);
  const utility = room('hwr', 'HWR / Technik', 'utility', WEIGHTS.utility);
  const individual = individualRooms(config.rooms);

  if (config.floors === 1) {
    const garden = [living, ...individual.slice(0, 2)];
    const service = [
      ...individual.slice(2),
      bath,
      ...(config.secondBath ? [room('dusche', 'Duschbad', 'shower', WEIGHTS.shower)] : []),
      utility,
      room('diele', 'Diele', 'hall', WEIGHTS.hall),
    ];
    return [{ id: 'EG', label: 'Erdgeschoss', garden, service, stairs: false }];
  }

  const office = individual.find((r) => r.kind === 'office');
  const upstairs = individual.filter((r) => r.kind !== 'office');
  const groundFloor = {
    id: 'EG',
    label: 'Erdgeschoss',
    garden: [living, ...(office ? [office] : [])],
    service: [
      utility,
      config.secondBath ? room('dusche', 'Duschbad', 'shower', WEIGHTS.shower) : room('wc', 'Gäste-WC', 'wc', WEIGHTS.wc),
      room('diele', 'Diele · Treppe', 'hall', WEIGHTS.hall),
    ],
    stairs: true,
  };
  const upperFloor = {
    id: 'OG',
    label: 'Obergeschoss',
    garden: upstairs.slice(0, 3),
    service: [...upstairs.slice(3), bath, room('flur', 'Flur · Treppe', 'landing', WEIGHTS.landing)],
    stairs: true,
  };
  return [groundFloor, upperFloor];
}

/** Erhöht das Gewicht eines Raums, bis er die Mindestbreite im Band erreicht. */
function ensureMinWidth(band, roomId, minWidth, length) {
  const target = band.find((r) => r.id === roomId);
  if (!target || band.length === 1) return band;
  const others = band.reduce((sum, r) => (r.id === roomId ? sum : sum + r.weight), 0);
  const needed = (minWidth * others) / Math.max(0.1, length - minWidth);
  return band.map((r) => (r.id === roomId && r.weight < needed ? { ...r, weight: needed } : r));
}

function placeBand(band, { vStart, depth, length }) {
  const total = band.reduce((sum, r) => sum + r.weight, 0);
  let u = 0;
  return band.map((r) => {
    const w = (length * r.weight) / total;
    const placed = { id: r.id, name: r.name, kind: r.kind, u, v: vStart, w, h: depth, area: w * depth };
    u += w;
    return placed;
  });
}

/**
 * Erzeugt den Grundriss (Innenmaße) für alle Etagen.
 * @returns {{ L: number, S: number, floors: Array<object> }}
 */
export function layoutFloorplan(config, geo = houseGeometry(config)) {
  const L = geo.inner.long;
  const S = geo.inner.short;
  const floors = roomProgram(config).map((program, level) => {
    const stairRoom = level === 0 ? 'diele' : 'flur';
    const service = program.stairs ? ensureMinWidth(program.service, stairRoom, STAIR_ROOM_MIN_WIDTH, L) : program.service;
    const garden = program.garden.length > 0 ? program.garden : [room('galerie', 'Galerie', 'office', WEIGHTS.office)];
    const gardenWeight = garden.reduce((sum, r) => sum + r.weight, 0);
    const serviceWeight = service.reduce((sum, r) => sum + r.weight, 0);
    const serviceDepth = (S * serviceWeight) / (gardenWeight + serviceWeight);
    const rooms = [
      ...placeBand(service, { vStart: 0, depth: serviceDepth, length: L }).map((r) => ({ ...r, band: 'service' })),
      ...placeBand(garden, { vStart: serviceDepth, depth: S - serviceDepth, length: L }).map((r) => ({ ...r, band: 'garden' })),
    ];
    const stairHost = rooms.find((r) => r.id === stairRoom);
    const stairs =
      program.stairs && stairHost
        ? {
            u: L - STAIR.doorClearance - STAIR.length,
            v: STAIR.wallGap,
            w: STAIR.length,
            h: STAIR.width,
          }
        : null;
    const hall = rooms.find((r) => r.kind === 'hall');
    const entrance = level === 0 && hall ? { u: L, v: hall.v + hall.h / 2, width: 1.1 } : null;
    return { id: program.id, label: program.label, level, serviceDepth, rooms, stairs, entrance };
  });
  return { L, S, floors };
}
