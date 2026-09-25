import { describe, expect, it } from 'vitest';
import { createDefaultConfig } from '../../src/core/config.js';
import {
  doorCount,
  lineItems,
  monthlyRate,
  optionPrices,
  priceBreakdown,
  roundPrice,
  scaleFactors,
  singleStoreySurcharge,
  subtotalUntil,
} from '../../src/core/pricing.js';

const one = createDefaultConfig('one');

describe('base prices', () => {
  it('matches the catalogue price for every model in standard configuration', () => {
    expect(priceBreakdown(createDefaultConfig('alpha')).total).toBe(239000);
    expect(priceBreakdown(one).total).toBe(284900);
    expect(priceBreakdown(createDefaultConfig('grande')).total).toBe(358000);
  });

  it('calculates the advertised monthly rates', () => {
    expect(monthlyRate(284900)).toBe(1042);
    expect(monthlyRate(358000)).toBe(1310);
    expect(monthlyRate(239000)).toBe(874);
  });

  it('reduces the monthly rate by equity and never goes negative', () => {
    expect(monthlyRate(284900, 50000)).toBe(859);
    expect(monthlyRate(100000, 200000)).toBe(0);
  });
});

describe('option prices', () => {
  it('uses the catalogue prices for the reference house', () => {
    const prices = optionPrices(one);
    expect(prices.facade).toEqual({ putz: 0, holz: 4800, klinker: 6900 });
    expect(prices.frame).toEqual({ anthrazit: 1900, eiche: 3400, weiss: 0 });
    expect(prices.roof).toEqual({ pult: 0, sattel: 3800, flach: 5200 });
    expect(prices.raffstore).toBe(2900);
    expect(prices.ventilation).toBe(6900);
  });

  it('scales area-dependent upgrades with the house size', () => {
    const grande = optionPrices(createDefaultConfig('grande'));
    const alpha = optionPrices(createDefaultConfig('alpha'));
    expect(grande.facade.holz).toBeGreaterThan(4800);
    expect(grande.roof.flach).toBeGreaterThan(5200);
    expect(alpha.roof.flach).toBeGreaterThan(5200); // eingeschossig = große Dachfläche
    expect(grande.facade.holz % 50).toBe(0);
  });

  it('charges flooring per square metre', () => {
    const prices = optionPrices(one);
    expect(prices.flooring).toEqual({ vinyl: 0, parkett: roundPrice(45 * 145), feinstein: roundPrice(55 * 145) });
  });

  it('prices tall doors per interior door', () => {
    expect(doorCount(one)).toBe(8);
    expect(optionPrices(one).tallDoors).toBe(8 * 340);
  });

  it('includes barrier-free planning for the bungalow only', () => {
    expect(optionPrices(createDefaultConfig('alpha')).accessible).toBe(0);
    expect(optionPrices(one).accessible).toBe(3400);
  });

  it('keeps scale factors at 1 for the reference house', () => {
    const factors = scaleFactors(one);
    Object.values(factors).forEach((value) => expect(value).toBeCloseTo(1, 6));
  });
});

describe('priceBreakdown', () => {
  it('adds area, rooms and single-storey surcharges in step 1', () => {
    const config = { ...one, area: 150, rooms: 5, floors: 1, accessible: true };
    const { byStep, items } = priceBreakdown(config);
    expect(items.map((i) => i.id)).toEqual(expect.arrayContaining(['area', 'rooms', 'floors', 'accessible']));
    expect(byStep[1]).toBe(5 * 1850 + 1900 + singleStoreySurcharge(config) + 3400);
  });

  it('does not charge a single-storey surcharge for the bungalow', () => {
    expect(singleStoreySurcharge(createDefaultConfig('alpha'))).toBe(0);
    expect(singleStoreySurcharge(one)).toBe(0);
    expect(singleStoreySurcharge({ ...one, floors: 1 })).toBe(roundPrice(145 * 95));
  });

  it('shows below-standard areas as a reduction', () => {
    const { items } = priceBreakdown({ ...one, area: 130 });
    const area = items.find((i) => i.id === 'area');
    expect(area.amount).toBe(-15 * 1850);
    expect(area.label).toContain('−15');
  });

  it('lists main categories as included and extras only when chosen', () => {
    const ids = lineItems(one).map((i) => i.id);
    expect(ids).toEqual(['facade', 'frame', 'roof', 'pv', 'flooring', 'bath']);
    lineItems(one).forEach((item) => expect(item.included).toBe(true));
  });

  it('sums every step consistently', () => {
    const config = {
      ...one,
      facade: 'klinker',
      frame: 'eiche',
      raffstore: true,
      smartLock: true,
      canopy: true,
      roof: 'sattel',
      pv: 'plus',
      batteryPlus: true,
      wallbox: true,
      flooring: 'parkett',
      bath: 'wellness',
      secondBath: true,
      tallDoors: true,
      kitchen: true,
      ventilation: true,
      smartHome: true,
      stove: true,
    };
    const breakdown = priceBreakdown(config);
    const stepSum = Object.values(breakdown.byStep).reduce((a, b) => a + b, 0);
    expect(stepSum).toBe(breakdown.upgradesTotal);
    expect(subtotalUntil(breakdown, 5)).toBe(breakdown.total);
    expect(subtotalUntil(breakdown, 1)).toBe(breakdown.basePrice);
    expect(breakdown.items.find((i) => i.id === 'tallDoors').label).toContain('8 Stück');
    expect(breakdown.total).toBeGreaterThan(284900 + 60000);
  });

  it('describes facade colours in the line item', () => {
    const wood = lineItems({ ...one, facade: 'holz', woodTone: 'silber' }).find((i) => i.id === 'facade');
    expect(wood.label).toContain('Silbergrau');
    const brick = lineItems({ ...one, facade: 'klinker' }).find((i) => i.id === 'facade');
    expect(brick.label).toContain('Rotbunt');
  });
});
