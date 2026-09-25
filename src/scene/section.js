import * as THREE from 'three';
import { canonicalToWorld } from '../core/facade-layout.js';

/**
 * Innenleben für die Schnittansicht: Geschossdecken, Innenwände aus dem Grundriss und Treppe.
 * Wird nur im Schnittmodus eingeblendet.
 */

const INNER_WALL = 0.12;
const SLAB = 0.24;

/** Box in kanonischen Grundrisskoordinaten (u entlang Langseite, v entlang Schmalseite). */
function canonicalBox(geo, { u, v, w, h }, y, height, material) {
  const a = canonicalToWorld(geo, u, v);
  const b = canonicalToWorld(geo, u + w, v + h);
  const width = Math.abs(b.x - a.x);
  const depth = Math.abs(b.z - a.z);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set((a.x + b.x) / 2, y + height / 2, (a.z + b.z) / 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function floorMaterial(kind, materials, flooring) {
  if (['bath', 'shower', 'wc', 'utility', 'hall', 'landing'].includes(kind)) return materials.floor('feinstein');
  return materials.floor(flooring);
}

export function buildSection(config, geo, plan, materials) {
  const group = new THREE.Group();
  group.name = 'section';
  group.visible = false;
  const storey = geo.storeyHeight - SLAB;

  plan.floors.forEach((floor, level) => {
    const y = geo.floorLevels[level];
    // Rohdecke und Bodenbeläge je Raum
    group.add(canonicalBox(geo, { u: 0, v: 0, w: plan.L, h: plan.S }, y - SLAB, SLAB - 0.02, materials.soffit));
    floor.rooms.forEach((room) => {
      group.add(canonicalBox(geo, room, y - 0.02, 0.02, floorMaterial(room.kind, materials, config.flooring)));
    });
    // Innenwände: Bandgrenze + Raumtrennungen
    group.add(canonicalBox(geo, { u: 0, v: floor.serviceDepth - INNER_WALL / 2, w: plan.L, h: INNER_WALL }, y, storey, materials.interiorWall));
    ['service', 'garden'].forEach((band) => {
      floor.rooms
        .filter((r) => r.band === band)
        .slice(1)
        .forEach((r) => group.add(canonicalBox(geo, { u: r.u - INNER_WALL / 2, v: r.v, w: INNER_WALL, h: r.h }, y, storey, materials.interiorWall)));
    });
    // Treppe als Stufenfolge
    if (floor.stairs && level === 0) {
      const steps = 16;
      const rise = geo.storeyHeight / steps;
      const run = floor.stairs.w / steps;
      for (let i = 0; i < steps; i++) {
        group.add(canonicalBox(geo, { u: floor.stairs.u + i * run, v: floor.stairs.v, w: run, h: floor.stairs.h }, y, rise * (i + 1), materials.oak));
      }
    }
  });
  // oberste Decke
  const topY = geo.floorLevels[geo.floors - 1] + geo.storeyHeight - SLAB;
  group.add(canonicalBox(geo, { u: 0, v: 0, w: plan.L, h: plan.S }, topY, SLAB, materials.soffit));
  return group;
}

/** Schnittebene: parallel zur Gartenfassade durch das Gartenband (Blick von Süden bzw. Westen). */
export function sectionPlane(geo, plan) {
  const garden = plan.floors[0].rooms.find((r) => r.band === 'garden');
  const v = garden.v + garden.h * 0.45;
  const p = canonicalToWorld(geo, 0, v);
  if (geo.orientation === 'ew') return new THREE.Plane(new THREE.Vector3(0, 0, -1), p.z);
  return new THREE.Plane(new THREE.Vector3(1, 0, 0), -p.x);
}
