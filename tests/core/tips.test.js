import { describe, expect, it } from 'vitest';
import { createDefaultConfig, updateConfig } from '../../src/core/config.js';
import { citoTip } from '../../src/core/tips.js';

const one = createDefaultConfig('one');

describe('citoTip', () => {
  it('greets on step 1 and shows an avatar for every step', () => {
    [1, 2, 3, 4, 5].forEach((step) => {
      const tip = citoTip(one, step);
      expect(tip.text.length).toBeGreaterThan(20);
      expect(tip.avatar).toMatch(/cito\/cito-.*\.jpg$/);
    });
    expect(citoTip(one, 1).title).toBe('CITO Bauberater');
  });

  it('recommends barrier-free planning for single-storey houses', () => {
    const tip = citoTip({ ...one, floors: 1 }, 1);
    expect(tip.action.patch).toEqual({ accessible: true });
  });

  it('suggests more area when all rooms are used', () => {
    const config = { ...one, rooms: 6 };
    expect(citoTip(config, 1).action.patch).toEqual({ area: 155 });
  });

  it('recommends window upgrades first and follows up after they are applied', () => {
    const first = citoTip(one, 2);
    expect(first.action.patch).toEqual({ frame: 'anthrazit', raffstore: true });
    const applied = updateConfig(one, first.action.patch).config;
    expect(citoTip(applied, 2).action.patch).toEqual({ canopy: true });
    expect(citoTip({ ...applied, facade: 'holz' }, 2).action.patch).toEqual({ woodTone: 'silber' });
    expect(citoTip({ ...applied, canopy: true, facade: 'klinker' }, 2).text).toContain('Klinker');
  });

  it('quantifies the benefit of more PV and walks through energy upgrades', () => {
    const pvTip = citoTip(one, 3);
    expect(pvTip.action.patch).toEqual({ pv: 'plus' });
    expect(pvTip.text).toMatch(/Autarkie von \d+/);
    const withPv = { ...one, pv: 'plus' };
    expect(citoTip(withPv, 3).action.patch).toEqual({ wallbox: true });
    expect(citoTip({ ...withPv, wallbox: true }, 3).action.patch).toEqual({ batteryPlus: true });
    expect(citoTip({ ...withPv, wallbox: true, batteryPlus: true }, 3).action).toBeNull();
  });

  it('guides to Effizienzhaus 40 Plus in step 4', () => {
    expect(citoTip(one, 4).action.patch).toEqual({ ventilation: true, smartHome: true });
    const plus = { ...one, ventilation: true, smartHome: true };
    expect(citoTip(plus, 4).action.patch).toEqual({ flooring: 'parkett' });
    expect(citoTip({ ...plus, flooring: 'parkett' }, 4).action).toBeNull();
  });

  it('falls back to step 1 rules for unknown steps', () => {
    expect(citoTip(one, 42).title).toBe('CITO Bauberater');
  });
});
