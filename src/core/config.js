import {
  BATHS,
  BRICK_TONES,
  FACADES,
  FLOORINGS,
  FRAMES,
  INTERIOR_EXTRAS,
  MODELS,
  PLASTER_COLORS,
  PV_PACKAGES,
  ROOFS,
  ROOM_OPTIONS,
  WOOD_TONES,
} from '../data/catalog.js';
import { pvCapacity } from './geometry.js';

const keys = (obj) => Object.keys(obj);

/** Erlaubte Werte je Konfigurationsschlüssel – Grundlage für Validierung und URL-Import. */
export const CONFIG_SCHEMA = Object.freeze({
  model: { type: 'enum', values: keys(MODELS) },
  area: { type: 'int', min: 90, max: 210 },
  rooms: { type: 'enum', values: [...ROOM_OPTIONS] },
  floors: { type: 'enum', values: [1, 2] },
  accessible: { type: 'bool' },
  facade: { type: 'enum', values: keys(FACADES) },
  plasterColor: { type: 'enum', values: keys(PLASTER_COLORS) },
  woodTone: { type: 'enum', values: keys(WOOD_TONES) },
  brickTone: { type: 'enum', values: keys(BRICK_TONES) },
  frame: { type: 'enum', values: keys(FRAMES) },
  raffstore: { type: 'bool' },
  smartLock: { type: 'bool' },
  canopy: { type: 'bool' },
  roof: { type: 'enum', values: keys(ROOFS) },
  pv: { type: 'enum', values: keys(PV_PACKAGES) },
  batteryPlus: { type: 'bool' },
  wallbox: { type: 'bool' },
  flooring: { type: 'enum', values: keys(FLOORINGS) },
  bath: { type: 'enum', values: keys(BATHS) },
  secondBath: { type: 'bool' },
  tallDoors: { type: 'bool' },
  kitchen: { type: 'bool' },
  ventilation: { type: 'bool' },
  smartHome: { type: 'bool' },
  stove: { type: 'bool' },
});

/** Prüft einen einzelnen Wert gegen das Schema. */
export function isValidValue(key, value) {
  const rule = CONFIG_SCHEMA[key];
  if (!rule) return false;
  if (rule.type === 'bool') return typeof value === 'boolean';
  if (rule.type === 'int') return Number.isInteger(value) && value >= rule.min && value <= rule.max;
  return rule.values.includes(value);
}

/** Übernimmt nur bekannte, gültige Schlüssel aus einem Patch. */
export function sanitizePatch(patch) {
  if (!patch || typeof patch !== 'object') return {};
  return Object.fromEntries(Object.entries(patch).filter(([key, value]) => isValidValue(key, value)));
}

export function createDefaultConfig(modelId = 'one') {
  const model = MODELS[modelId] ?? MODELS.one;
  return {
    model: model.id,
    area: model.baseArea,
    rooms: model.defaultRooms,
    floors: model.defaultFloors,
    accessible: model.accessibleIncluded,
    facade: 'putz',
    plasterColor: 'sandweiss',
    woodTone: 'laerche',
    brickTone: 'rotbunt',
    frame: 'weiss',
    raffstore: false,
    smartLock: false,
    canopy: false,
    roof: 'pult',
    pv: 'basis',
    batteryPlus: false,
    wallbox: false,
    flooring: 'vinyl',
    bath: 'komfort',
    secondBath: false,
    tallDoors: false,
    kitchen: false,
    ventilation: false,
    smartHome: false,
    stove: false,
  };
}

/** Maximale Zimmeranzahl, die bei gegebener Wohnfläche sinnvoll planbar ist (~22 m² je Zimmer). */
export const maxRoomsForArea = (area) => Math.min(6, Math.max(3, Math.floor(area / 22)));

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const roundToStep = (value, step) => Math.round(value / step) * step;

/**
 * Setzt fachliche Regeln durch und liefert Hinweise, wenn Werte angepasst werden mussten.
 * @returns {{ config: object, notices: Array<{id: string, tone: 'info'|'warn', text: string}> }}
 */
export function reconcile(input) {
  const notices = [];
  const next = { ...createDefaultConfig(input?.model), ...sanitizePatch(input) };
  const model = MODELS[next.model];

  next.area = clamp(roundToStep(next.area, 5), model.areaMin, model.areaMax);

  if (!model.floorOptions.includes(next.floors)) {
    next.floors = model.defaultFloors;
    notices.push({ id: 'floors', tone: 'info', text: `${model.shortName} wird ${model.defaultFloors}-geschossig gebaut.` });
  }

  if (model.accessibleIncluded) next.accessible = true;

  const maxRooms = maxRoomsForArea(next.area);
  if (next.rooms > maxRooms) {
    next.rooms = maxRooms;
    notices.push({
      id: 'rooms',
      tone: 'warn',
      text: `Bei ${next.area} m² sind maximal ${maxRooms} Zimmer planbar – Zimmeranzahl angepasst.`,
    });
  }

  if (next.secondBath && next.area < INTERIOR_EXTRAS.secondBath.minArea) {
    next.secondBath = false;
    notices.push({
      id: 'secondBath',
      tone: 'warn',
      text: `Ein zweites Duschbad ist ab ${INTERIOR_EXTRAS.secondBath.minArea} m² Wohnfläche möglich.`,
    });
  }

  const capacity = pvCapacity(next);
  if (PV_PACKAGES[next.pv].modules > capacity) {
    const fitting =
      Object.values(PV_PACKAGES)
        .filter((pkg) => pkg.modules <= capacity)
        .sort((a, b) => b.modules - a.modules)[0] ?? PV_PACKAGES.basis;
    next.pv = fitting.id;
    notices.push({
      id: 'pv',
      tone: 'warn',
      text: `Auf dieses Dach passen maximal ${capacity} Module – PV-Paket auf „${fitting.name}“ angepasst.`,
    });
  }

  return { config: next, notices };
}

/** Wendet einen Options-Patch an und prüft die Regeln. */
export function updateConfig(config, patch) {
  return reconcile({ ...config, ...sanitizePatch(patch) });
}

/** Modellwechsel: Größe, Zimmer und Geschosse vom Modell, alle Gestaltungswünsche bleiben erhalten. */
export function applyModel(config, modelId) {
  const model = MODELS[modelId];
  if (!model) return { config, notices: [] };
  // Barrierefreiheit bleibt nur erhalten, wenn sie vorher bewusst gewählt (nicht inklusive) war.
  const chosenAccessible = config.accessible && !MODELS[config.model]?.accessibleIncluded;
  return reconcile({
    ...config,
    model: model.id,
    area: model.baseArea,
    rooms: model.defaultRooms,
    floors: model.defaultFloors,
    accessible: model.accessibleIncluded || chosenAccessible,
  });
}

/** Welche Zimmeranzahlen sind bei der aktuellen Fläche wählbar? */
export function roomAvailability(config) {
  const maxRooms = maxRoomsForArea(config.area);
  return ROOM_OPTIONS.map((rooms) => ({ rooms, available: rooms <= maxRooms, minArea: rooms * 22 }));
}

/** Welche PV-Pakete passen auf das Dach? */
export function pvAvailability(config) {
  const capacity = pvCapacity(config);
  return Object.values(PV_PACKAGES).map((pkg) => ({ ...pkg, available: pkg.modules <= capacity, capacity }));
}
