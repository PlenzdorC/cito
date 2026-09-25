import * as THREE from 'three';
import { BRICK_TONES, FRAMES, PLASTER_COLORS, WOOD_TONES } from '../data/catalog.js';
import * as T from './textures.js';

/**
 * Materialbibliothek mit Cache – Materialien werden zwischen Neuaufbauten des Hauses wiederverwendet.
 * Tag/Nacht wird über emissive Anteile (Fenster, LED) gesteuert.
 */
export function createMaterials() {
  const cache = new Map();
  const get = (key, factory) => {
    if (!cache.has(key)) cache.set(key, factory());
    return cache.get(key);
  };
  const std = (params) => new THREE.MeshStandardMaterial(params);

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x33495a,
    roughness: 0.03,
    metalness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 2.4,
    emissive: new THREE.Color(0xffc37a),
    emissiveIntensity: 0,
  });

  // Schlafräume und Bäder leuchten nachts schwächer – wirkt natürlicher.
  const glassDim = glass.clone();

  const led = std({ color: 0xfff4e0, emissive: new THREE.Color(0xffe3b0), emissiveIntensity: 0.2 });
  const screen = std({ color: 0x1b2a3a, emissive: new THREE.Color(0x4aa3ff), emissiveIntensity: 0.6, roughness: 0.3 });
  const pendant = std({ color: 0xf2e9dc, emissive: new THREE.Color(0xffd29a), emissiveIntensity: 0.15, roughness: 0.5 });
  const fire = std({ color: 0x220a02, emissive: new THREE.Color(0xff7a2a), emissiveIntensity: 1.2 });

  const lib = {
    plaster: (id) => get(`plaster-${id}`, () => std({ color: PLASTER_COLORS[id].hex, map: T.plasterTexture(), roughness: 0.94 })),
    wood: (id) => get(`wood-${id}`, () => std({ color: WOOD_TONES[id].hex, map: T.woodCladdingTexture(), roughness: 0.82 })),
    brick: (id) => get(`brick-${id}`, () => std({ map: T.brickTexture(BRICK_TONES[id].hex), roughness: 0.9 })),

    /** Fassadenmaterial je Geschossband (0 = EG, 1 = OG bzw. Dachgeschoss). */
    facade(config, level) {
      if (config.facade === 'holz') return lib.wood(config.woodTone);
      if (config.facade === 'klinker' && (level === 0 || config.floors === 1)) return lib.brick(config.brickTone);
      return lib.plaster(config.plasterColor);
    },

    frame: (id) =>
      get(`frame-${id}`, () => {
        if (id === 'eiche') return std({ color: FRAMES.eiche.hex, map: T.woodCladdingTexture(), roughness: 0.6 });
        if (id === 'anthrazit') return std({ color: FRAMES.anthrazit.hex, roughness: 0.42, metalness: 0.55 });
        return std({ color: 0xf6f5f1, roughness: 0.35 });
      }),
    door: (frameId) =>
      get(`door-${frameId}`, () =>
        frameId === 'eiche'
          ? std({ color: 0x9c7147, map: T.woodCladdingTexture(), roughness: 0.55 })
          : std({ color: 0x2f3337, roughness: 0.4, metalness: 0.5 }),
      ),
    glass,
    glassDim,
    lamella: get('lamella', () => std({ map: T.lamellaTexture(), roughness: 0.5, metalness: 0.4 })),
    led,
    screen,
    pendant,
    fire,
    roof: get('roof', () => std({ map: T.roofSeamTexture(), roughness: 0.55, metalness: 0.5 })),
    soffit: get('soffit', () => std({ color: 0xe9e6e0, roughness: 0.8 })),
    plinth: get('plinth', () => std({ color: 0x55585b, roughness: 0.85 })),
    trim: get('trim', () => std({ color: 0x33373b, roughness: 0.4, metalness: 0.6 })),
    steel: get('steel', () => std({ color: 0xc9ccd0, roughness: 0.25, metalness: 0.9 })),
    pvFrame: get('pv-frame', () => std({ color: 0x111418, roughness: 0.35, metalness: 0.6 })),
    pv: (cellsU, cellsV) =>
      get(`pv-${cellsU}-${cellsV}`, () =>
        new THREE.MeshPhysicalMaterial({
          map: T.pvTexture(cellsU, cellsV),
          roughness: 0.22,
          metalness: 0.15,
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          envMapIntensity: 1.1,
        }),
      ),
    sedum: get('sedum', () => std({ map: T.sedumTexture(), roughness: 1 })),
    grass: get('grass', () => std({ map: T.grassTexture(), alphaMap: T.groundFadeTexture(), transparent: true, roughness: 1, depthWrite: false })),
    paving: get('paving', () => std({ map: T.pavingTexture(), roughness: 0.9 })),
    gravel: get('gravel', () => std({ map: T.gravelTexture(), roughness: 1 })),
    asphalt: get('asphalt', () => std({ color: 0x5d5f61, roughness: 0.95 })),
    trunk: get('trunk', () => std({ color: 0x6b5443, roughness: 0.95 })),
    leaves: (variant) =>
      get(`leaves-${variant}`, () =>
        std({ color: [0x6f8f4f, 0x5d7e45, 0x86a05f][variant % 3], roughness: 0.9, flatShading: true }),
      ),
    hedge: get('hedge', () => std({ color: 0x55743f, roughness: 0.95, flatShading: true })),
    appliance: get('appliance', () => std({ color: 0xe4e6e8, roughness: 0.5, metalness: 0.1 })),
    darkPlastic: get('dark-plastic', () => std({ color: 0x2a2d30, roughness: 0.6 })),
    carBody: get('car-body', () => std({ color: 0x9d3e1a, roughness: 0.28, metalness: 0.65 })),
    carGlass: get('car-glass', () => std({ color: 0x1e2830, roughness: 0.08, metalness: 0.3 })),
    tire: get('tire', () => std({ color: 0x1d1e20, roughness: 0.9 })),
    chimney: get('chimney', () => std({ color: 0xb9bcc0, roughness: 0.3, metalness: 0.85 })),

    // Innenraum
    floor: (id) => get(`floor-${id}`, () => std({ map: T.floorTexture(id), roughness: id === 'feinstein' ? 0.5 : 0.62 })),
    interiorWall: get('interior-wall', () => std({ color: 0xf5f2ec, roughness: 0.95 })),
    oak: get('oak', () => std({ color: 0xb7875a, map: T.woodCladdingTexture(), roughness: 0.6 })),
    fabric: get('fabric', () => std({ color: 0x8a8580, roughness: 1 })),
    fabricAccent: get('fabric-accent', () => std({ color: 0xbd5630, roughness: 1 })),
    rug: get('rug', () => std({ color: 0xd8cfc0, roughness: 1 })),
    kitchenFront: get('kitchen-front', () => std({ color: 0x3a3e42, roughness: 0.45, metalness: 0.2 })),
    countertop: get('countertop', () => std({ color: 0xe8e4dc, roughness: 0.3 })),
    stoveBody: get('stove-body', () => std({ color: 0x1c1d1f, roughness: 0.55, metalness: 0.4 })),
    interiorGlass: get(
      'interior-glass',
      () => new THREE.MeshPhysicalMaterial({ color: 0xe3eef3, transparent: true, opacity: 0.16, roughness: 0.04, depthWrite: false }),
    ),
    plantPot: get('plant-pot', () => std({ color: 0xb5643f, roughness: 0.8 })),
    white: get('white', () => std({ color: 0xf7f6f3, roughness: 0.45 })),
    outline: get('outline', () => new THREE.MeshBasicMaterial({ color: 0xd96b43, transparent: true, opacity: 0.7 })),

    /** Nachtmodus: Fenster leuchten warm, LED-Spots und Pendelleuchten gehen an. */
    setNight(isNight) {
      glass.emissiveIntensity = isNight ? 0.85 : 0;
      glassDim.emissiveIntensity = isNight ? 0.22 : 0;
      led.emissiveIntensity = isNight ? 3 : 0.2;
      pendant.emissiveIntensity = isNight ? 2.2 : 0.15;
      screen.emissiveIntensity = isNight ? 1.4 : 0.6;
    },

    /** Schnittansicht: Clipping-Ebenen für alle Hausmaterialien setzen. */
    setClipping(materials, planes) {
      materials.forEach((material) => {
        material.clippingPlanes = planes;
        material.clipShadows = planes.length > 0;
        material.side = planes.length > 0 ? THREE.DoubleSide : THREE.FrontSide;
        material.needsUpdate = true;
      });
    },
  };
  return lib;
}
