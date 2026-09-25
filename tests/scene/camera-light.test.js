// @vitest-environment jsdom
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCameraTween, exteriorPreset, fitDistance, interiorPreset, presetToPose } from '../../src/scene/camera.js';
import { applyLighting } from '../../src/scene/environment.js';

afterEach(() => vi.useRealTimers());

describe('Kamera', () => {
  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 500);

  it('passt die Bounding-Sphere ins engere Sichtfeld', () => {
    const wide = fitDistance(camera, 10, 1);
    const portrait = fitDistance(new THREE.PerspectiveCamera(34, 0.5, 0.1, 500), 10, 1);
    expect(wide).toBeCloseTo(10 / Math.sin(THREE.MathUtils.degToRad(17)), 6);
    expect(portrait).toBeGreaterThan(wide);
  });

  it('liefert je Schritt und Ansicht passende Blickwinkel', () => {
    const args = { height: 9, entranceWall: 'E', orientation: 'ew' };
    expect(exteriorPreset({ ...args, step: 2 }).azimuth).toBeCloseTo(49.5, 6);
    expect(exteriorPreset({ ...args, step: 3 }).polar).toBeLessThan(exteriorPreset({ ...args, step: 1 }).polar);
    expect(exteriorPreset({ ...args, step: 1, view: 'section' }).azimuth).toBe(0);
    expect(exteriorPreset({ ...args, orientation: 'ns', step: 1, view: 'section' }).azimuth).toBe(-90);
    expect(exteriorPreset({ ...args, step: 5 }).azimuth).toBeLessThan(0);
    expect(interiorPreset().azimuth).toBe(200);
  });

  it('rechnet Kugelkoordinaten in eine Pose um', () => {
    const pose = presetToPose({ azimuth: 0, polar: 90, fit: 1, targetY: 2 }, camera, 10);
    expect(pose.target.toArray()).toEqual([0, 2, 0]);
    expect(pose.position.x).toBeCloseTo(0, 6);
    expect(pose.position.y).toBeCloseTo(2, 6);
    expect(pose.position.z).toBeCloseTo(fitDistance(camera, 10, 1), 6);
  });

  it('fliegt sanft zur neuen Pose oder springt sofort', () => {
    vi.useFakeTimers();
    const cam = new THREE.PerspectiveCamera();
    const controls = { target: new THREE.Vector3() };
    const tween = createCameraTween(cam, controls);
    const pose = { position: new THREE.Vector3(10, 5, 10), target: new THREE.Vector3(0, 1, 0) };
    tween.start(pose, { instant: true });
    expect(cam.position.toArray()).toEqual([10, 5, 10]);
    expect(tween.active).toBe(false);
    const now = vi.spyOn(performance, 'now');
    now.mockReturnValue(0);
    tween.start({ position: new THREE.Vector3(0, 5, 20), target: new THREE.Vector3() }, { duration: 100 });
    expect(tween.active).toBe(true);
    now.mockReturnValue(50);
    expect(tween.update()).toBe(true);
    expect(cam.position.x).toBeCloseTo(5, 6);
    now.mockReturnValue(100);
    tween.update();
    expect(tween.active).toBe(false);
    expect(tween.update()).toBe(false);
    tween.start(pose, { duration: 100 });
    tween.cancel();
    expect(tween.active).toBe(false);
  });
});

describe('Beleuchtung', () => {
  const env = () => ({ hemi: new THREE.HemisphereLight(), sun: new THREE.DirectionalLight() });

  it('stellt die Sonne je Uhrzeit und färbt tiefe Sonne warm', () => {
    const noon = env();
    applyLighting(noon, { night: false, hour: 13.25, radius: 10 });
    expect(noon.sun.position.z).toBeGreaterThan(0); // Süden
    expect(noon.sun.position.y).toBeGreaterThan(20);
    const evening = env();
    applyLighting(evening, { night: false, hour: 20.5, radius: 10 });
    expect(evening.sun.position.x).toBeLessThan(0); // Westen
    expect(evening.sun.intensity).toBeLessThan(noon.sun.intensity);
    expect(evening.sun.color.b).toBeLessThan(noon.sun.color.b);
    expect(noon.sun.shadow.camera.right).toBe(10);
  });

  it('dimmt nachts auf Mondlicht', () => {
    const night = env();
    applyLighting(night, { night: true, hour: 15, radius: 10 });
    expect(night.sun.intensity).toBeLessThan(0.5);
    expect(night.hemi.intensity).toBeLessThan(1);
  });
});
