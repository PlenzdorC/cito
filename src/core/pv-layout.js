import { BUILDING, PV_PACKAGES } from '../data/catalog.js';
import { fitFlatRoof, fitPitchedPlane, houseGeometry, roofPlanes } from './geometry.js';

/**
 * Verteilt eine Modulanzahl gleichmäßig auf Dachflächen, ohne deren Kapazität zu überschreiten.
 * @param {number} total
 * @param {number[]} capacities
 */
export function distributeModules(total, capacities) {
  const counts = capacities.map(() => 0);
  let remaining = Math.min(total, capacities.reduce((a, b) => a + b, 0));
  while (remaining > 0) {
    const open = capacities.map((cap, i) => (counts[i] < cap ? i : -1)).filter((i) => i >= 0);
    const share = Math.max(1, Math.floor(remaining / open.length));
    for (const i of open) {
      if (remaining === 0) break;
      const add = Math.min(share, capacities[i] - counts[i], remaining);
      counts[i] += add;
      remaining -= add;
    }
  }
  return counts;
}

function blockShape(n, fit) {
  const rowsUsed = Math.min(fit.rows, Math.ceil(n / fit.cols));
  const colsUsed = Math.min(fit.cols, Math.ceil(n / rowsUsed));
  return { rowsUsed, colsUsed };
}

/** Rechteckiger, zentrierter Modulblock auf geneigter Fläche; angebrochene Reihe oben mittig. */
function layoutPitched(fit, n) {
  if (n <= 0) return [];
  const gap = BUILDING.moduleGap;
  const { rowsUsed, colsUsed } = blockShape(n, fit);
  const startU = fit.margin + (fit.availU - (colsUsed * fit.cellU - gap)) / 2;
  const startV = fit.margin + (fit.availV - (rowsUsed * fit.cellV - gap)) / 2;
  const modules = [];
  let remaining = n;
  for (let r = 0; r < rowsUsed && remaining > 0; r++) {
    const inRow = Math.min(colsUsed, remaining);
    const offset = ((colsUsed - inRow) * fit.cellU) / 2;
    for (let c = 0; c < inRow; c++) {
      modules.push({
        u: startU + offset + c * fit.cellU + fit.across / 2,
        v: startV + r * fit.cellV + fit.along / 2,
        tiltSign: 0,
      });
    }
    remaining -= inRow;
  }
  return modules;
}

/** Ost/West-Zeltaufständerung: Reihen entlang u (paarweise gegeneinander geneigt), Module entlang v. */
function layoutFlat(fit, n) {
  if (n <= 0) return [];
  const gap = BUILDING.moduleGap;
  const { rowsUsed, colsUsed } = blockShape(n, fit);
  const pairDepth = 2 * fit.projected + fit.pairGap;
  const blockU =
    Math.floor(rowsUsed / 2) * 2 * fit.projected +
    (rowsUsed % 2) * fit.projected +
    (Math.ceil(rowsUsed / 2) - 1) * fit.pairGap;
  const startU = fit.margin + (fit.availU - blockU) / 2;
  const startV = fit.margin + (fit.availV - (colsUsed * fit.cellV - gap)) / 2;
  const modules = [];
  let remaining = n;
  for (let r = 0; r < rowsUsed && remaining > 0; r++) {
    const inRow = Math.min(colsUsed, remaining);
    const offset = ((colsUsed - inRow) * fit.cellV) / 2;
    const u = startU + Math.floor(r / 2) * pairDepth + (r % 2) * fit.projected + fit.projected / 2;
    for (let c = 0; c < inRow; c++) {
      modules.push({
        u,
        v: startV + offset + c * fit.cellV + fit.across / 2,
        tiltSign: r % 2 === 0 ? -1 : 1,
      });
    }
    remaining -= inRow;
  }
  return modules;
}

/**
 * Vollständige PV-Belegung für die 3D-Darstellung.
 * Modulpositionen sind lokale (u, v)-Koordinaten der jeweiligen Dachfläche (Modulmitte).
 */
export function pvLayout(config, geo = houseGeometry(config)) {
  const planes = roofPlanes(geo);
  const fits = planes.map((plane) => (plane.flat ? fitFlatRoof(plane) : fitPitchedPlane(plane)));
  const capacity = fits.reduce((sum, fit) => sum + fit.capacity, 0);
  const requested = PV_PACKAGES[config.pv].modules;
  const counts = distributeModules(requested, fits.map((fit) => fit.capacity));
  return {
    requested,
    capacity,
    total: counts.reduce((a, b) => a + b, 0),
    planes: planes.map((plane, i) => ({
      plane,
      fit: fits[i],
      modules: plane.flat ? layoutFlat(fits[i], counts[i]) : layoutPitched(fits[i], counts[i]),
    })),
  };
}
