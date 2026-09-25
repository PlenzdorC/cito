import * as THREE from 'three';
import { canonicalToWorld } from '../core/facade-layout.js';
import { wallFrame, wallToWorld } from './frames.js';

/** Außenanlage: Terrasse, Zuweg, Stellplatz mit E-Auto & Wallbox, Wärmepumpe, Bäume und Hecken. */

function mesh(geometry, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

/** Flache Platte parallel zum Boden, ausgerichtet an einer Wand (Breite entlang der Wand, Tiefe nach außen). */
function padAtWall(frame, t, x, width, depth, height, material) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width, uv.getY(i) * depth);
  const pad = mesh(geometry, material, { cast: false });
  const center = wallToWorld(frame, x, height / 2, t + depth / 2);
  pad.position.copy(center);
  pad.rotation.y = frame.rotationY;
  return pad;
}

function tree(x, z, scale, materials, variant) {
  const group = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(0.12 * scale, 0.18 * scale, 2.2 * scale, 8), materials.trunk);
  trunk.position.y = 1.1 * scale;
  group.add(trunk);
  [
    [0, 3.1, 0, 1.5],
    [0.6, 2.6, 0.3, 1.1],
    [-0.5, 2.8, -0.4, 1.15],
  ].forEach(([dx, dy, dz, r], i) => {
    const crown = mesh(new THREE.IcosahedronGeometry(r * scale, 1), materials.leaves(variant + i));
    crown.position.set(dx * scale, dy * scale, dz * scale);
    group.add(crown);
  });
  group.position.set(x, 0, z);
  return group;
}

function shrub(x, z, r, materials, variant) {
  const s = mesh(new THREE.IcosahedronGeometry(r, 1), materials.leaves(variant));
  s.position.set(x, r * 0.7, z);
  s.scale.y = 0.8;
  return s;
}

/** Stilisierter Kompaktwagen (Markenfarbe Terracotta). */
function car(materials) {
  const group = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(1.8, 0.62, 4.3), materials.carBody);
  body.position.y = 0.58;
  const cabin = mesh(new THREE.BoxGeometry(1.62, 0.52, 2.3), materials.carGlass);
  cabin.position.set(0, 1.12, -0.2);
  const roofTop = mesh(new THREE.BoxGeometry(1.5, 0.06, 2.0), materials.carBody);
  roofTop.position.set(0, 1.41, -0.25);
  group.add(body, cabin, roofTop);
  [
    [0.82, 1.35],
    [-0.82, 1.35],
    [0.82, -1.35],
    [-0.82, -1.35],
  ].forEach(([x, z]) => {
    const wheel = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 18), materials.tire);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.34, z);
    group.add(wheel);
  });
  return group;
}

export function buildSite(config, geo, plan, openings, materials) {
  const group = new THREE.Group();
  group.name = 'site';
  const t = geo.wallThickness;
  const anchors = {};

  // Terrasse vor der Panoramaverglasung
  const panorama = openings.find((o) => o.kind === 'panorama');
  if (panorama) {
    const frame = wallFrame(geo, panorama.wall);
    group.add(padAtWall(frame, t, panorama.x, panorama.width + 1.4, 3.4, 0.12, materials.paving));
  }

  // Zuweg zur Haustür
  const door = openings.find((o) => o.kind === 'door');
  if (door) {
    const frame = wallFrame(geo, door.wall);
    group.add(padAtWall(frame, t, door.x, 1.5, 8, 0.1, materials.paving));
    if (config.wallbox) {
      const length = frame.length;
      const carX = Math.max(2.2, Math.min(length - 2.2, door.x - 3.4));
      group.add(padAtWall(frame, t, carX, 3.2, 6.2, 0.06, materials.asphalt));
      const vehicle = car(materials);
      vehicle.position.copy(wallToWorld(frame, carX, 0.06, t + 3.3));
      vehicle.rotation.y = frame.rotationY;
      group.add(vehicle);
      const box = mesh(new THREE.BoxGeometry(0.34, 0.46, 0.14), materials.appliance);
      box.position.copy(wallToWorld(frame, carX + 1.25, 1.25, t + 0.07));
      box.rotation.y = frame.rotationY;
      const lamp = mesh(new THREE.BoxGeometry(0.16, 0.03, 0.02), materials.screen, { cast: false });
      lamp.position.copy(wallToWorld(frame, carX + 1.25, 1.36, t + 0.145));
      lamp.rotation.y = frame.rotationY;
      group.add(box, lamp);
      anchors.wallbox = { position: wallToWorld(frame, carX + 1.25, 1.6, t + 0.3), normal: frame.normal.clone() };
    }
  }

  // Wärmepumpe an der Versorgungsseite nahe HWR
  const serviceWall = geo.orientation === 'ew' ? 'N' : 'E';
  const hwr = plan.floors[0].rooms.find((r) => r.kind === 'utility');
  if (hwr) {
    const p = canonicalToWorld(geo, hwr.u + hwr.w / 2, 0);
    const frame = wallFrame(geo, serviceWall);
    const normal = frame.normal;
    const unit = mesh(new THREE.BoxGeometry(1.1, 0.85, 0.42), materials.appliance);
    unit.position.set(p.x + normal.x * (t + 0.5), 0.43, p.z + normal.z * (t + 0.5));
    unit.rotation.y = frame.rotationY;
    const fan = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 24), materials.darkPlastic, { cast: false });
    fan.rotation.x = Math.PI / 2;
    fan.rotation.z = 0;
    const fanHolder = new THREE.Group();
    fanHolder.add(fan);
    fanHolder.position.set(-0.18, 0, 0.215);
    unit.add(fanHolder);
    group.add(unit);
  }

  // Bepflanzung – außerhalb des Hauptblickwinkels (Südost) platziert
  const W = geo.outer.width;
  const D = geo.outer.depth;
  [
    [-W / 2 - 5.5, -D / 2 - 3.5, 1.15, 0],
    [W / 2 + 4.5, -D / 2 - 6, 1.35, 1],
    [-W / 2 - 8, D / 2 + 3, 1.0, 2],
    [-W / 2 - 3, -D / 2 - 9, 1.25, 1],
    [W / 2 + 12, D / 2 + 10, 0.95, 0],
  ].forEach(([x, z, s, v]) => group.add(tree(x, z, s, materials, v)));
  const hedge = mesh(new THREE.BoxGeometry(W + 16, 1.1, 0.9), materials.hedge);
  hedge.position.set(0, 0.55, -D / 2 - 11);
  group.add(hedge);
  [
    [-W / 2 - 0.9, D / 2 - 0.6, 0.45],
    [-W / 2 - 1.1, -D / 2 + 1.2, 0.55],
    [W / 2 + 0.8, -D / 2 - 0.8, 0.5],
  ].forEach(([x, z, r], i) => group.add(shrub(x, z, r, materials, i)));

  return { group, anchors };
}
