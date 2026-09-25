import * as THREE from 'three';
import { BUILDING } from '../data/catalog.js';
import { canonicalToWorld } from '../core/facade-layout.js';
import { roofUndersideAt } from '../core/geometry.js';
import { pvLayout } from '../core/pv-layout.js';

/** Dachkörper (Pult-, Sattel-, Gründach), Indach-PV und Schornstein. */

const toRad = (deg) => (deg * Math.PI) / 180;

/** Skaliert UVs auf Weltmeter (optional mit vertauschten Achsen für die Falzrichtung). */
function worldUv(geometry, su, sv, swap = false) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    if (swap) uv.setXY(i, v * sv, u * su);
    else uv.setXY(i, u * su, v * sv);
  }
  uv.needsUpdate = true;
  return geometry;
}

/** BoxGeometry-Gruppen: +x, -x, +y (Oberseite), -y (Untersicht), +z, -z */
function slab(width, thickness, length, materials, top, swap = false) {
  const geometry = worldUv(new THREE.BoxGeometry(width, thickness, length), width, length, swap);
  const mesh = new THREE.Mesh(geometry, [materials.trim, materials.trim, top, materials.soffit, materials.trim, materials.trim]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function pultRoof(geo, materials) {
  const { outer, eavesHeight: eaves, roof } = geo;
  const p = toRad(roof.pitch);
  const length = (outer.depth + 2 * roof.overhang) / Math.cos(p);
  const mesh = slab(outer.width + 2 * roof.overhang, roof.thickness, length, materials, materials.roof);
  mesh.rotation.x = p;
  mesh.position.set(0, eaves + (outer.depth / 2) * Math.tan(p) + (roof.thickness / 2) * Math.cos(p), (roof.thickness / 2) * Math.sin(p));
  return [mesh];
}

function satteldach(geo, materials) {
  const { outer, eavesHeight: eaves, roof } = geo;
  const p = toRad(roof.pitch);
  const halfSpan = outer.width / 2 + roof.overhang;
  const slope = halfSpan / Math.cos(p);
  const length = outer.depth + 2 * roof.overhang;
  const xc = halfSpan / 2;
  const yUnder = eaves + (outer.width / 2 - xc) * Math.tan(p);
  const parts = [1, -1].map((side) => {
    const mesh = slab(slope, roof.thickness, length, materials, materials.roof, true);
    mesh.rotation.z = -side * p;
    mesh.position.set(side * (xc + (roof.thickness / 2) * Math.sin(p)), yUnder + (roof.thickness / 2) * Math.cos(p), 0);
    return mesh;
  });
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, length + 0.02), materials.trim);
  ridge.position.set(0, eaves + (outer.width / 2) * Math.tan(p) + roof.thickness / Math.cos(p) - 0.02, 0);
  ridge.castShadow = true;
  return [...parts, ridge];
}

function flachdach(geo, materials) {
  const { outer, eavesHeight: eaves, roof, wallThickness: t } = geo;
  const deck = new THREE.Mesh(
    worldUv(new THREE.BoxGeometry(outer.width - 2 * t, 0.14, outer.depth - 2 * t), outer.width, outer.depth),
    [materials.soffit, materials.soffit, materials.sedum, materials.soffit, materials.soffit, materials.soffit],
  );
  deck.position.set(0, eaves - 0.02, 0);
  deck.receiveShadow = true;
  const capY = eaves + roof.parapet + 0.03;
  const cap = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), materials.trim);
    m.position.set(x, capY, z);
    m.castShadow = true;
    return m;
  };
  return [
    deck,
    cap(outer.width + 0.06, t + 0.06, 0, outer.depth / 2 - t / 2),
    cap(outer.width + 0.06, t + 0.06, 0, -outer.depth / 2 + t / 2),
    cap(t + 0.06, outer.depth, outer.width / 2 - t / 2, 0),
    cap(t + 0.06, outer.depth, -outer.width / 2 + t / 2, 0),
  ];
}

