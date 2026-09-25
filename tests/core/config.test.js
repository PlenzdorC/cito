import { describe, expect, it } from 'vitest';
import { MODELS, PV_PACKAGES } from '../../src/data/catalog.js';
import {
  CONFIG_SCHEMA,
  applyModel,
  createDefaultConfig,
  isValidValue,
  maxRoomsForArea,
  pvAvailability,
  reconcile,
  roomAvailability,
  sanitizePatch,
  updateConfig,
} from '../../src/core/config.js';

describe('createDefaultConfig', () => {
  it('starts with the Cito One bestseller in its standard size', () => {
    const config = createDefaultConfig();
    expect(config).toMatchObject({ model: 'one', area: 145, rooms: 4, floors: 2, accessible: false });
  });

  it('produces only schema-valid values for every model', () => {
    Object.keys(MODELS).forEach((id) => {
      const config = createDefaultConfig(id);
      Object.entries(config).forEach(([key, value]) => expect(isValidValue(key, value), `${id}.${key}`).toBe(true));
      expect(Object.keys(config).sort()).toEqual(Object.keys(CONFIG_SCHEMA).sort());
    });
  });

  it('falls back to Cito One for unknown models', () => {
    expect(createDefaultConfig('palast').model).toBe('one');
  });

  it('is already consistent (reconcile changes nothing)', () => {
    Object.keys(MODELS).forEach((id) => {
      const config = createDefaultConfig(id);
      const { config: reconciled, notices } = reconcile(config);
      expect(reconciled).toEqual(config);
      expect(notices).toEqual([]);
    });
  });
});

describe('sanitizePatch', () => {
  it('drops unknown keys and invalid values', () => {
    expect(
      sanitizePatch({ facade: 'holz', roof: 'kuppel', area: 999, hacker: '<script>', raffstore: 'yes', rooms: 5 }),
    ).toEqual({ facade: 'holz', rooms: 5 });
  });

  it('returns an empty object for non-objects', () => {
    expect(sanitizePatch(null)).toEqual({});
    expect(sanitizePatch('facade=holz')).toEqual({});
  });
});

describe('applyModel', () => {
  it('takes size values from the model but keeps design choices', () => {
    const start = { ...createDefaultConfig(), facade: 'holz', frame: 'anthrazit', roof: 'sattel' };
    const { config } = applyModel(start, 'grande');
    expect(config).toMatchObject({ model: 'grande', area: 185, rooms: 5, floors: 2, facade: 'holz', frame: 'anthrazit', roof: 'sattel' });
  });

  it('makes the bungalow single-storey and barrier-free', () => {
    const { config } = applyModel(createDefaultConfig(), 'alpha');
    expect(config).toMatchObject({ floors: 1, accessible: true, area: 95, rooms: 3 });
  });

  it('does not carry the included accessibility of the bungalow over to other models', () => {
    const { config } = applyModel(createDefaultConfig('alpha'), 'one');
    expect(config.accessible).toBe(false);
  });

  it('keeps accessibility when the customer chose it explicitly', () => {
    const { config } = applyModel({ ...createDefaultConfig(), accessible: true }, 'grande');
    expect(config.accessible).toBe(true);
  });

  it('ignores unknown models', () => {
    const start = createDefaultConfig();
    expect(applyModel(start, 'palast').config).toBe(start);
  });
});

describe('reconcile', () => {
  it('clamps the area to the model range and rounds to 5 m²', () => {
    expect(reconcile({ ...createDefaultConfig(), area: 203 }).config.area).toBe(175);
    expect(reconcile({ ...createDefaultConfig('grande'), area: 163 }).config.area).toBe(165);
  });

  it('forces the bungalow to one floor with a notice', () => {
    const { config, notices } = reconcile({ ...createDefaultConfig('alpha'), floors: 2 });
    expect(config.floors).toBe(1);
    expect(notices.map((n) => n.id)).toContain('floors');
  });

  it('reduces the room count when the area is too small', () => {
    const { config, notices } = updateConfig({ ...createDefaultConfig('alpha'), rooms: 4 }, { area: 90, rooms: 5 });
    expect(config.rooms).toBe(maxRoomsForArea(90));
    expect(notices[0]).toMatchObject({ id: 'rooms', tone: 'warn' });
  });

  it('removes the second bathroom below the minimum area', () => {
    const { config, notices } = reconcile({ ...createDefaultConfig('alpha'), secondBath: true, area: 100 });
    expect(config.secondBath).toBe(false);
    expect(notices.map((n) => n.id)).toContain('secondBath');
  });

  it('downgrades the PV package when the roof is too small', () => {
    const { config, notices } = updateConfig({ ...createDefaultConfig(), pv: 'max' }, { roof: 'flach' });
    expect(PV_PACKAGES[config.pv].modules).toBeLessThan(PV_PACKAGES.max.modules);
    expect(notices.find((n) => n.id === 'pv').text).toContain('Module');
  });
});

describe('availability helpers', () => {
  it('limits rooms by area', () => {
    expect(maxRoomsForArea(60)).toBe(3);
    expect(maxRoomsForArea(95)).toBe(4);
    expect(maxRoomsForArea(210)).toBe(6);
    const rooms = roomAvailability({ area: 95 });
    expect(rooms.filter((r) => r.available).map((r) => r.rooms)).toEqual([3, 4]);
  });

  it('marks PV packages that do not fit on the roof', () => {
    const packages = pvAvailability({ ...createDefaultConfig(), roof: 'flach' });
    expect(packages.find((p) => p.id === 'basis').available).toBe(true);
    expect(packages.find((p) => p.id === 'max').available).toBe(false);
  });
});
