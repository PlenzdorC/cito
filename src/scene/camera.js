import * as THREE from 'three';

/**
 * Kamerapresets je Schritt/Ansicht in Kugelkoordinaten um das Haus
 * (Azimut 0° = Süden/+Z, positiv Richtung Osten/+X; Polarwinkel von oben gemessen).
 * `fit` = Anteil der Bounding-Sphere, der in das kleinere Sichtfeld passen soll (1 = exakt).
 */

const toRad = (deg) => (deg * Math.PI) / 180;

const ENTRANCE_AZIMUTH = { S: 0, E: 90, N: 180, W: -90 };

export function exteriorPreset({ step, view, height, entranceWall, orientation }) {
  const targetY = height * 0.34;
  // Schnitt: Blick senkrecht auf die Schnittfläche (Gartenseite liegt im Süden bzw. beim Satteldach im Westen)
  if (view === 'section') return { azimuth: orientation === 'ns' ? -90 : 0, polar: 80, fit: 0.9, targetY: height * 0.42 };
  switch (step) {
    case 2:
      return { azimuth: (ENTRANCE_AZIMUTH[entranceWall] ?? 45) * 0.55, polar: 76, fit: 0.95, targetY };
    case 3:
      // Tiefer liegendes Ziel rückt das Dach über das Sonnenstand-Panel am unteren Rand
      return { azimuth: 28, polar: 55, fit: 1.05, targetY: height * 0.12 };
    case 5:
      return { azimuth: -32, polar: 72, fit: 1.0, targetY };
    default:
      return { azimuth: 36, polar: 70, fit: 1.0, targetY };
  }
}

export function interiorPreset() {
  return { azimuth: 200, polar: 50, fit: 1.0, targetY: 0.6 };
}

/** Abstand, bei dem eine Kugel mit `radius` zu `fit` in das engere Sichtfeld der Kamera passt. */
export function fitDistance(camera, radius, fit = 1) {
  const vfov = toRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  return (fit * radius) / Math.sin(Math.min(vfov, hfov) / 2);
}

/** Kugelkoordinaten → Kameraposition und Ziel. */
export function presetToPose(preset, camera, radius, center = new THREE.Vector3()) {
  const az = toRad(preset.azimuth);
  const polar = toRad(preset.polar);
  const distance = fitDistance(camera, radius, preset.fit);
  const target = new THREE.Vector3(center.x, preset.targetY, center.z);
  const position = new THREE.Vector3(
    target.x + distance * Math.sin(polar) * Math.sin(az),
    target.y + distance * Math.cos(polar),
    target.z + distance * Math.sin(polar) * Math.cos(az),
  );
  return { position, target };
}

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Sanfter Kameraflug zwischen zwei Posen. */
export function createCameraTween(camera, controls) {
  let tween = null;
  return {
    start(pose, { duration = 900, instant = false } = {}) {
      if (instant || duration <= 0) {
        camera.position.copy(pose.position);
        controls.target.copy(pose.target);
        tween = null;
        return;
      }
      tween = {
        fromPos: camera.position.clone(),
        fromTarget: controls.target.clone(),
        toPos: pose.position.clone(),
        toTarget: pose.target.clone(),
        start: performance.now(),
        duration,
      };
    },
    /** @returns {boolean} true, solange die Animation läuft */
    update() {
      if (!tween) return false;
      const t = Math.min(1, (performance.now() - tween.start) / tween.duration);
      const k = easeInOutCubic(t);
      camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
      if (t >= 1) tween = null;
      return true;
    },
    cancel() {
      tween = null;
    },
    get active() {
      return tween !== null;
    },
  };
}
