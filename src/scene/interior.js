import * as THREE from 'three';

/**
 * Innenraum „Wohnen · Essen · Kochen“ als Puppenhaus-Ansicht (ohne Decke, kameraseitige Wände werden ausgeblendet).
 * Maße, Fenster, Bodenbelag, Küche, Kaminofen, Türen und Smart Home folgen der Konfiguration.
 */

const HEIGHT = 2.6;
const WALL = 0.18;

function mesh(geometry, material, cast = true) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

function box(w, h, d, material, x, y, z, cast = true) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), material, cast);
  m.position.set(x, y, z);
  return m;
}

/** Wand als extrudierte Fläche (lokal: x entlang der Wand, y hoch) mit Öffnungen. */
function wallWithOpenings(length, openings, material) {
  const shape = new THREE.Shape();
  shape.moveTo(-length / 2, 0);
  shape.lineTo(length / 2, 0);
  shape.lineTo(length / 2, HEIGHT);
  shape.lineTo(-length / 2, HEIGHT);
  shape.closePath();
  openings.forEach((o) => {
    const hole = new THREE.Path();
    hole.moveTo(o.x - o.width / 2, o.y);
    hole.lineTo(o.x - o.width / 2, o.y + o.height);
    hole.lineTo(o.x + o.width / 2, o.y + o.height);
    hole.lineTo(o.x + o.width / 2, o.y);
    hole.closePath();
    shape.holes.push(hole);
  });
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: WALL, bevelEnabled: false, curveSegments: 1 });
  geometry.translate(0, 0, -WALL / 2);
  return mesh(geometry, material);
}

function windowFill(o, materials, frameMaterial) {
  const group = new THREE.Group();
  const f = 0.06;
  group.add(box(o.width, f, 0.08, frameMaterial, o.x, o.y + f / 2, 0));
  group.add(box(o.width, f, 0.08, frameMaterial, o.x, o.y + o.height - f / 2, 0));
  const panes = Math.max(1, o.panes);
  for (let i = 0; i <= panes; i++) {
    group.add(box(f, o.height, 0.08, frameMaterial, o.x - o.width / 2 + f / 2 + (i * (o.width - f)) / panes, o.y + o.height / 2, 0));
  }
  group.add(box(o.width - f, o.height - f, 0.01, materials.interiorGlass, o.x, o.y + o.height / 2, 0, false));
  return group;
}

/** Wandgruppe; lokal +z und `normal` zeigen nach außen. */
function wallGroup({ length, openings, position, rotationY, normal, materials, frameMaterial }) {
  const group = new THREE.Group();
  group.add(wallWithOpenings(length, openings, materials.interiorWall));
  openings.filter((o) => o.kind !== 'door').forEach((o) => group.add(windowFill(o, materials, frameMaterial)));
  group.position.copy(position);
  group.rotation.y = rotationY;
  group.userData.normal = normal;
  return group;
}

function sofa(materials, x, z) {
  const g = new THREE.Group();
  g.add(box(2.5, 0.42, 0.95, materials.fabric, 0, 0.21, 0));
  g.add(box(2.5, 0.45, 0.22, materials.fabric, 0, 0.62, -0.37));
  g.add(box(0.95, 0.42, 1.2, materials.fabric, -0.78, 0.21, 0.95));
  [-0.45, 0.35].forEach((dx) => g.add(box(0.5, 0.38, 0.14, materials.fabricAccent, dx, 0.62, -0.2)));
  g.position.set(x, 0, z);
  return g;
}

function diningSet(materials, x, z, chairsPerSide) {
  const g = new THREE.Group();
  const length = chairsPerSide === 3 ? 2.1 : 1.5;
  g.add(box(length, 0.05, 0.95, materials.oak, 0, 0.74, 0));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => g.add(box(0.06, 0.72, 0.06, materials.trim, sx * (length / 2 - 0.1), 0.36, sz * 0.38)));
  for (let i = 0; i < chairsPerSide; i++) {
    const cx = -length / 2 + (length / chairsPerSide) * (i + 0.5);
    [-1, 1].forEach((side) => {
      g.add(box(0.44, 0.05, 0.44, materials.oak, cx, 0.46, side * 0.72));
      g.add(box(0.44, 0.42, 0.04, materials.oak, cx, 0.68, side * 0.92));
    });
  }
  g.position.set(x, 0, z);
  return g;
}

