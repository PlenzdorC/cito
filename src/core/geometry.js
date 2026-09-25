import { BUILDING, MODELS, PV_MODULE, REFERENCE_MODEL_ID, ROOFS } from '../data/catalog.js';

/**
 * Baukörper-Geometrie aus der Konfiguration.
 * Weltkoordinaten: Y nach oben, Meter, Grundriss mittig im Ursprung,
 * +Z = Süden (Garten/Kamera), +X = Osten.
 * Kanonische Grundriss-Koordinaten: u entlang der Langseite, v entlang der Schmalseite.
 */

const toRad = (deg) => (deg * Math.PI) / 180;
const ROOF_THICKNESS = 0.25;

export function houseGeometry(config) {
  const floors = config.floors;
  const netAreaPerFloor = config.area / floors;
  const shortInner = Math.sqrt(netAreaPerFloor / BUILDING.aspectRatio);
  const longInner = netAreaPerFloor / shortInner;
  const t = BUILDING.wallThickness;
  const long = longInner + 2 * t;
  const short = shortInner + 2 * t;

  // Satteldach: First läuft Nord-Süd (Dachflächen nach Ost/West), Giebel zeigt nach Süden.
  const orientation = config.roof === 'sattel' ? 'ns' : 'ew';
  const width = orientation === 'ew' ? long : short;
  const depth = orientation === 'ew' ? short : long;

  const floorLevels = Array.from({ length: floors }, (_, i) => BUILDING.plinthHeight + i * BUILDING.storeyHeight);
  const eavesHeight = BUILDING.plinthHeight + floors * BUILDING.storeyHeight + BUILDING.roofBuildUp;
  const roof = roofShape(config.roof, width, depth, eavesHeight);

  return {
    floors,
    area: config.area,
    netAreaPerFloor,
    orientation,
    inner: { long: longInner, short: shortInner },
    outer: { long, short, width, depth },
    wallThickness: t,
    storeyHeight: BUILDING.storeyHeight,
    plinthHeight: BUILDING.plinthHeight,
    floorLevels,
    eavesHeight,
    roof,
    totalHeight: roof.topHeight,
    footprintArea: long * short,
    // Dachform-unabhängige Bezugsgrößen für die Preisskalierung
    facadeArea: 2 * (long + short) * floors * BUILDING.storeyHeight,
    groundFloorFacadeArea: 2 * (long + short) * BUILDING.storeyHeight,
  };
}

function roofShape(type, width, depth, eavesHeight) {
  const { pitch } = ROOFS[type];
  const tan = Math.tan(toRad(pitch));
  const overhang = type === 'flach' ? 0 : BUILDING.overhang;
  if (type === 'pult') {
    const rise = depth * tan;
    return { type, pitch, rise, overhang, thickness: ROOF_THICKNESS, topHeight: eavesHeight + rise + ROOF_THICKNESS };
  }
  if (type === 'sattel') {
    const rise = (width / 2) * tan;
    return { type, pitch, rise, overhang, thickness: ROOF_THICKNESS, topHeight: eavesHeight + rise + ROOF_THICKNESS };
  }
  return {
    type,
    pitch: 0,
    rise: 0,
    overhang,
    thickness: ROOF_THICKNESS,
    parapet: BUILDING.parapetHeight,
    topHeight: eavesHeight + BUILDING.parapetHeight,
  };
}

/** Höhe der Dachunterseite (Wandoberkante) an einer Weltposition. */
export function roofUndersideAt(geo, x, z) {
  const { roof, eavesHeight, outer } = geo;
  const tan = Math.tan(toRad(roof.pitch));
  if (roof.type === 'pult') return eavesHeight + (outer.depth / 2 - z) * tan;
  if (roof.type === 'sattel') return eavesHeight + (outer.width / 2 - Math.abs(x)) * tan;
  return eavesHeight;
}

/**
 * Dachflächen als lokale Koordinatensysteme (Ursprung an der Traufkante,
 * u entlang der Traufe, v hangaufwärts, n = Flächennormale).
 */