/** Indach-PV als InstancedMesh je Dachfläche; liefert die Mitte der größten Modulgruppe als Hotspot. */
function buildPv(config, geo, materials) {
  const layout = pvLayout(config, geo);
  const group = new THREE.Group();
  group.name = 'pv';
  const matrix = new THREE.Matrix4();
  const basis = new THREE.Matrix4();
  const tiltQ = new THREE.Quaternion();
  const baseQ = new THREE.Quaternion();
  let anchor = null;
  let anchorCount = 0;
  layout.planes.forEach(({ plane, fit, modules }) => {
    if (modules.length === 0) return;
    const u = new THREE.Vector3(...plane.uAxis);
    const v = new THREE.Vector3(...plane.vAxis);
    const n = new THREE.Vector3(...plane.normal);
    const origin = new THREE.Vector3(...plane.origin);
    const sizeX = plane.flat ? fit.along : fit.across;
    const sizeZ = plane.flat ? fit.across : fit.along;
    const cells = sizeX > sizeZ ? [10, 6] : [6, 10];
    const instanced = new THREE.InstancedMesh(new THREE.BoxGeometry(sizeX, 0.035, sizeZ), materials.pv(cells[0], cells[1]), modules.length);
    instanced.castShadow = true;
    instanced.receiveShadow = true;
    baseQ.setFromRotationMatrix(basis.makeBasis(u, n, new THREE.Vector3().crossVectors(u, n)));
    const tilt = toRad(BUILDING.flatModuleTilt);
    const lift = plane.flat ? 0.18 + (sizeX / 2) * Math.sin(tilt) : 0.03;
    const center = new THREE.Vector3();
    modules.forEach((m, i) => {
      const position = origin.clone().addScaledVector(u, m.u).addScaledVector(v, m.v).addScaledVector(n, lift);
      const q = baseQ.clone();
      if (plane.flat) q.multiply(tiltQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1), m.tiltSign * tilt));
      matrix.compose(position, q, new THREE.Vector3(1, 1, 1));
      instanced.setMatrixAt(i, matrix);
      center.add(position);
    });
    instanced.instanceMatrix.needsUpdate = true;
    group.add(instanced);
    if (modules.length > anchorCount) {
      anchorCount = modules.length;
      anchor = { position: center.divideScalar(modules.length).addScaledVector(n, 0.3), normal: n.clone() };
    }
  });
  return { group, anchor, layout };
}

/** Edelstahlschornstein für den Kaminofen über dem Wohnbereich. */
function chimney(geo, plan, materials) {
  const living = plan.floors[0].rooms.find((r) => r.kind === 'living');
  const pos = canonicalToWorld(geo, living.u + 1.1, living.v + living.h - 1.2);
  const base = roofUndersideAt(geo, pos.x, pos.z) + (geo.roof.type === 'flach' ? 0 : geo.roof.thickness);
  const height = 1.3;
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, height, 20), materials.chimney);
  pipe.position.set(pos.x, base + height / 2 - 0.2, pos.z);
  pipe.castShadow = true;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 20), materials.chimney);
  hat.position.set(pos.x, base + height - 0.08, pos.z);
  return [pipe, hat];
}

export function buildRoof(config, geo, plan, materials) {
  const group = new THREE.Group();
  group.name = 'roof';
  const parts = geo.roof.type === 'pult' ? pultRoof(geo, materials) : geo.roof.type === 'sattel' ? satteldach(geo, materials) : flachdach(geo, materials);
  group.add(...parts);
  const pv = buildPv(config, geo, materials);
  group.add(pv.group);
  if (config.stove) group.add(...chimney(geo, plan, materials));

  const { outer, eavesHeight, roof } = geo;
  const roofAnchor =
    roof.type === 'pult'
      ? { position: new THREE.Vector3(-outer.width / 2 + 0.6, roofUndersideAt(geo, 0, -outer.depth / 2 + 0.6) + 0.5, -outer.depth / 2 + 0.6), normal: new THREE.Vector3(0, 1, 0.3).normalize() }
      : roof.type === 'sattel'
        ? { position: new THREE.Vector3(0, eavesHeight + (outer.width / 2) * Math.tan(toRad(roof.pitch)) + 0.45, outer.depth / 2 - 0.2), normal: new THREE.Vector3(0, 0.6, 1).normalize() }
        : { position: new THREE.Vector3(-outer.width / 2 + 0.6, eavesHeight + roof.parapet + 0.3, outer.depth / 2 - 0.4), normal: new THREE.Vector3(0, 1, 0.4).normalize() };
  return { group, anchors: { roof: roofAnchor, pv: pv.anchor }, pvLayout: pv.layout };
}