function kitchen(materials, x, zBack, withIsland) {
  const g = new THREE.Group();
  g.add(box(3.2, 0.88, 0.62, materials.kitchenFront, 0, 0.44, zBack + 0.31));
  g.add(box(3.24, 0.04, 0.65, materials.countertop, 0, 0.9, zBack + 0.33));
  g.add(box(3.2, 0.7, 0.36, materials.kitchenFront, 0, 1.95, zBack + 0.18));
  g.add(box(0.6, 2.25, 0.62, materials.kitchenFront, 1.9, 1.125, zBack + 0.31));
  if (withIsland) {
    g.add(box(2.4, 0.88, 0.95, materials.kitchenFront, 0, 0.44, zBack + 1.95));
    g.add(box(2.5, 0.05, 1.05, materials.countertop, 0, 0.905, zBack + 1.95));
    g.add(box(0.8, 0.012, 0.5, materials.stoveBody, -0.5, 0.935, zBack + 1.95, false));
    [-0.7, 0, 0.7].forEach((dx) => {
      const stool = mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.05, 16), materials.oak);
      stool.position.set(dx, 0.66, zBack + 2.75);
      g.add(stool, box(0.04, 0.64, 0.04, materials.trim, dx, 0.32, zBack + 2.75));
    });
  }
  g.position.x = x;
  return g;
}

/** Gestrichelte Umrandung als Platzhalter für die optionale Küche. */
function kitchenPlaceholder(materials, x, zBack) {
  const g = new THREE.Group();
  const w = 3.2;
  const d = 2.9;
  for (let i = 0; i < 8; i++) {
    const dx = -w / 2 + (w / 8) * (i + 0.5);
    g.add(box(w / 16, 0.01, 0.03, materials.outline, dx, 0.011, zBack + 0.05, false));
    g.add(box(w / 16, 0.01, 0.03, materials.outline, dx, 0.011, zBack + d, false));
  }
  for (let i = 0; i < 7; i++) {
    const dz = zBack + 0.05 + (d / 7) * (i + 0.5);
    g.add(box(0.03, 0.01, d / 14, materials.outline, -w / 2, 0.011, dz, false));
    g.add(box(0.03, 0.01, d / 14, materials.outline, w / 2, 0.011, dz, false));
  }
  g.position.x = x;
  return g;
}

function stove(materials, x, z) {
  const g = new THREE.Group();
  g.add(box(0.9, 0.02, 0.9, materials.stoveBody, 0, 0.01, 0));
  const body = mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.1, 24), materials.stoveBody);
  body.position.y = 0.57;
  const flame = box(0.26, 0.3, 0.02, materials.fire, 0, 0.62, 0.275, false);
  const pipe = mesh(new THREE.CylinderGeometry(0.075, 0.075, HEIGHT - 1.12, 16), materials.stoveBody);
  pipe.position.y = 1.12 + (HEIGHT - 1.12) / 2;
  g.add(body, flame, pipe);
  g.position.set(x, 0, z);
  return g;
}

function plant(materials, x, z) {
  const g = new THREE.Group();
  const pot = mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.42, 16), materials.plantPot);
  pot.position.y = 0.21;
  const leaves = mesh(new THREE.IcosahedronGeometry(0.42, 1), materials.leaves(1));
  leaves.position.y = 0.95;
  leaves.scale.y = 1.5;
  g.add(pot, leaves);
  g.position.set(x, 0, z);
  return g;
}

/**
 * @returns {{ group: THREE.Group, walls: THREE.Group[], size: {w: number, h: number}, pendantLight: THREE.PointLight }}
 */
