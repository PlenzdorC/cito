import { describe, expect, it } from 'vitest';
import { MODELS, PV_PACKAGES } from '../../src/data/catalog.js';
import { createDefaultConfig } from '../../src/core/config.js';
import {
  dimensionSummary,
  fitFlatRoof,
  fitPitchedPlane,
  houseGeometry,
  pvCapacity,
  roofPlanes,
  roofUndersideAt,
} from '../../src/core/geometry.js';

const one = createDefaultConfig('one');
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.sqrt(dot(a, a));

/** Alle gültigen Kombinationen aus Modell, Geschossen, Dach und Fläche (in 5-m²-Schritten). */
function allShapes() {
  const shapes = [];
  Object.values(MODELS).forEach((model) => {
    model.floorOptions.forEach((floors) => {
      ['pult', 'sattel', 'flach'].forEach((roof) => {
        for (let area = model.areaMin; area <= model.areaMax; area += 5) {
          shapes.push({ ...createDefaultConfig(model.id), floors, roof, area });
        }
      });
    });
  });
  return shapes;
}

describe('houseGeometry', () => {
  it('derives the reference house dimensions', () => {
    const geo = houseGeometry(one);
    expect(geo.netAreaPerFloor).toBe(72.5);
    expect(geo.inner.long * geo.inner.short).toBeCloseTo(72.5, 6);
    expect(geo.inner.long / geo.inner.short).toBeCloseTo(1.45, 6);
    expect(geo.outer.width).toBeCloseTo(10.97, 1);
    expect(geo.outer.depth).toBeCloseTo(7.79, 1);
    expect(geo.eavesHeight).toBeCloseTo(6.5, 6);
    expect(geo.floorLevels).toEqual([0.3, 3.25]);
  });

  it('turns the gable house so that the ridge runs north–south', () => {
    const geo = houseGeometry({ ...one, roof: 'sattel' });
    expect(geo.orientation).toBe('ns');
    expect(geo.outer.depth).toBeGreaterThan(geo.outer.width);
    expect(geo.totalHeight).toBeGreaterThan(geo.eavesHeight + 2);
  });

  it('computes the height of flat roofs from the parapet', () => {
    const geo = houseGeometry({ ...one, roof: 'flach' });
    expect(geo.totalHeight).toBeCloseTo(geo.eavesHeight + 0.45, 6);
    expect(roofUndersideAt(geo, 0, 0)).toBe(geo.eavesHeight);
  });

  it('keeps roof-independent reference areas for pricing', () => {
    const pult = houseGeometry(one);
    const sattel = houseGeometry({ ...one, roof: 'sattel' });
    expect(sattel.facadeArea).toBeCloseTo(pult.facadeArea, 6);
    expect(sattel.footprintArea).toBeCloseTo(pult.footprintArea, 6);
  });

  it('lets the mono-pitch roof rise towards the north', () => {
    const geo = houseGeometry(one);
    expect(roofUndersideAt(geo, 0, geo.outer.depth / 2)).toBeCloseTo(geo.eavesHeight, 6);
    expect(roofUndersideAt(geo, 0, -geo.outer.depth / 2)).toBeCloseTo(geo.eavesHeight + geo.roof.rise, 6);
  });

  it('summarises dimensions for the viewport', () => {
    const geo = houseGeometry(one);
    expect(dimensionSummary(geo)).toEqual({ width: geo.outer.width, depth: geo.outer.depth, height: geo.totalHeight });
  });
});

describe('roofPlanes', () => {
  it('returns orthonormal frames with upward normals', () => {
    ['pult', 'sattel', 'flach'].forEach((roof) => {
      roofPlanes(houseGeometry({ ...one, roof })).forEach((plane) => {
        expect(len(plane.uAxis)).toBeCloseTo(1, 6);
        expect(len(plane.vAxis)).toBeCloseTo(1, 6);
        expect(len(plane.normal)).toBeCloseTo(1, 6);
        expect(dot(plane.uAxis, plane.vAxis)).toBeCloseTo(0, 6);
        expect(dot(plane.normal, plane.vAxis)).toBeCloseTo(0, 6);
        expect(plane.normal[1]).toBeGreaterThan(0);
      });
    });
  });

  it('points the mono-pitch plane south and the gable planes east and west', () => {
    expect(roofPlanes(houseGeometry(one))[0].normal[2]).toBeGreaterThan(0);
    const [east, west] = roofPlanes(houseGeometry({ ...one, roof: 'sattel' }));
    expect(east.normal[0]).toBeGreaterThan(0);
    expect(west.normal[0]).toBeLessThan(0);
  });
});

describe('PV capacity', () => {
  it('always fits the basic 8 kWp package', () => {
    allShapes().forEach((config) => {
      expect(pvCapacity(config), `${config.model}/${config.floors}/${config.roof}/${config.area}`).toBeGreaterThanOrEqual(
        PV_PACKAGES.basis.modules,
      );
    });
  });

  it('fits the 16 kWp package on pitched roofs of the standard house but not on its green roof', () => {
    expect(pvCapacity(one)).toBeGreaterThanOrEqual(40);
    expect(pvCapacity({ ...one, roof: 'sattel' })).toBeGreaterThanOrEqual(40);
    expect(pvCapacity({ ...one, roof: 'flach' })).toBeLessThan(40);
    expect(pvCapacity({ ...one, roof: 'flach' })).toBeGreaterThanOrEqual(30);
  });

  it('picks the better module orientation', () => {
    const plane = { uLength: 11.79, vLength: 9.38 };
    const fit = fitPitchedPlane(plane, 0.35);
    expect(fit.capacity).toBe(Math.max(fit.cols * fit.rows, 0));
    expect(fit.orientation).toBe('landscape');
    expect(fitPitchedPlane({ uLength: 0.5, vLength: 0.5 }).capacity).toBe(0);
    expect(fitFlatRoof({ uLength: 0.5, vLength: 0.5 }).capacity).toBe(0);
  });
});
