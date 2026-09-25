import { describe, expect, it } from 'vitest';
import { createDefaultConfig } from '../../src/core/config.js';
import { clearSavedConfiguration, loadSavedConfiguration, safeStorage, saveConfiguration } from '../../src/services/storage.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

describe('storage', () => {
  it('saves and restores a configuration', () => {
    const storage = memoryStorage();
    const config = { ...createDefaultConfig('grande'), facade: 'klinker' };
    const result = saveConfiguration(config, storage, new Date('2026-09-25T10:00:00Z'));
    expect(result).toEqual({ ok: true, savedAt: '2026-09-25T10:00:00.000Z' });
    expect(loadSavedConfiguration(storage)).toEqual({ config, savedAt: '2026-09-25T10:00:00.000Z' });
    expect(clearSavedConfiguration(storage)).toBe(true);
    expect(loadSavedConfiguration(storage)).toBeNull();
  });

  it('handles missing, broken and full storage gracefully', () => {
    expect(saveConfiguration(createDefaultConfig(), null).ok).toBe(false);
    expect(loadSavedConfiguration(null)).toBeNull();
    const broken = memoryStorage();
    broken.setItem('citodomus.konfigurator.v1', '{kaputt');
    expect(loadSavedConfiguration(broken)).toBeNull();
    const full = { ...memoryStorage(), setItem: () => { throw new Error('QuotaExceeded'); } };
    expect(saveConfiguration(createDefaultConfig(), full)).toMatchObject({ ok: false });
    const locked = { removeItem: () => { throw new Error('denied'); } };
    expect(clearSavedConfiguration(locked)).toBe(false);
  });

  it('sanitises tampered data on load', () => {
    const storage = memoryStorage();
    storage.setItem('citodomus.konfigurator.v1', JSON.stringify({ config: { model: 'one', facade: '<script>', area: 5000 } }));
    const loaded = loadSavedConfiguration(storage);
    expect(loaded.config.facade).toBe('putz');
    expect(loaded.config.area).toBe(145);
    expect(loaded.savedAt).toBeNull();
  });

  it('returns null when no localStorage exists (node)', () => {
    expect(safeStorage()).toBeNull();
  });
});
