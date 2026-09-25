import {
  BATHS,
  BRICK_TONES,
  COMFORT_EXTRAS,
  ENERGY_EXTRAS,
  ENTRANCE_EXTRAS,
  FACADES,
  FINANCING,
  FLOORINGS,
  FRAMES,
  INTERIOR_EXTRAS,
  MODELS,
  PLASTER_COLORS,
  PRICING,
  PV_PACKAGES,
  REFERENCE_MODEL_ID,
  ROOFS,
  WINDOW_EXTRAS,
  WOOD_TONES,
} from '../data/catalog.js';
import { houseGeometry, referenceGeometry } from './geometry.js';

export const roundPrice = (value, step = PRICING.roundTo) => Math.round(value / step) * step;

const mapValues = (obj, fn) => Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, fn(value, key)]));

/** Verhältnis der Hausgröße zum Referenzhaus – flächenabhängige Aufpreise skalieren damit. */
export function scaleFactors(config) {
  const geo = houseGeometry(config);
  const ref = referenceGeometry();
  return {
    facade: geo.facadeArea / ref.facadeArea,
    groundFloorFacade: geo.groundFloorFacadeArea / ref.groundFloorFacadeArea,
    roof: geo.footprintArea / ref.footprintArea,
    area: config.area / MODELS[REFERENCE_MODEL_ID].baseArea,
  };
}

/** Anzahl Innentüren: Zimmer + Bad + HWR + Diele/Küche, bei zwei Geschossen bzw. Zweitbad eine mehr. */
export const doorCount = (config) => config.rooms + 3 + (config.floors === 2 || config.secondBath ? 1 : 0);

/** Aufpreis eines einstöckigen Baus gegenüber dem zweigeschossigen Modellstandard. */
export function singleStoreySurcharge(config) {
  const model = MODELS[config.model];
  if (config.floors !== 1 || model.defaultFloors === 1) return 0;
  return roundPrice(config.area * PRICING.singleStoreyPerSqm);
}

/**
 * Aufpreise aller Optionen für die aktuelle Hausgröße – genutzt für Optionskarten und Kalkulation.
 */
export function optionPrices(config) {
  const scale = scaleFactors(config);
  const model = MODELS[config.model];
  return {
    facade: mapValues(FACADES, (f) =>
      roundPrice(f.price * (f.id === 'klinker' ? scale.groundFloorFacade : scale.facade)),
    ),
    frame: mapValues(FRAMES, (f) => roundPrice(f.price * scale.facade)),
    raffstore: roundPrice(WINDOW_EXTRAS.raffstore.price * scale.facade),
    smartLock: ENTRANCE_EXTRAS.smartLock.price,
    canopy: ENTRANCE_EXTRAS.canopy.price,
    roof: mapValues(ROOFS, (r) => roundPrice(r.price * scale.roof)),
    pv: mapValues(PV_PACKAGES, (p) => p.price),
    batteryPlus: ENERGY_EXTRAS.batteryPlus.price,
    wallbox: ENERGY_EXTRAS.wallbox.price,
    flooring: mapValues(FLOORINGS, (f) => roundPrice(f.pricePerSqm * config.area)),
    bath: mapValues(BATHS, (b) => b.price),
    secondBath: INTERIOR_EXTRAS.secondBath.price,
    tallDoors: INTERIOR_EXTRAS.tallDoors.pricePerDoor * doorCount(config),
    kitchen: INTERIOR_EXTRAS.kitchen.price,
    ventilation: roundPrice(COMFORT_EXTRAS.ventilation.price * scale.area),
    smartHome: COMFORT_EXTRAS.smartHome.price,
    stove: COMFORT_EXTRAS.stove.price,
    accessible: model.accessibleIncluded ? 0 : PRICING.accessiblePrice,
    extraRoom: PRICING.extraRoomPrice,
    areaPerSqm: PRICING.areaPricePerSqm,
    singleStorey: roundPrice(config.area * PRICING.singleStoreyPerSqm),
  };
}

function facadeLabel(config) {
  const facade = FACADES[config.facade];
  if (config.facade === 'holz') return `${facade.name} · ${WOOD_TONES[config.woodTone].name}`;
  if (config.facade === 'klinker') {
    return `${facade.name} · ${BRICK_TONES[config.brickTone].name} / ${PLASTER_COLORS[config.plasterColor].name}`;
  }
  return `${facade.name} · ${PLASTER_COLORS[config.plasterColor].name}`;
}

