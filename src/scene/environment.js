import * as THREE from 'three';
import { sunPosition } from '../core/energy.js';

/** Rasenfläche und Licht (Sonne/Mond, Himmelslicht). Tag/Nacht und Sonnenstand werden hier gesteuert. */

const toRad = (deg) => (deg * Math.PI) / 180;

export function buildEnvironment(materials, { shadowMapSize }) {
  const group = new THREE.Group();
  group.name = 'umgebung';

  // Kreis-UVs laufen 0…1 über 92 m: Grastextur kachelt alle 3 m, der Alpha-Verlauf einmal über die Scheibe.
  const radius = 46;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), materials.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.renderOrder = -1;
  materials.grass.map.repeat.set((radius * 2) / 3, (radius * 2) / 3);
  materials.grass.alphaMap.repeat.set(1, 1);
  group.add(ground);

  const hemi = new THREE.HemisphereLight(0xdfeaf5, 0xb7ab94, 1.3);
  const sun = new THREE.DirectionalLight(0xfff1dc, 3.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 3;
  group.add(hemi, sun, sun.target);

  return { group, ground, hemi, sun };
}

/**
 * Setzt Sonnenstand bzw. Mondlicht. `radius` bestimmt die Ausdehnung der Schattenkamera.
 * @param {{ hemi: THREE.HemisphereLight, sun: THREE.DirectionalLight }} env
 */
export function applyLighting(env, { night, hour, radius, center = new THREE.Vector3() }) {
  const { hemi, sun } = env;
  const position = night ? { azimuth: 200, elevation: 38 } : sunPosition(hour);
  const elevation = Math.max(6, position.elevation);
  const az = toRad(position.azimuth);
  const el = toRad(elevation);
  const distance = radius * 3;
  sun.position.set(
    center.x + Math.sin(az) * Math.cos(el) * distance,
    center.y + Math.sin(el) * distance,
    center.z - Math.cos(az) * Math.cos(el) * distance,
  );
  sun.target.position.copy(center);
  const cam = sun.shadow.camera;
  cam.left = -radius;
  cam.right = radius;
  cam.top = radius;
  cam.bottom = -radius;
  cam.near = 0.5;
  cam.far = distance + radius * 2;
  cam.updateProjectionMatrix();

  if (night) {
    sun.color.set(0x9db4ff);
    sun.intensity = 0.35;
    hemi.color.set(0x2a3a5c);
    hemi.groundColor.set(0x1a1d22);
    hemi.intensity = 0.55;
    return;
  }
  // Tiefe Sonne färbt sich warm und wird schwächer
  const low = Math.max(0, Math.min(1, (25 - position.elevation) / 25));
  sun.color.setRGB(1, 0.95 - low * 0.25, 0.86 - low * 0.42);
  sun.intensity = 3.2 - low * 1.6;
  hemi.color.set(0xdfeaf5);
  hemi.groundColor.set(0xb7ab94);
  hemi.intensity = 1.25 - low * 0.35;
}
