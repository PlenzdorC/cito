import * as THREE from 'three';
import { placeOnWall, wallFrame, wallToWorld } from './frames.js';

/**
 * Fenster, Haustür, Raffstore, Vordach und SmartScan – jeweils im wandlokalen Koordinatensystem.
 * z: 0 = Innenfläche, t = Außenfläche der Wand.
 */

const FRAME = 0.07;
const FRAME_DEPTH = 0.09;
const INSET = 0.12;
const DIM_ROOMS = new Set(['eltern', 'kind1', 'kind2', 'kind3', 'kind', 'bad', 'dusche', 'wc']);

function mesh(geometry, material, shadow = true) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function boxAt(w, h, d, material, x, y, z, shadow = true) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), material, shadow);
  m.position.set(x, y, z);
  return m;
}

/** Rahmen als Ring mit Pfosten für mehrteilige Verglasung. */
function frameMesh(width, height, panes, material) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(width, 0);
  shape.lineTo(width, height);
  shape.lineTo(0, height);
  shape.closePath();
  const paneWidth = (width - FRAME * (panes + 1)) / panes;
  for (let i = 0; i < panes; i++) {
    const x0 = FRAME + i * (paneWidth + FRAME);
    const hole = new THREE.Path();
    hole.moveTo(x0, FRAME);
    hole.lineTo(x0, height - FRAME);
    hole.lineTo(x0 + paneWidth, height - FRAME);
    hole.lineTo(x0 + paneWidth, FRAME);
    hole.closePath();
    shape.holes.push(hole);
  }
  return mesh(new THREE.ExtrudeGeometry(shape, { depth: FRAME_DEPTH, bevelEnabled: false, curveSegments: 1 }), material);
}

function windowUnit(o, t, config, materials) {
  const group = new THREE.Group();
  const x0 = o.x - o.width / 2;
  const zBack = t - INSET - FRAME_DEPTH;
  const frame = frameMesh(o.width, o.height, o.panes, materials.frame(config.frame));
  frame.position.set(x0, o.y, zBack);
  const glass = boxAt(o.width - 2 * FRAME, o.height - 2 * FRAME, 0.012, DIM_ROOMS.has(o.roomId) ? materials.glassDim : materials.glass, o.x, o.y + o.height / 2, zBack + FRAME_DEPTH / 2, false);
  group.add(frame, glass);

  if (o.y - 0.3 > 0.2 && o.kind !== 'sidelight') {
    // Außenfensterbank
    group.add(boxAt(o.width + 0.08, 0.03, INSET + 0.06, materials.trim, o.x, o.y - 0.015, t - INSET / 2 + 0.03));
  }
  if (config.raffstore && o.kind !== 'sidelight') {
    const drop = o.height * 0.28;
    group.add(boxAt(o.width, 0.12, 0.1, materials.trim, o.x, o.y + o.height - 0.06, t - 0.06));
    const lamella = boxAt(o.width - 0.02, drop, 0.02, materials.lamella, o.x, o.y + o.height - 0.12 - drop / 2, t - 0.07, false);
    group.add(lamella);
  }
  return group;
}

function doorUnit(o, t, config, materials) {
  const group = new THREE.Group();
  const zBack = t - INSET - FRAME_DEPTH;
  const frame = frameMesh(o.width, o.height + FRAME, 1, materials.frame(config.frame));
  frame.position.set(o.x - o.width / 2, o.y - FRAME, zBack);
  const leaf = boxAt(o.width - 2 * FRAME, o.height - FRAME, 0.07, materials.door(config.frame), o.x, o.y + (o.height - FRAME) / 2, zBack + FRAME_DEPTH / 2);
  const slit = boxAt(0.12, 1.5, 0.075, materials.glass, o.x - o.width / 2 + 0.28, o.y + 1.15, zBack + FRAME_DEPTH / 2, false);
  const handle = mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.1, 10), materials.steel);
  handle.position.set(o.x + o.width / 2 - 0.2, o.y + 1.05, t - INSET + 0.05);
  group.add(frame, leaf, slit, handle);
  if (config.smartLock) {
    group.add(boxAt(0.09, 0.16, 0.03, materials.trim, o.x + o.width / 2 + 0.16, o.y + 1.1, t + 0.015));
    group.add(boxAt(0.055, 0.07, 0.01, materials.screen, o.x + o.width / 2 + 0.16, o.y + 1.13, t + 0.032, false));
  }
  return group;
}

/** Freitragendes Vordach mit LED-Spots über der Haustür. */
function canopyUnit(door, t, materials, spotLights) {
  const group = new THREE.Group();
  const width = door.width + 1.6;
  const depth = 1.35;
  const y = door.y + door.height + 0.35;
  group.add(boxAt(width, 0.14, depth, materials.trim, door.x, y, t + depth / 2));
  [-0.45, 0, 0.45].forEach((dx) => {
    const spot = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.01, 16), materials.led, false);
    spot.position.set(door.x + dx * width * 0.5, y - 0.075, t + depth * 0.55);
    group.add(spot);
  });
  const light = new THREE.SpotLight(0xffd9a0, 0, 7, Math.PI / 3.2, 0.6, 1.6);
  light.position.set(door.x, y - 0.1, t + depth * 0.55);
  light.target.position.set(door.x, 0, t + depth * 0.7);
  group.add(light, light.target);
  spotLights.push(light);
  return group;
}

/**
 * Baut alle Öffnungen und liefert Weltpositionen für Hotspots.
 * @returns {{ group: THREE.Group, anchors: object, spotLights: THREE.SpotLight[] }}
 */
export function buildOpenings(config, geo, openings, materials) {
  const group = new THREE.Group();
  group.name = 'openings';
  const t = geo.wallThickness;
  const spotLights = [];
  const anchors = {};
  const byWall = new Map();
  openings.forEach((o) => {
    if (!byWall.has(o.wall)) byWall.set(o.wall, []);
    byWall.get(o.wall).push(o);
  });
  byWall.forEach((list, wall) => {
    const frame = wallFrame(geo, wall);
    const wallGroup = placeOnWall(new THREE.Group(), frame);
    list.forEach((o) => {
      if (o.kind === 'door') {
        wallGroup.add(doorUnit(o, t, config, materials));
        if (config.canopy) wallGroup.add(canopyUnit(o, t, materials, spotLights));
        anchors.door = { position: wallToWorld(frame, o.x, o.y + 1.3, t + 0.15), normal: frame.normal.clone() };
      } else {
        wallGroup.add(windowUnit(o, t, config, materials));
      }
    });
    group.add(wallGroup);
  });
  const hero = openings.find((o) => o.kind === 'panorama') ?? openings.find((o) => o.kind !== 'door');
  if (hero) {
    const frame = wallFrame(geo, hero.wall);
    anchors.window = { position: wallToWorld(frame, hero.x, hero.y + hero.height * 0.55, t + 0.1), normal: frame.normal.clone() };
  }
  return { group, anchors, spotLights };
}