/** Alle Positionen der Kalkulation (auch inklusive Standardleistungen der Hauptkategorien). */
export function lineItems(config) {
  const model = MODELS[config.model];
  const prices = optionPrices(config);
  const items = [];
  const add = (step, id, label, amount, { optional = false } = {}) => {
    if (optional && amount === 0) return;
    items.push({ step, id, label, amount, included: amount === 0 });
  };

  const areaDelta = config.area - model.baseArea;
  add(1, 'area', `Wohnfläche ${config.area} m² (${areaDelta >= 0 ? '+' : '−'}${Math.abs(areaDelta)} m²)`, areaDelta * prices.areaPerSqm, {
    optional: true,
  });
  const extraRooms = Math.max(0, config.rooms - model.defaultRooms);
  add(1, 'rooms', `${extraRooms} zusätzliche${extraRooms === 1 ? 's' : ''} Zimmer`, extraRooms * prices.extraRoom, {
    optional: true,
  });
  add(1, 'floors', 'Eingeschossige Bauweise (Bodenplatte & Dach)', singleStoreySurcharge(config), { optional: true });
  if (config.accessible) add(1, 'accessible', 'Barrierefreier Grundriss', prices.accessible);

  add(2, 'facade', `Fassade: ${facadeLabel(config)}`, prices.facade[config.facade]);
  const frame = FRAMES[config.frame];
  add(2, 'frame', `Fenster: ${frame.name} ${frame.color}`, prices.frame[config.frame]);
  if (config.raffstore) add(2, 'raffstore', WINDOW_EXTRAS.raffstore.name, prices.raffstore);
  if (config.smartLock) add(2, 'smartLock', `Haustür: ${ENTRANCE_EXTRAS.smartLock.name}`, prices.smartLock);
  if (config.canopy) add(2, 'canopy', ENTRANCE_EXTRAS.canopy.name, prices.canopy);

  const roof = ROOFS[config.roof];
  add(3, 'roof', `Dach: ${roof.name} (${roof.description})`, prices.roof[config.roof]);
  const pv = PV_PACKAGES[config.pv];
  add(3, 'pv', `Full-Black Indach-PV ${pv.kwp} kWp (${pv.modules} Module)`, prices.pv[config.pv]);
  if (config.batteryPlus) add(3, 'batteryPlus', ENERGY_EXTRAS.batteryPlus.name, prices.batteryPlus);
  if (config.wallbox) add(3, 'wallbox', ENERGY_EXTRAS.wallbox.name, prices.wallbox);

  add(4, 'flooring', `Boden: ${FLOORINGS[config.flooring].name}`, prices.flooring[config.flooring]);
  add(4, 'bath', `Bad: ${BATHS[config.bath].name}`, prices.bath[config.bath]);
  if (config.secondBath) add(4, 'secondBath', INTERIOR_EXTRAS.secondBath.name, prices.secondBath);
  if (config.tallDoors) add(4, 'tallDoors', `${INTERIOR_EXTRAS.tallDoors.name} (${doorCount(config)} Stück)`, prices.tallDoors);
  if (config.kitchen) add(4, 'kitchen', INTERIOR_EXTRAS.kitchen.name, prices.kitchen);
  if (config.ventilation) add(4, 'ventilation', COMFORT_EXTRAS.ventilation.name, prices.ventilation);
  if (config.smartHome) add(4, 'smartHome', COMFORT_EXTRAS.smartHome.name, prices.smartHome);
  if (config.stove) add(4, 'stove', COMFORT_EXTRAS.stove.name, prices.stove);

  return items;
}

/** Gesamtkalkulation mit Summen je Schritt. */
export function priceBreakdown(config) {
  const model = MODELS[config.model];
  const items = lineItems(config);
  const byStep = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  items.forEach((item) => {
    byStep[item.step] += item.amount;
  });
  const upgradesTotal = items.reduce((sum, item) => sum + item.amount, 0);
  return {
    model,
    basePrice: model.basePrice,
    items,
    byStep,
    upgradesTotal,
    total: model.basePrice + upgradesTotal,
  };
}

/** Zwischensumme bis einschließlich eines Schritts. */
export function subtotalUntil(breakdown, step) {
  return Object.entries(breakdown.byStep)
    .filter(([s]) => Number(s) <= step)
    .reduce((sum, [, amount]) => sum + amount, breakdown.basePrice);
}

/** Höchstes wählbares Eigenkapital (Anteil am Gesamtpreis, auf Reglerschritte abgerundet). */
export const maxEquity = (total, financing = FINANCING) =>
  Math.floor((total * financing.maxEquityShare) / financing.equityStep) * financing.equityStep;

/** Monatliche Annuität (Zins + anfängliche Tilgung) auf den finanzierten Betrag. */
export function monthlyRate(total, equity = 0, financing = FINANCING) {
  const loan = Math.max(0, total - equity);
  return Math.round((loan * (financing.interestRate + financing.repaymentRate)) / 12);
}
