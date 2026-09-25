import * as THREE from 'three';
import { WALLS, placeOnWall, wallFrame } from './frames.js';

/**
 * Außenwände als extrudierte Formen mit echten Fensteröffnungen.
 * Bei zwei Geschossen wird jede Wand in ein EG- und ein OG-Band geteilt (z. B. Klinker unten, Putz oben).
 */

const toRad = (deg) => (deg * Math.PI) / 180;

/** Umriss einer Wand (wandlokal): [x0,0], [x1,0], danach Oberkante von rechts nach links. */
export function wallOutline(geo, wall) {
  const t = geo.wallThickness;
  const { roof, eavesHeight: eaves, outer } = geo;
  const long = wall === 'S' || wall === 'N';
  const x0 = long ? 0 : t;
  const x1 = long ? outer.width : outer.depth - t;
  const tan = Math.tan(toRad(roof.pitch));
  let top;
  if (roof.type === 'flach') {
    const h = eaves + roof.parapet;
    top = [[x1, h], [x0, h]];
  } else if (roof.type === 'pult') {
    const h = { S: () => eaves, N: () => eaves + outer.depth * tan, E: (x) => eaves + x * tan, W: (x) => eaves + (outer.depth - x) * tan }[wall];
    top = [[x1, h(x1)], [x0, h(x0)]];
  } else if (long) {
    // Satteldach: Nord- und Südwand sind Giebel
    top = [[x1, eaves], [(x0 + x1) / 2, eaves + (outer.width / 2) * tan], [x0, eaves]];
  } else {
    top = [[x1, eaves], [x0, eaves]];
  }
  return { x0, x1, points: [[x0, 0], [x1, 0], ...top] };
}

function shapeFromPoints(points) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  return shape;
}

function addHoles(shape, openings) {
  openings.forEach((o) => {
    const hole = new THREE.Path();
    const x0 = o.x - o.width / 2;
    const x1 = o.x + o.width / 2;
    hole.moveTo(x0, o.y);
    hole.lineTo(x0, o.y + o.height);
    hole.lineTo(x1, o.y + o.height);
    hole.lineTo(x1, o.y);
    hole.closePath();
    shape.holes.push(hole);
  });
  return shape;
}

/** Teilt den Wandumriss in Geschossbänder (unten Rechteck, oben Rest inkl. Giebel/Schräge). */
export function wallBands(outline, split) {
  if (split === null) return [{ level: 0, points: outline.points }];
  const { x0, x1, points } = outline;
  const top = points.slice(2);
  return [
    { level: 0, points: [[x0, 0], [x1, 0], [x1, split], [x0, split]] },
    { level: 1, points: [[x0, split], [x1, split], ...top] },
  ];
}

function extrudedWall(points, openings, depth, material) {
  const geometry = new THREE.ExtrudeGeometry(addHoles(shapeFromPoints(points), openings), { depth, bevelEnabled: false, curveSegments: 1 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Sockel, Geschossband-Profil und Eckprofile. */
function details(config, geo, materials, split) {
  const group = new THREE.Group();
  const W = geo.outer.width;
  const D = geo.outer.depth;
  const proud = 0.02;
  const h = geo.plinthHeight;
  const ring = (y, height, material, extra = 0) => {
    const south = box(W + 2 * (proud + extra), height, proud * 2 + extra, material);
    south.position.set(0, y, D / 2);
    const north = south.clone();
    north.position.z = -D / 2;
    const east = box(proud * 2 + extra, height, D + 2 * (proud + extra), material);
    east.position.set(W / 2, y, 0);
    const west = east.clone();
    west.position.x = -W / 2;
    group.add(south, north, east, west);
  };
  ring(h / 2, h, materials.plinth);
  if (split !== null && config.facade === 'klinker') ring(split, 0.05, materials.trim, 0.01);
  if (config.facade === 'holz') {
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
      const x = (sx * W) / 2;
      const z = (sz * D) / 2;
      const height = geo.roof.type === 'pult' ? geo.eavesHeight + (D / 2 - z) * Math.tan(toRad(geo.roof.pitch)) : geo.roof.type === 'flach' ? geo.eavesHeight + geo.roof.parapet : geo.eavesHeight;
      const trim = box(0.07, height - h, 0.07, materials.trim);
      trim.position.set(x, h + (height - h) / 2, z);
      group.add(trim);
    });
  }
  return group;
}

export function buildWalls(config, geo, openings, materials) {
  const group = new THREE.Group();
  group.name = 'walls';
  const split = geo.floors === 2 ? geo.floorLevels[1] - 0.15 : null;
  WALLS.forEach((wall) => {
    const frame = wallFrame(geo, wall);
    const wallGroup = placeOnWall(new THREE.Group(), frame);
    wallGroup.name = `wall-${wall}`;
    wallBands(wallOutline(geo, wall), split).forEach((band) => {
      const bandOpenings = openings.filter((o) => o.wall === wall && (split === null || o.floor === band.level));
      wallGroup.add(extrudedWall(band.points, bandOpenings, geo.wallThickness, materials.facade(config, band.level)));
    });
    group.add(wallGroup);
  });
  group.add(details(config, geo, materials, split));
  return group;
}
