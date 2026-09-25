import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCameraTween, exteriorPreset, fitDistance, interiorPreset, presetToPose } from './camera.js';
import { applyLighting, buildEnvironment } from './environment.js';
import { buildHouse, disposeObject } from './house.js';
import { buildInterior, updateDollhouse } from './interior.js';
import { createMaterials } from './materials.js';
import { configureTextures } from './textures.js';

/**
 * 3D-Viewer: rendert nur bei Bedarf (Kamerabewegung, Konfigurationsänderung), um Akku und GPU zu schonen.
 * Öffentliche API: update(state, derived), resetCamera(), snapshot(), exportGlb(), dispose().
 */

const toRad = THREE.MathUtils.degToRad;

export function createViewer(host, { reducedMotion = false, onInteract = () => {}, hotspotLayer = () => null } = {}) {
  const mobile = window.matchMedia('(max-width: 1023px)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping ?? THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);
  configureTextures(renderer);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 500);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.8;
  controls.autoRotateSpeed = 0.55;
  const tween = createCameraTween(camera, controls);

  const materials = createMaterials();
  const environment = buildEnvironment(materials, { shadowMapSize: mobile ? 1024 : 2048 });
  scene.add(environment.group);

  const current = {
    config: null,
    house: null,
    interior: null,
    view: null,
    step: null,
    lighting: null,
    sunTime: null,
    poseKey: null,
    radius: 10,
    interiorRadius: 5,
    height: 7,
    orientation: 'ew',
    entranceWall: 'E',
    appState: null,
  };

  /* --- Rendern bei Bedarf ------------------------------------------------------------------ */
  let queued = false;
  const tmp = new THREE.Vector3();
  const toCamera = new THREE.Vector3();

  function updateHotspots() {
    const layer = hotspotLayer();
    const elements = layer ? layer.querySelectorAll('[data-anchor]') : [];
    if (!elements.length) return;
    const width = host.clientWidth;
    const height = host.clientHeight;
    elements.forEach((element) => {
      const anchor = current.house?.anchors[element.dataset.anchor];
      let visible = Boolean(anchor) && current.view === 'exterior';
      if (visible) {
        tmp.copy(anchor.position).project(camera);
        const x = ((tmp.x + 1) / 2) * width;
        const y = ((1 - tmp.y) / 2) * height;
        const facing = anchor.normal.dot(toCamera.subVectors(camera.position, anchor.position)) > 0;
        visible = facing && tmp.z < 1 && x > 24 && x < width - 24 && y > 60 && y < height - 70;
        element.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      }
      element.dataset.hidden = String(!visible);
    });
  }

  function frame() {
    queued = false;
    if (!host.clientWidth || !host.clientHeight) return;
    const tweening = tween.update();
    const moved = controls.update();
    if (current.view === 'interior' && current.interior) updateDollhouse(current.interior.walls, camera, controls.target);
    renderer.render(scene, camera);
    updateHotspots();
    if (tweening || moved || controls.autoRotate) requestRender();
  }

  function requestRender() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(frame);
    }
  }

  controls.addEventListener('change', requestRender);
  controls.addEventListener('start', () => {
    tween.cancel();
    controls.autoRotate = false;
    onInteract();
  });

  function resize() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);

  /* --- Aufbau & Modi ----------------------------------------------------------------------- */
  function rebuild(config, derived) {
    if (current.house) {
      scene.remove(current.house.group, current.house.site);
      disposeObject(current.house.group);
      disposeObject(current.house.site);
    }
    if (current.interior) {
      scene.remove(current.interior.group);
      disposeObject(current.interior.group);
    }
    current.house = buildHouse(config, derived, materials);
    current.interior = buildInterior(config, derived, materials);
    scene.add(current.house.group, current.house.site, current.interior.group);
    const size = current.house.bounds.getSize(new THREE.Vector3());
    const previousRadius = current.radius;
    current.radius = current.house.bounds.getBoundingSphere(new THREE.Sphere()).radius;
    current.interiorRadius = Math.hypot(current.interior.size.w, current.interior.size.h) / 2 + 0.6;
    current.height = size.y;
    const orientationChanged = current.orientation !== derived.geo.orientation;
    current.orientation = derived.geo.orientation;
    current.entranceWall = derived.openings.find((o) => o.kind === 'door')?.wall ?? 'E';
    current.config = config;
    // Deutliche Größen- oder Ausrichtungsänderung → Kamera neu ausrichten
    if (orientationChanged || Math.abs(current.radius - previousRadius) / previousRadius > 0.25) current.poseKey = null;
  }

  function applyMode(view) {
    const interior = view === 'interior';
    const section = view === 'section';
    current.house.group.visible = !interior;
    current.house.site.visible = !interior;
    environment.ground.visible = !interior;
    current.interior.group.visible = interior;
    current.house.section.visible = section;
    materials.setClipping(current.house.houseMaterials, section ? [current.house.clipPlane] : []);
    const radius = interior ? current.interiorRadius : current.radius;
    controls.minDistance = fitDistance(camera, radius, 0.45);
    controls.maxDistance = fitDistance(camera, radius, 1.6);
    controls.minPolarAngle = interior ? toRad(12) : 0;
    controls.maxPolarAngle = toRad(interior ? 78 : section ? 88 : 84);
  }

  function applyLight(appState) {
    const night = appState.lighting === 'night';
    const interior = appState.view === 'interior';
    const radius = interior ? Math.max(current.interior.size.w, current.interior.size.h) / 2 + 2 : current.radius + 4;
    applyLighting(environment, { night, hour: appState.sunTime, radius });
    materials.setNight(night);
    current.house.spotLights.forEach((light) => {
      light.intensity = night ? 28 : 0;
    });
    current.interior.pendantLight.intensity = night ? 9 : 0;
    scene.environmentIntensity = night ? 0.12 : 0.55;
    renderer.toneMappingExposure = night ? 1.15 : 1;
  }

  function poseFor(appState) {
    if (appState.view === 'interior') return presetToPose(interiorPreset(), camera, current.interiorRadius);
    const preset = exteriorPreset({
      step: appState.step,
      view: appState.view,
      height: current.height,
      entranceWall: current.entranceWall,
      orientation: current.orientation,
    });
    return presetToPose(preset, camera, current.radius);
  }

  function moveCamera(appState, { instant = false } = {}) {
    tween.start(poseFor(appState), { instant: instant || reducedMotion });
    controls.autoRotate = appState.step === 5 && appState.view === 'exterior' && !reducedMotion;
    requestRender();
  }

  /* --- Öffentliche API --------------------------------------------------------------------- */
  function update(appState, derived) {
    current.appState = appState;
    const configChanged = appState.config !== current.config;
    if (configChanged) rebuild(appState.config, derived);
    const modeChanged = appState.view !== current.view;
    if (configChanged || modeChanged) applyMode(appState.view);
    if (configChanged || modeChanged || appState.lighting !== current.lighting || appState.sunTime !== current.sunTime) {
      applyLight(appState);
    }
    current.view = appState.view;
    current.lighting = appState.lighting;
    current.sunTime = appState.sunTime;
    const poseKey = `${appState.view}|${appState.view === 'exterior' ? appState.step : ''}`;
    if (poseKey !== current.poseKey) {
      const first = current.step === null;
      moveCamera(appState, { instant: first });
      current.poseKey = poseKey;
    }
    current.step = appState.step;
    requestRender();
  }

  function resetCamera() {
    if (current.appState) moveCamera(current.appState);
  }

  /** Standbild für das Exposé (immer Außenansicht, Heldenperspektive, heller Himmel). */
  function snapshot({ width = 1600, height = 900 } = {}) {
    const previous = {
      size: renderer.getSize(new THREE.Vector2()),
      ratio: renderer.getPixelRatio(),
      aspect: camera.aspect,
      position: camera.position.clone(),
      target: controls.target.clone(),
      view: current.view,
    };
    if (current.view !== 'exterior') applyMode('exterior');
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const preset = exteriorPreset({ step: 5, view: 'exterior', height: current.height, entranceWall: current.entranceWall, orientation: current.orientation });
    const pose = presetToPose(preset, camera, current.radius);
    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
    renderer.setClearColor(current.lighting === 'night' ? 0x1d2a3d : 0xe4ecef, 1);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/jpeg', 0.9);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(previous.ratio);
    renderer.setSize(previous.size.x, previous.size.y, false);
    camera.aspect = previous.aspect;
    camera.updateProjectionMatrix();
    camera.position.copy(previous.position);
    controls.target.copy(previous.target);
    camera.lookAt(previous.target);
    if (previous.view !== 'exterior') applyMode(previous.view);
    requestRender();
    return url;
  }

  async function exportGlb() {
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
    const exportRoot = new THREE.Group();
    exportRoot.name = 'CITODOMUS-Haus';
    exportRoot.add(current.house.group.clone(), current.house.site.clone());
    const result = await new GLTFExporter().parseAsync(exportRoot, { binary: true, onlyVisible: true });
    return new Blob([result], { type: 'model/gltf-binary' });
  }

  function dispose() {
    resizeObserver.disconnect();
    controls.dispose();
    disposeObject(scene);
    renderer.dispose();
    renderer.domElement.remove();
  }

  resize();
  return { update, resetCamera, snapshot, exportGlb, dispose, requestRender };
}