export function roofPlanes(geo) {
  const { roof, outer, eavesHeight } = geo;
  const W = outer.width;
  const D = outer.depth;
  const oh = roof.overhang;
  const T = roof.thickness;
  const p = toRad(roof.pitch);
  const s = Math.sin(p);
  const c = Math.cos(p);
  const tan = Math.tan(p);

  if (roof.type === 'pult') {
    return [
      {
        id: 'sued',
        label: 'Süd',
        tilt: roof.pitch,
        azimuth: 180,
        origin: [-W / 2 - oh, eavesHeight - oh * tan + T * c, D / 2 + oh + T * s],
        uAxis: [1, 0, 0],
        vAxis: [0, s, -c],
        normal: [0, c, s],
        uLength: W + 2 * oh,
        vLength: (D + 2 * oh) / c,
      },
    ];
  }
  if (roof.type === 'sattel') {
    const eaveY = eavesHeight - oh * tan + T * c;
    const vLength = (W / 2 + oh) / c;
    return [
      {
        id: 'ost',
        label: 'Ost',
        tilt: roof.pitch,
        azimuth: 90,
        origin: [W / 2 + oh + T * s, eaveY, D / 2 + oh],
        uAxis: [0, 0, -1],
        vAxis: [-c, s, 0],
        normal: [s, c, 0],
        uLength: D + 2 * oh,
        vLength,
      },
      {
        id: 'west',
        label: 'West',
        tilt: roof.pitch,
        azimuth: 270,
        origin: [-(W / 2 + oh + T * s), eaveY, -D / 2 - oh],
        uAxis: [0, 0, 1],
        vAxis: [c, s, 0],
        normal: [-s, c, 0],
        uLength: D + 2 * oh,
        vLength,
      },
    ];
  }
  return [
    {
      id: 'flach',
      label: 'Flachdach',
      tilt: BUILDING.flatModuleTilt,
      azimuth: 180,
      flat: true,
      origin: [-W / 2, eavesHeight, D / 2],
      uAxis: [1, 0, 0],
      vAxis: [0, 0, -1],
      normal: [0, 1, 0],
      uLength: W,
      vLength: D,
    },
  ];
}

const PORTRAIT = { across: PV_MODULE.width, along: PV_MODULE.length, orientation: 'portrait' };
const LANDSCAPE = { across: PV_MODULE.length, along: PV_MODULE.width, orientation: 'landscape' };

/** Wie viele Module passen auf eine geneigte Fläche? (Hochformat oder Querformat, je nachdem was mehr ergibt) */
export function fitPitchedPlane(plane, margin = BUILDING.pitchedRoofMargin) {
  const gap = BUILDING.moduleGap;
  const availU = plane.uLength - 2 * margin;
  const availV = plane.vLength - 2 * margin;
  const fits = [PORTRAIT, LANDSCAPE].map((m) => {
    const cols = Math.max(0, Math.floor((availU + gap) / (m.across + gap)));
    const rows = Math.max(0, Math.floor((availV + gap) / (m.along + gap)));
    return { ...m, cols, rows, capacity: cols * rows, cellU: m.across + gap, cellV: m.along + gap, availU, availV, margin };
  });
  return fits[0].capacity >= fits[1].capacity ? fits[0] : fits[1];
}

/**
 * Flachdach mit Ost/West-Aufständerung: Modulpaare (Zeltform) nebeneinander entlang u,
 * Module in Reihe entlang v.
 */
export function fitFlatRoof(plane, margin = BUILDING.flatRoofMargin) {
  const gap = BUILDING.moduleGap;
  const pairGap = BUILDING.flatPairGap;
  const cosTilt = Math.cos(toRad(BUILDING.flatModuleTilt));
  const availU = plane.uLength - 2 * margin;
  const availV = plane.vLength - 2 * margin;
  const fits = [PORTRAIT, LANDSCAPE].map((m) => {
    const projected = m.along * cosTilt;
    const pairDepth = 2 * projected + pairGap;
    const pairs = Math.max(0, Math.floor((availU + pairGap) / pairDepth));
    const used = pairs > 0 ? pairs * pairDepth - pairGap : 0;
    const extra = availU - used >= projected + (pairs > 0 ? pairGap : 0) ? 1 : 0;
    const rows = pairs * 2 + extra;
    const cols = Math.max(0, Math.floor((availV + gap) / (m.across + gap)));
    return {
      ...m,
      rows,
      cols,
      capacity: rows * cols,
      projected,
      pairGap,
      cellV: m.across + gap,
      availU,
      availV,
      margin,
    };
  });
  return fits[0].capacity >= fits[1].capacity ? fits[0] : fits[1];
}

/** Maximale Anzahl PV-Module, die auf das Dach der Konfiguration passen. */
export function pvCapacity(config) {
  const geo = houseGeometry(config);
  return roofPlanes(geo).reduce(
    (sum, plane) => sum + (plane.flat ? fitFlatRoof(plane) : fitPitchedPlane(plane)).capacity,
    0,
  );
}

let referenceCache = null;

/** Referenzhaus (Cito One, Standardgröße) für flächenabhängige Aufpreise. */
export function referenceGeometry() {
  if (!referenceCache) {
    const model = MODELS[REFERENCE_MODEL_ID];
    referenceCache = houseGeometry({ area: model.baseArea, floors: model.defaultFloors, roof: 'pult' });
  }
  return referenceCache;
}
