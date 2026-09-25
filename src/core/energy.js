import { ENERGY, ENERGY_EXTRAS, PV_PACKAGES, ROOFS } from '../data/catalog.js';

/** Sommertag (Juni, ~51° N): Sonnenaufgang/-untergang in Ortszeit (MESZ). */
export const SUNRISE = 5;
export const SUNSET = 21.5;
export const SOLAR_NOON = (SUNRISE + SUNSET) / 2;
const MAX_ELEVATION = 62;
// ∫₀¹ sin³(πx) dx = 4 / (3π) – normiert die Tageskurve auf den Tagesertrag.
const SIN3_INTEGRAL = 4 / (3 * Math.PI);

/**
 * Autarkiegrad als Funktion von PV-Leistung und Speicher je MWh Verbrauch
 * (angenähert an typische Kennlinien für Einfamilienhäuser mit Wärmepumpe).
 */
export function autarkyRate({ kwp, batteryKwh, consumption, smartHome = false }) {
  if (consumption <= 0) return 0;
  const mwh = consumption / 1000;
  const pvRatio = kwp / mwh;
  const batteryRatio = batteryKwh / mwh;
  const ceiling = 0.35 + 0.63 * (1 - Math.exp(-batteryRatio));
  const base = ceiling * (1 - Math.exp(-pvRatio / 1.2));
  return Math.min(ENERGY.maxAutarky, base + (smartHome ? ENERGY.smartHomeAutarkyBonus : 0));
}

/** Jahresstromverbrauch aufgeschlüsselt (kWh). */
export function consumptionProfile(config) {
  const persons = Math.max(2, config.rooms);
  const household = ENERGY.householdBase + ENERGY.householdPerPerson * persons;
  const heatingFactor = config.ventilation ? 1 - ENERGY.ventilationHeatSaving : 1;
  const heating = (config.area * ENERGY.heatingDemandPerSqm * heatingFactor) / ENERGY.scop;
  const hotWater = (persons * ENERGY.hotWaterPerPerson) / ENERGY.hotWaterCop;
  const ventilation = config.ventilation ? ENERGY.ventilationFanKwh : 0;
  const mobility = config.wallbox ? ENERGY.wallboxKwh : 0;
  const heatPump = heating + hotWater;
  return {
    persons,
    household,
    heatPump,
    ventilation,
    mobility,
    total: household + heatPump + ventilation + mobility,
  };
}

/** Kennzahlen für Autarkie, Ertrag, Ersparnis und CO₂ (Richtwerte). */
export function energyMetrics(config) {
  const pv = PV_PACKAGES[config.pv];
  const roof = ROOFS[config.roof];
  const usage = consumptionProfile(config);
  const batteryKwh = config.batteryPlus ? ENERGY.plusBatteryKwh : ENERGY.baseBatteryKwh;
  const annualYield = pv.kwp * ENERGY.specificYield * roof.yieldFactor;
  const autarky = autarkyRate({ kwp: pv.kwp, batteryKwh, consumption: usage.total, smartHome: config.smartHome });
  const selfConsumed = Math.min(autarky * usage.total, annualYield);
  const feedIn = Math.max(0, annualYield - selfConsumed);
  const savingsPerYear = selfConsumed * ENERGY.gridPrice + feedIn * ENERGY.feedInTariff;
  const systemValue =
    ENERGY.pvSystemBaseValue + pv.price + (config.batteryPlus ? ENERGY_EXTRAS.batteryPlus.price : 0);
  return {
    kwp: pv.kwp,
    modules: pv.modules,
    batteryKwh,
    yieldFactor: roof.yieldFactor,
    annualYield,
    consumption: usage.total,
    usage,
    autarky,
    selfConsumed,
    feedIn,
    savingsPerYear,
    amortisationYears: systemValue / savingsPerYear,
    co2TonsPerYear: (annualYield * ENERGY.co2PerKwh) / 1000,
    summerDayYield: pv.kwp * ENERGY.summerDayYieldPerKwp * roof.yieldFactor,
    heatingCostPerYear: usage.heatPump * ENERGY.heatPumpTariff * (1 - 0.3 * autarky),
  };
}

/** PV-Leistung (kW) zu einer Uhrzeit an einem sonnigen Sommertag. */
export function pvPowerAt(hour, config) {
  const x = (hour - SUNRISE) / (SUNSET - SUNRISE);
  if (x <= 0 || x >= 1) return 0;
  const pv = PV_PACKAGES[config.pv];
  const peakPerKwp = ENERGY.summerDayYieldPerKwp / ((SUNSET - SUNRISE) * SIN3_INTEGRAL);
  return pv.kwp * ROOFS[config.roof].yieldFactor * peakPerKwp * Math.sin(Math.PI * x) ** 3;
}

/** Vereinfachter Sonnenstand am 21. Juni (Azimut von Nord im Uhrzeigersinn, Elevation in Grad). */
export function sunPosition(hour) {
  const x = Math.min(1, Math.max(0, (hour - SUNRISE) / (SUNSET - SUNRISE)));
  return {
    azimuth: 50 + x * 260,
    elevation: Math.max(0, MAX_ELEVATION * Math.sin(Math.PI * x)),
  };
}

export function compassLabel(azimuth) {
  if (azimuth < 135) return 'Ost';
  if (azimuth <= 225) return 'Süd';
  return 'West';
}

/** Effizienzhaus-Einstufung mit Checkliste für „40 Plus“. */
export function energyStandard(config) {
  const checks = [
    { id: 'pv', label: 'Photovoltaik-Anlage', ok: true },
    { id: 'battery', label: 'Batteriespeicher', ok: true },
    { id: 'ventilation', label: 'Lüftung mit Wärmerückgewinnung', ok: config.ventilation },
    { id: 'smartHome', label: 'Energiemanager & Visualisierung', ok: config.smartHome },
  ];
  const plus = checks.every((check) => check.ok);
  return { label: plus ? 'Effizienzhaus 40 Plus' : 'Effizienzhaus 40', plus, checks };
}