export function buildInterior(config, derived, materials) {
  const { plan, openings, geo } = derived;
  const room = plan.floors[0].rooms.find((r) => r.kind === 'living');
  const w = room.w;
  const h = room.h;
  const level = geo.floorLevels[0];
  const group = new THREE.Group();
  group.name = 'innenraum';
  const frameMaterial = materials.frame(config.frame);

  const toLocal = (o) => ({ ...o, y: o.y - level });
  const garden = openings.filter((o) => o.roomId === 'wohnen' && o.edge === 'vS').map((o) => toLocal({ ...o, x: o.u - room.u - w / 2 }));
  const endLeft = openings.filter((o) => o.roomId === 'wohnen' && o.edge === 'u0').map((o) => toLocal({ ...o, x: o.v - room.v - h / 2 }));
  const doorX = w / 2 - 1.1;
  const door = { kind: 'door', x: -doorX, y: 0, width: 0.95, height: config.tallDoors ? 2.5 : 2.05 };

  const walls = [
    wallGroup({ length: w + WALL * 2, openings: garden, position: new THREE.Vector3(0, 0, h / 2 + WALL / 2), rotationY: 0, normal: new THREE.Vector3(0, 0, 1), materials, frameMaterial }),
    wallGroup({ length: w + WALL * 2, openings: [door], position: new THREE.Vector3(0, 0, -h / 2 - WALL / 2), rotationY: 0, normal: new THREE.Vector3(0, 0, -1), materials, frameMaterial }),
    wallGroup({ length: h, openings: endLeft, position: new THREE.Vector3(-w / 2 - WALL / 2, 0, 0), rotationY: -Math.PI / 2, normal: new THREE.Vector3(-1, 0, 0), materials, frameMaterial }),
    wallGroup({ length: h, openings: [], position: new THREE.Vector3(w / 2 + WALL / 2, 0, 0), rotationY: Math.PI / 2, normal: new THREE.Vector3(1, 0, 0), materials, frameMaterial }),
  ];
  // Rückwand: Türblatt im Durchgang (Blick aus dem Raum: Tür rechts)
  const backWall = walls[1];
  backWall.add(box(door.width - 0.04, door.height - 0.02, 0.04, materials.white, door.x, door.height / 2, -0.02));
  backWall.add(box(0.14, 0.02, 0.03, materials.steel, door.x + 0.32, 1.05, -0.07));
  if (config.smartHome) {
    backWall.add(box(0.2, 0.14, 0.02, materials.screen, door.x + 0.95, 1.45, -WALL / 2 - 0.01, false));
  }
  if (config.ventilation) {
    walls[2].add(...[-0.8, 0.8].map((dx) => {
      const vent = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 20), materials.white, false);
      vent.rotation.x = Math.PI / 2;
      vent.position.set(dx, 2.35, -WALL / 2 - 0.01);
      return vent;
    }));
  }
  group.add(...walls);

  const floorGeometry = new THREE.BoxGeometry(w + WALL * 2, 0.06, h + WALL * 2);
  const uv = floorGeometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w + WALL * 2), uv.getY(i) * (h + WALL * 2));
  const floor = mesh(floorGeometry, materials.floor(config.flooring), false);
  floor.position.y = -0.03;
  group.add(floor);

  // Möblierung: lange Räume in drei Zonen, kompakte Räume zweireihig
  const long = w >= 8.5;
  const livingX = -w / 2 + Math.min(2.2, w * 0.24);
  group.add(box(2.7, 0.012, 2.1, materials.rug, livingX + 0.1, 0.006, 0.25, false));
  group.add(sofa(materials, livingX, -0.55));
  group.add(box(1.0, 0.36, 0.6, materials.oak, livingX + 0.1, 0.18, 0.55));
  group.add(plant(materials, -w / 2 + 0.45, -h / 2 + 0.45));
  if (config.stove) group.add(stove(materials, -w / 2 + 0.55, h / 2 - 0.85));

  const kitchenX = w / 2 - 1.9;
  const zBack = -h / 2;
  if (long) {
    group.add(diningSet(materials, 0.4, 0.35, 3));
  } else {
    group.add(diningSet(materials, kitchenX, h / 2 - 1.2, 2));
  }
  const island = config.kitchen && h >= 4.2 && (long || h >= 5.4);
  group.add(config.kitchen ? kitchen(materials, kitchenX, zBack, island) : kitchenPlaceholder(materials, kitchenX, zBack));

  // Pendelleuchten über dem Esstisch
  const pendantX = long ? 0.4 : kitchenX;
  const pendantZ = long ? 0.35 : h / 2 - 1.2;
  [-0.6, 0, 0.6].forEach((dx) => {
    const shade = mesh(new THREE.CylinderGeometry(0.05, 0.18, 0.2, 20), materials.pendant, false);
    shade.position.set(pendantX + dx, 1.75, pendantZ);
    group.add(shade, box(0.01, HEIGHT - 1.85, 0.01, materials.trim, pendantX + dx, 1.85 + (HEIGHT - 1.85) / 2, pendantZ, false));
  });
  const pendantLight = new THREE.PointLight(0xffd29a, 0, 6, 1.6);
  pendantLight.position.set(pendantX, 1.6, pendantZ);
  group.add(pendantLight);

  return { group, walls, size: { w, h }, pendantLight };
}

/** Blendet die Wände zwischen Kamera und Raum aus (Puppenhaus-Effekt). */
export function updateDollhouse(walls, camera, roomCenter) {
  const toCamera = new THREE.Vector3();
  walls.forEach((wall) => {
    toCamera.subVectors(camera.position, wall.getWorldPosition(new THREE.Vector3()).setY(roomCenter.y));
    wall.visible = toCamera.dot(wall.userData.normal) < 0.4;
  });
}
