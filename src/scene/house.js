import * as THREE from 'three';
import { buildOpenings } from './openings.js';
import { buildRoof } from './roof.js';
import { buildSection, sectionPlane } from './section.js';
import { buildSite } from './site.js';
import { buildWalls } from './walls.js';

/** Dekorative Giebelfenster beim Satteldach (Dachraum, nicht Teil des Grundrisses). */
function gableWindows(geo) {
  if (geo.roof.type !== 'sattel' || geo.roof.rise < 1.8) return [];
  const size = Math.min(1.0, geo.roof.rise * 0.4);
  return ['S', 'N'].map((wall) => ({
    id: `giebel-${wall}`,
    wall,
    kind: 'standard',
    roomId: 'dachraum',
    floor: geo.floors - 1,
    x: geo.outer.width / 2,
    y: geo.eavesHeight + geo.roof.rise * 0.22,
    width: size,
    height: size,
    panes: 1,
  }));
}

/**
 * Setzt das komplette Außenmodell aus der Konfiguration zusammen.
 * Hotspot-Anker enthalten Weltposition und Flächennormale (für die Sichtbarkeitsprüfung).
 */
export function buildHouse(config, derived, materials) {
  const { geo, plan } = derived;
  const openings = [...derived.openings, ...gableWindows(geo)];
  const group = new THREE.Group();
  group.name = 'haus';

  const walls = buildWalls(config, geo, openings, materials);
  const openingsResult = buildOpenings(config, geo, openings, materials);
  const roof = buildRoof(config, geo, plan, materials);
  const section = buildSection(config, geo, plan, materials);
  group.add(walls, openingsResult.group, roof.group, section);

  const site = buildSite(config, geo, plan, openings, materials);

  // Fassaden-Hotspot: geschlossene Wandfläche nahe der Südwest-Ecke (dort liegt nie eine Öffnung)
  const anchors = {
    facade: {
      position: new THREE.Vector3(-geo.outer.width / 2 + 0.6, geo.eavesHeight * 0.52, geo.outer.depth / 2 + 0.05),
      normal: new THREE.Vector3(0, 0, 1),
    },
    ...openingsResult.anchors,
    ...roof.anchors,
    ...site.anchors,
  };

  // Materialien des Hauses (für die Schnittansicht mit Clipping)
  const houseMaterials = new Set();
  group.traverse((object) => {
    if (!object.isMesh) return;
    (Array.isArray(object.material) ? object.material : [object.material]).forEach((m) => houseMaterials.add(m));
  });

  const bounds = new THREE.Box3().setFromObject(group);
  return {
    group,
    site: site.group,
    section,
    anchors,
    spotLights: openingsResult.spotLights,
    houseMaterials: [...houseMaterials],
    clipPlane: sectionPlane(geo, plan),
    bounds,
  };
}

/** Gibt Geometrien frei (Materialien und Texturen sind geteilt und bleiben im Cache). */
export function disposeObject(object) {
  object?.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.isInstancedMesh) child.dispose();
  });
}
