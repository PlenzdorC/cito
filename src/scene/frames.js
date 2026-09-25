import * as THREE from 'three';

/**
 * Lokale Koordinatensysteme der vier Außenwände.
 * Wandlokal: x von außen gesehen nach rechts (ab Außenecke), y nach oben, z von der Innen- (0) zur Außenfläche (t).
 */

export function wallFrame(geo, wall) {
  const W = geo.outer.width;
  const D = geo.outer.depth;
  const t = geo.wallThickness;
  switch (wall) {
    case 'S':
      return { rotationY: 0, position: new THREE.Vector3(-W / 2, 0, D / 2 - t), normal: new THREE.Vector3(0, 0, 1), length: W, shortened: false };
    case 'N':
      return { rotationY: Math.PI, position: new THREE.Vector3(W / 2, 0, -D / 2 + t), normal: new THREE.Vector3(0, 0, -1), length: W, shortened: false };
    case 'E':
      return { rotationY: Math.PI / 2, position: new THREE.Vector3(W / 2 - t, 0, D / 2), normal: new THREE.Vector3(1, 0, 0), length: D, shortened: true };
    default:
      return { rotationY: -Math.PI / 2, position: new THREE.Vector3(-W / 2 + t, 0, -D / 2), normal: new THREE.Vector3(-1, 0, 0), length: D, shortened: true };
  }
}

/** Wandlokaler Punkt → Weltkoordinate. */
export function wallToWorld(frame, x, y, z) {
  const local = new THREE.Vector3(x, y, z);
  local.applyAxisAngle(new THREE.Vector3(0, 1, 0), frame.rotationY);
  return local.add(frame.position);
}

/** Setzt ein Objekt in das Wandkoordinatensystem. */
export function placeOnWall(object, frame) {
  object.rotation.y = frame.rotationY;
  object.position.copy(frame.position);
  return object;
}

export const WALLS = Object.freeze(['S', 'E', 'N', 'W']);
