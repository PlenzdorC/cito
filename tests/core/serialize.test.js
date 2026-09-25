import { describe, expect, it } from 'vitest';
import { createDefaultConfig } from '../../src/core/config.js';
import { configId, decodeConfig, encodeConfig, hashString } from '../../src/core/serialize.js';

const one = createDefaultConfig('one');

describe('encodeConfig / decodeConfig', () => {
  it('stores only the model for a standard configuration', () => {
    expect(encodeConfig(one)).toBe('m=one');
    expect(encodeConfig(one, { step: 3 })).toBe('m=one&s=3');
  });

  it('round-trips every kind of value', () => {
    const config = {
      ...createDefaultConfig('grande'),
      area: 200,
      rooms: 6,
      floors: 1,
      facade: 'holz',
      woodTone: 'silber',
      raffstore: true,
      roof: 'sattel',
      pv: 'max',
      wallbox: true,
      flooring: 'feinstein',
      stove: true,
    };
    const encoded = encodeConfig(config, { step: 4 });
    const decoded = decodeConfig(`#${encoded}`);
    expect(decoded.config).toEqual(config);
    expect(decoded.step).toBe(4);
  });

  it('ignores unknown keys, invalid values and injection attempts', () => {
    const decoded = decodeConfig('m=one&fa=<img src=x>&rs=maybe&zz=1&a=9999&r=5&s=9');
    expect(decoded.config).toEqual({ ...one, rooms: 5 });
    expect(decoded.step).toBeNull();
  });

  it('rejects inputs without a valid model or with absurd length', () => {
    expect(decodeConfig('fa=holz')).toBeNull();
    expect(decodeConfig('m=palast')).toBeNull();
    expect(decodeConfig('')).toBeNull();
    expect(decodeConfig(undefined)).toBeNull();
    expect(decodeConfig(`m=one&x=${'a'.repeat(2000)}`)).toBeNull();
  });

  it('applies the configuration rules while decoding', () => {
    const decoded = decodeConfig('m=one&ro=flach&pv=max');
    expect(decoded.config.pv).not.toBe('max');
  });
});

describe('configId', () => {
  it('is deterministic and changes with the configuration', () => {
    expect(configId(one, 2026)).toMatch(/^CTD-2026-[0-9A-Z]{5}$/);
    expect(configId(one, 2026)).toBe(configId({ ...one }, 2026));
    expect(configId({ ...one, facade: 'holz' }, 2026)).not.toBe(configId(one, 2026));
  });

  it('uses the FNV-1a hash', () => {
    expect(hashString('')).toBe(0x811c9dc5);
    expect(hashString('a')).toBe(0xe40c292c);
  });
});
