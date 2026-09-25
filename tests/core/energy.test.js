import { describe, expect, it } from 'vitest';
import { ENERGY } from '../../src/data/catalog.js';
import { createDefaultConfig } from '../../src/core/config.js';
import {
  SOLAR_NOON,
  SUNRISE,
  SUNSET,
  autarkyRate,
  compassLabel,
  consumptionProfile,
  energyMetrics,
  energyStandard,
  pvPowerAt,
  sunPosition,
} from '../../src/core/energy.js';

const one = createDefaultConfig('one');

describe('autarkyRate', () => {
  it('grows with PV power and battery size', () => {
    const base = { kwp: 8, batteryKwh: 10, consumption: 5000 };
    expect(autarkyRate({ ...base, kwp: 12 })).toBeGreaterThan(autarkyRate(base));
    expect(autarkyRate({ ...base, batteryKwh: 15 })).toBeGreaterThan(autarkyRate(base));
    expect(autarkyRate({ ...base, consumption: 8000 })).toBeLessThan(autarkyRate(base));
  });

  it('is capped and handles zero consumption', () => {
    expect(autarkyRate({ kwp: 100, batteryKwh: 100, consumption: 1000, smartHome: true })).toBe(ENERGY.maxAutarky);
    expect(autarkyRate({ kwp: 8, batteryKwh: 10, consumption: 0 })).toBe(0);
  });

  it('adds a bonus for the smart energy manager', () => {
    const base = { kwp: 8, batteryKwh: 10, consumption: 5000 };
    expect(autarkyRate({ ...base, smartHome: true }) - autarkyRate(base)).toBeCloseTo(ENERGY.smartHomeAutarkyBonus, 6);
  });
});

describe('consumptionProfile', () => {
  it('adds mobility for the wallbox and saves heating energy with ventilation', () => {
    const base = consumptionProfile(one);
    expect(consumptionProfile({ ...one, wallbox: true }).total - base.total).toBe(ENERGY.wallboxKwh);
    expect(consumptionProfile({ ...one, ventilation: true }).heatPump).toBeLessThan(base.heatPump);
  });
});

describe('energyMetrics', () => {
  it('delivers plausible figures for the standard house', () => {
    const m = energyMetrics(one);
    expect(m.annualYield).toBe(8000);
    expect(m.autarky).toBeGreaterThan(0.55);
    expect(m.autarky).toBeLessThan(0.75);
    expect(m.savingsPerYear).toBeGreaterThan(1000);
    expect(m.amortisationYears).toBeGreaterThan(5);
    expect(m.amortisationYears).toBeLessThan(20);
    expect(m.selfConsumed + m.feedIn).toBeCloseTo(m.annualYield, 6);
    expect(m.co2TonsPerYear).toBeCloseTo(3.04, 2);
  });

  it('reflects the roof yield factor', () => {
    expect(energyMetrics({ ...one, roof: 'sattel' }).annualYield).toBe(7360);
    expect(energyMetrics({ ...one, roof: 'flach' }).summerDayYield).toBeCloseTo(8 * 4.6 * 0.88, 6);
  });

  it('improves autarky and savings with a bigger system', () => {
    const small = energyMetrics(one);
    const big = energyMetrics({ ...one, pv: 'max', batteryPlus: true });
    expect(big.autarky).toBeGreaterThan(small.autarky);
    expect(big.savingsPerYear).toBeGreaterThan(small.savingsPerYear);
    expect(big.batteryKwh).toBe(15);
  });
});

describe('sun simulation', () => {
  it('produces no power at night and peaks around solar noon', () => {
    expect(pvPowerAt(SUNRISE - 1, one)).toBe(0);
    expect(pvPowerAt(SUNSET + 1, one)).toBe(0);
    expect(pvPowerAt(SOLAR_NOON, one)).toBeGreaterThan(pvPowerAt(9, one));
    expect(pvPowerAt(SOLAR_NOON, one)).toBeGreaterThan(pvPowerAt(18, one));
  });

  it('integrates to the simulated summer-day yield', () => {
    let energy = 0;
    const dt = 0.01;
    for (let h = SUNRISE; h < SUNSET; h += dt) energy += pvPowerAt(h, one) * dt;
    expect(energy).toBeCloseTo(energyMetrics(one).summerDayYield, 0);
  });

  it('moves the sun from east over south to west', () => {
    expect(compassLabel(sunPosition(8).azimuth)).toBe('Ost');
    expect(sunPosition(SOLAR_NOON).azimuth).toBeCloseTo(180, 6);
    expect(sunPosition(SOLAR_NOON).elevation).toBeCloseTo(62, 6);
    expect(compassLabel(sunPosition(19.5).azimuth)).toBe('West');
    expect(sunPosition(3).elevation).toBe(0);
  });
});

describe('energyStandard', () => {
  it('reaches Effizienzhaus 40 Plus only with ventilation and energy manager', () => {
    expect(energyStandard(one)).toMatchObject({ plus: false, label: 'Effizienzhaus 40' });
    expect(energyStandard({ ...one, ventilation: true }).plus).toBe(false);
    expect(energyStandard({ ...one, ventilation: true, smartHome: true })).toMatchObject({
      plus: true,
      label: 'Effizienzhaus 40 Plus',
    });
  });
});
