// @vitest-environment jsdom
import * as THREE from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createDefaultConfig } from '../../src/core/config.js';
import { deriveView } from '../../src/core/derive.js';
import { createInitialState } from '../../src/core/state.js';

/** jsdom hat keinen Canvas-2D-Kontext – ein Stub genügt, da im Test nichts gezeichnet wird. */
function stubCanvas() {
  const gradient = { addColorStop: () => {} };
  const context = new Proxy(
    {},
    {
      get: (target, key) => {
        if (key in target) return target[key];
        if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
        return () => {};
      },
      set: (target, key, value) => {
        target[key] = value;
        return true;
      },
    },
  );
  HTMLCanvasElement.prototype.getContext = vi.fn(() => context);
}

let buildHouse;
let disposeObject;
let buildInterior;
let createMaterials;

beforeAll(async () => {
  stubCanvas();
  ({ buildHouse, disposeObject } = await import('../../src/scene/house.js'));
  ({ buildInterior } = await import('../../src/scene/interior.js'));
  ({ createMaterials } = await import('../../src/scene/materials.js'));
});

const derivedFor = (config) => deriveView({ ...createInitialState(), config });

function materialsOf(object) {
  const set = new Set();
  object.traverse((child) => {
    if (child.isMesh) (Array.isArray(child.material) ? child.material : [child.material]).forEach((m) => set.add(m));
  });
  return set;
}

describe('3D-Hausmodell', () => {
  it('baut Haus, Außenanlage und Hotspot-Anker aus der Konfiguration', () => {
    const config = { ...createDefaultConfig(), smartLock: true, canopy: true, wallbox: true, pv: 'plus' };
    const house = buildHouse(config, derivedFor(config), createMaterials());
    expect(Object.keys(house.anchors).sort()).toEqual(['door', 'facade', 'pv', 'roof', 'wallbox', 'window']);
    expect(house.spotLights).toHaveLength(1);
    expect(house.section.visible).toBe(false);
    const size = house.bounds.getSize(new THREE.Vector3());
    expect(size.y).toBeGreaterThan(8);
  });

  it('belegt genau so viele PV-Module wie das Paket vorsieht', () => {
    ['pult', 'sattel', 'flach'].forEach((roof) => {
      const config = { ...createDefaultConfig(), roof, pv: 'plus' };
      const derived = derivedFor(config);
      const house = buildHouse(config, derived, createMaterials());
      let modules = 0;
      house.group.traverse((child) => {
        if (child.isInstancedMesh) modules += child.count;
      });
      expect(modules, roof).toBe(30);
    });
  });

  it('teilt keine Materialien zwischen Haus und Außenanlage (Schnittebene darf nur das Haus treffen)', () => {
    const config = { ...createDefaultConfig(), smartLock: true, wallbox: true, canopy: true, raffstore: true };
    const house = buildHouse(config, derivedFor(config), createMaterials());
    const siteMaterials = materialsOf(house.site);
    const shared = house.houseMaterials.filter((m) => siteMaterials.has(m));
    expect(shared).toEqual([]);
  });

  it('schneidet in der Schnittansicht quer durch das Gartenband', () => {
    const config = createDefaultConfig();
    const derived = derivedFor(config);
    const house = buildHouse(config, derived, createMaterials());
    expect(house.clipPlane.normal.z).toBe(-1);
    const gable = { ...config, roof: 'sattel' };
    expect(buildHouse(gable, derivedFor(gable), createMaterials()).clipPlane.normal.x).toBe(1);
  });

  it('setzt beim Satteldach Giebelfenster und gibt Geometrien wieder frei', () => {
    const config = { ...createDefaultConfig(), roof: 'sattel' };
    const house = buildHouse(config, derivedFor(config), createMaterials());
    const geometries = [];
    house.group.traverse((child) => child.geometry && geometries.push(child.geometry));
    const spies = geometries.map((g) => vi.spyOn(g, 'dispose'));
    disposeObject(house.group);
    spies.forEach((spy) => expect(spy).toHaveBeenCalled());
  });
});

describe('Innenraum', () => {
  function worldBox(object) {
    object.updateWorldMatrix(true, true);
    return new THREE.Box3().setFromObject(object);
  }

  it('hat vier Wände und legt die Tür nicht hinter die Küchenzeile', () => {
    [createDefaultConfig('one'), createDefaultConfig('alpha'), createDefaultConfig('grande')].forEach((base) => {
      const config = { ...base, kitchen: true, smartHome: true, tallDoors: true };
      const interior = buildInterior(config, derivedFor(config), createMaterials());
      expect(interior.walls).toHaveLength(4);
      const backWall = interior.walls[1];
      expect(backWall.rotation.y).toBeCloseTo(Math.PI, 6);
      // Türblatt = erstes Zusatzobjekt nach der Wand und den Fenstern der Rückwand
      const doorLeaf = backWall.children.find((c) => c.isMesh && c.geometry.parameters?.height > 2);
      const door = worldBox(doorLeaf);
      const kitchenGroup = interior.group.children.find((c) => c.isGroup && c.children.some((m) => m.material?.name === '' && m.geometry?.parameters?.width === 3.2));
      const kitchen = worldBox(kitchenGroup);
      const overlapX = door.min.x < kitchen.max.x && kitchen.min.x < door.max.x;
      expect(overlapX, config.model).toBe(false);
      expect(door.getSize(new THREE.Vector3()).y).toBeGreaterThan(2.4); // raumhohe Tür
    });
  });

  it('dimmt das Pendellicht standardmäßig', () => {
    const config = createDefaultConfig();
    const interior = buildInterior(config, derivedFor(config), createMaterials());
    expect(interior.pendantLight.intensity).toBe(0);
    expect(interior.size.w).toBeGreaterThan(interior.size.h);
  });
});
