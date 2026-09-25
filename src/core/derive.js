import { pvAvailability, roomAvailability } from './config.js';
import { energyMetrics, energyStandard } from './energy.js';
import { facadeOpenings } from './facade-layout.js';
import { layoutFloorplan } from './floorplan.js';
import { houseGeometry } from './geometry.js';
import { monthlyRate, optionPrices, priceBreakdown } from './pricing.js';
import { configId } from './serialize.js';
import { citoTip } from './tips.js';

/**
 * Leitet alle Anzeige-Daten aus dem Zustand ab. Da Konfigurationen unveränderlich sind,
 * genügt ein Referenzvergleich als Cache-Schlüssel.
 */
let configCache = { config: null, data: null };
let tipCache = { config: null, step: null, tip: null };

function configData(config) {
  if (configCache.config === config) return configCache.data;
  const geo = houseGeometry(config);
  const plan = layoutFloorplan(config, geo);
  const data = {
    geo,
    plan,
    openings: facadeOpenings(config, geo, plan),
    breakdown: priceBreakdown(config),
    prices: optionPrices(config),
    energy: energyMetrics(config),
    standard: energyStandard(config),
    pvOptions: pvAvailability(config),
    roomOptions: roomAvailability(config),
    configId: configId(config),
  };
  configCache = { config, data };
  return data;
}

function tipFor(config, step) {
  if (tipCache.config !== config || tipCache.step !== step) {
    tipCache = { config, step, tip: citoTip(config, step) };
  }
  return tipCache.tip;
}

export function deriveView(state) {
  const data = configData(state.config);
  return {
    ...data,
    monthly: monthlyRate(data.breakdown.total, state.equity),
    tip: tipFor(state.config, state.step),
  };
}
