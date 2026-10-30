// Talent concept scene: an articulated hand study with a conceptual dorsal wearable.
// Units are roughly centimetres. Hand-local axes: +Z toward the fingertips, +Y dorsal, -X thumb side.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const V2 = THREE.Vector2, V3 = THREE.Vector3;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const se = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);

// ---------- materials ----------
const C = {
  bg: 0x0b0a09,
  skin: new THREE.Color(0xb98d74),
  skinGhost: new THREE.Color(0x1c1917),
  graphite: new THREE.Color(0x1f1d1b),
  polymer: new THREE.Color(0x8a8278),
  line: new THREE.Color(0xe9e2d6),
  lineDim: new THREE.Color(0x77706a),
  accent: new THREE.Color(0xd99a62),
  cable: new THREE.Color(0x4a443d),
};

function makeMaterials() {
  return {
    skin: new THREE.MeshPhysicalMaterial({ color: C.skin.clone(), roughness: 0.58, sheen: 0.7, sheenColor: 0xffcfb4, sheenRoughness: 0.55, clearcoat: 0.06, clearcoatRoughness: 0.6, envMapIntensity: 0.35 }),
    nail: new THREE.MeshPhysicalMaterial({ color: 0xc79a88, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2, sheen: 0.3, sheenColor: 0xffe6dc, envMapIntensity: 0.6, side: THREE.DoubleSide }),
    graphite: new THREE.MeshPhysicalMaterial({ color: C.graphite.clone(), roughness: 0.46, metalness: 0.25, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 0.8 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xbdb6ab, metalness: 1, roughness: 0.3, envMapIntensity: 1.1 }),
    polymer: new THREE.MeshPhysicalMaterial({ color: C.polymer.clone(), roughness: 0.38, transmission: 0, transparent: true, opacity: 0.8, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.3, sheenColor: 0xffffff, envMapIntensity: 0.7 }),
    cable: new THREE.MeshStandardMaterial({ color: C.cable.clone(), metalness: 0.7, roughness: 0.35, emissive: 0x000000 }),
    ground: new THREE.MeshStandardMaterial({ color: 0x0c0b0a, roughness: 0.95, metalness: 0 }),
  };
}

function outlineMaterial(color, width) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 }, uW: { value: width } },
    vertexShader: 'uniform float uW; void main(){ vec3 p = position + normal * uW; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
    fragmentShader: 'uniform vec3 uColor; uniform float uOpacity; void main(){ gl_FragColor = vec4(uColor, uOpacity); }',
    side: THREE.BackSide, transparent: true, depthWrite: false,
  });
}

// ---------- geometry ----------
function phalanxGeo(L, r0, r1, tipScale = 0.9, seg = 44) {
  const pts = [];
  const capB = r0 * 0.8, capT = r1 * tipScale;
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; pts.push(new V2(r0 * Math.sin(a), -capB * Math.cos(a))); }
  for (let i = 1; i <= 12; i++) { const t = i / 12; pts.push(new V2(lerp(r0, r1, t) * (1 - 0.05 * Math.sin(t * Math.PI)), t * L)); }
  for (let i = 1; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; pts.push(new V2(Math.max(1e-4, r1 * Math.cos(a)), L + capT * Math.sin(a))); }
  const g = new THREE.LatheGeometry(pts, seg);
  g.rotateX(Math.PI / 2);
  g.scale(1.08, 0.84, 1);
  return g;
}

function palmShape(x, y, z) {
  // x,y,z on the unit sphere -> palm surface
  const X = se(x, 0.42), Y = se(y, 0.72), Z = se(z, 0.5);
  const t = (Z + 1) / 2; // 0 wrist, 1 knuckles
  let zw = lerp(-4.4, 4.5, t);
  const halfW = 3.15 + 1.0 * Math.pow(t, 0.75);
  let xw = X * halfW;
  const top = (1.0 + 0.28 * Math.sin(t * Math.PI)) * (1 - 0.3 * X * X) + 0.22 * (1 - X * X);
  const bot = (1.2 + 0.2 * Math.sin(t * Math.PI)) * (1 - 0.22 * X * X);
  let yw = Y > 0 ? Y * top : Y * bot;
  // metacarpal heads under the skin
  if (Y > 0) {
    for (const k of [-2.85, -0.95, 0.95, 2.75]) yw += Y * 0.16 * Math.exp(-((xw - k) ** 2) / 0.45) * Math.exp(-((zw - 3.6) ** 2) / 1.2);
    // extensor tendons, very faint
    for (const k of [-2.6, -0.9, 0.9, 2.5]) yw += Y * 0.02 * Math.exp(-((xw - k) ** 2) / 0.08) * ss(-2, 2.5, zw);
  }
  // thenar mass on the thumb side
  const th = Math.exp(-((xw + 2.7) ** 2) / 2.4 - ((zw + 1.0) ** 2) / 6);
  if (Y < 0.3) { yw -= 0.75 * th * Math.max(0, 0.3 - Y); xw -= 0.7 * th * Math.max(0, -X); }
  // little-finger side of the knuckle line sits further back
  zw -= 0.55 * Math.max(0, X) * t * t;
  return [xw, yw + 0.05, zw];
}

function palmGeo() {
  let g = new THREE.SphereGeometry(1, 110, 72);
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const [a, b, c] = palmShape(p.getX(i), p.getY(i), p.getZ(i)); p.setXYZ(i, a, b, c); }
  g.computeVertexNormals();
  return g;
}

// forearm radius along -Z (z is hand-local, negative behind the palm)
// slim wrist, full muscle belly in the upper third of the forearm, easing slightly into the elbow
const forearmR = (z) => { const d = -z - 2.2; return 2.2 - 0.12 * Math.exp(-((d - 4.6) ** 2) / 4) + 1.95 * ss(3, 17, d) - 0.45 * ss(19, 26, d); };
const FA_SX = 1.42, FA_SY = 0.76, FA_Y = -0.12;

function forearmGeo() {
  const pts = [];
  for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; pts.push(new V2(Math.max(1e-4, forearmR(-2.2) * Math.sin(a)), -1.4 * Math.cos(a))); }
  for (let i = 1; i <= 60; i++) { const d = (i / 60) * 26.4; pts.push(new V2(forearmR(-2.2 - d), d)); }
  const g = new THREE.LatheGeometry(pts, 64);
  g.rotateX(-Math.PI / 2); g.translate(0, 0, -2.2); g.scale(FA_SX, FA_SY, 1); g.translate(0, FA_Y, 0);
  return g;
}

function ringGeo(R, thick, width, rounding = 0.1) {
  // rounded-rectangle profile lathed into a band (axis Y)
  const pts = [], w = width / 2, r = Math.min(rounding, thick / 2, w);
  const corner = (cx, cy, a0) => { for (let i = 0; i <= 5; i++) { const a = a0 + (i / 5) * Math.PI / 2; pts.push(new V2(cx + r * Math.cos(a), cy + r * Math.sin(a))); } };
  corner(R + thick - r, -w + r, -Math.PI / 2);
  corner(R + thick - r, w - r, 0);
  corner(R + r, w - r, Math.PI / 2);
  corner(R + r, -w + r, Math.PI);
  pts.push(pts[0].clone());
  return new THREE.LatheGeometry(pts, 72);
}

function saddleGeo(r, len, thick = 0.15) {
  const ro = r + 0.04 + thick, ri = r + 0.04, a0 = -0.3, a1 = Math.PI + 0.3;
  const s = new THREE.Shape();
  s.absarc(0, 0, ro, a0, a1, false);
  s.absarc(0, 0, ri, a1, a0, true);
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 48 });
  g.translate(0, 0, -len / 2); g.scale(1.08, 0.84, 1);
  return g;
}


// fingernail: a thin curved plate that follows the distal phalanx surface and stops short of the fingertip
function nailGeo(L, r0, r1, capT, width = 0.6, start = 0.5) {
  const radiusAt = (z) => {
    if (z <= L) { const t = z / L; return lerp(r0, r1, t) * (1 - 0.05 * Math.sin(t * Math.PI)); }
    const k = Math.min(1, (z - L) / capT); return r1 * Math.sqrt(Math.max(0, 1 - k * k));
  };
  const z0 = L * start, z1 = L + capT * 0.5, NU = 28, NV = 28;
  const pos = [], idx = [];
  for (let j = 0; j <= NV; j++) {
    const v = j / NV, z = lerp(z0, z1, v);
    // rounded proximal fold, nearly straight free edge
    const prox = Math.min(1, v / 0.28), span = width * Math.sqrt(1 - (1 - prox) * (1 - prox));
    const lift = 0.012 + 0.05 * ss(0.1, 0.9, v);
    for (let i = 0; i <= NU; i++) {
      const th = (i / NU * 2 - 1) * span;
      const R = radiusAt(z) + lift;
      pos.push(Math.sin(th) * R * 1.08, Math.cos(th) * R * 0.84, z);
    }
  }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function bend(g, k) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) - k * p.getX(i) ** 2); g.computeVertexNormals(); return g; }

// ---------- finger definitions ----------
const FINGERS = [
  { name: 'index', base: [-2.85, 0.12, 4.15], yaw: -0.07, L: [4.1, 2.45, 1.95], r: [0.93, 0.84, 0.77, 0.7] },
  { name: 'middle', base: [-0.95, 0.15, 4.35], yaw: -0.01, L: [4.5, 2.85, 2.05], r: [0.97, 0.88, 0.8, 0.72] },
  { name: 'ring', base: [0.95, 0.12, 4.1], yaw: 0.05, L: [4.2, 2.65, 1.98], r: [0.91, 0.83, 0.76, 0.69] },
  { name: 'little', base: [2.72, 0.05, 3.55], yaw: 0.13, L: [3.3, 1.95, 1.8], r: [0.8, 0.72, 0.66, 0.6] },
];
const THUMB = { name: 'thumb', base: [-2.55, -0.75, -1.3], L: [3.7, 2.9, 2.35], r: [1.2, 0.98, 0.88, 0.8, 0.74] };

const REACH = { rise: 0.34, roll: 0.3, show: -0.6, bend: 1.08, wrist: 0.24, pos: [10, 4, 0] };
const CUPPED = { f: [[0.42, 0.62, 0.4], [0.5, 0.68, 0.42], [0.58, 0.74, 0.44], [0.66, 0.8, 0.46]], t: [0.12, 0.26, 0.22] };
const RELAXED = { f: [[0.2, 0.34, 0.2], [0.22, 0.38, 0.22], [0.26, 0.42, 0.24], [0.3, 0.46, 0.26]], t: [0.05, 0.18, 0.16] };
const indexFlex = (u) => [0.0 + 0.62 * u, 0.06 + 0.92 * u, 0.04 + 0.55 * u];

export async function createTalentScene(canvas, opts = {}) {
  const mobile = !!opts.mobile;
  // stance blends between 'table' (0: forearm resting palm down, used by the intro and editorial stills)
  // and 'reach' (1: arm raised in profile, palm up, used by the chapters). opts.stance 'table' pins it at 0.
  const tableOnly = opts.stance === 'table';
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(C.bg, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.bg);
  scene.fog = new THREE.Fog(C.bg, 48, 120);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 200);
  const M = makeMaterials();

  // lights
  scene.add(new THREE.HemisphereLight(0x8d8178, 0x0b0a09, 0.35));
  const key = new THREE.SpotLight(0xffe0c2, 3.6, 0, 0.55, 0.85, 0);
  key.position.set(-16, 30, 16); key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
  key.shadow.camera.near = 10; key.shadow.camera.far = 80;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xbfcbd6, 1.5); rim.position.set(14, 10, -22); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffc9a3, 0.28); fill.position.set(18, 4, 20); scene.add(fill);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), M.ground);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -3.35; ground.receiveShadow = true; scene.add(ground);

  // hand root, posed in world
  const hand = new THREE.Group();
  // forearm rises toward the hand; the elbow flexes in the picture plane. roll turns the palm up (+) or the device toward the viewer (-)
  const reachQuat = (roll) => {
    const F = new V3(Math.cos(REACH.rise), Math.sin(REACH.rise), 0);
    const P = new V3(-Math.sin(REACH.rise), Math.cos(REACH.rise), 0).applyAxisAngle(F, roll);
    const Y = P.clone().negate(), X = new V3().crossVectors(Y, F);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, F));
  };
  const tableQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2 + 0.5, 0));
  const tablePos = new V3(0, 1.9, 0), reachPos = new V3().fromArray(REACH.pos);
  hand.scale.x = -1; // mirror: thumb side faces the camera
  scene.add(hand);
  const wrist = new THREE.Group(); // allows a little wrist extension
  hand.add(wrist);
  // built in the reach wrist pose (the fingertip path is recorded in it); setStance() eases it in and out
  wrist.rotation.x = REACH.wrist; wrist.scale.setScalar(1.1);

  const handOutlines = [], partOutlines = [], edgeLines = [];
  const outlineHand = outlineMaterial(0x8a8178, 0.05);
  const outlinePart = outlineMaterial(0xece5d9, 0.045);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xece5d9, transparent: true, opacity: 0, depthWrite: false });
  const axisMat = new THREE.LineDashedMaterial({ color: 0x8a8178, dashSize: 0.35, gapSize: 0.28, transparent: true, opacity: 0, depthWrite: false });

  function skinMesh(geo, parent, mat = M.skin) {
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m);
    const o = new THREE.Mesh(geo, outlineHand); o.visible = false; parent.add(o); handOutlines.push(o);
    return m;
  }
  function partMesh(geo, mat, parent, edges = true) {
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m);
    const o = new THREE.Mesh(geo, outlinePart); o.visible = false; m.add(o); partOutlines.push(o);
    if (edges) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 32), edgeMat); e.visible = false; m.add(e); edgeLines.push(e); }
    return m;
  }

  // ----- anatomy -----
  skinMesh(palmGeo(), wrist);

  const fingers = FINGERS.map((def) => {
    const root = new THREE.Group(); root.position.fromArray(def.base); root.rotation.y = def.yaw; wrist.add(root);
    const bones = []; let parent = root;
    def.L.forEach((L, i) => {
      const j = new THREE.Group(); if (i > 0) j.position.z = def.L[i - 1]; parent.add(j);
      skinMesh(phalanxGeo(L, def.r[i], def.r[i + 1], i === 2 ? 1.05 : 0.85), j);
      bones.push(j); parent = j;
    });
    const d = bones[2], L = def.L[2], r = def.r[3];
    const nail = new THREE.Mesh(nailGeo(L, def.r[2], r, r * 1.05), M.nail); nail.castShadow = true; d.add(nail);
    const tip = new THREE.Object3D(); tip.position.set(0, -0.15, L + r * 0.95); d.add(tip);
    return { def, root, bones, tip };
  });

  const thumbRoot = new THREE.Group(); thumbRoot.position.fromArray(THUMB.base);
  thumbRoot.rotation.set(0.3, -0.6, 0.95, 'YXZ'); wrist.add(thumbRoot);
  const thumbBones = []; { let parent = thumbRoot;
    THUMB.L.forEach((L, i) => {
      const j = new THREE.Group(); if (i > 0) j.position.z = THUMB.L[i - 1]; parent.add(j);
      skinMesh(phalanxGeo(L, THUMB.r[i], THUMB.r[i + 1], i === 2 ? 1.05 : 0.85), j);
      thumbBones.push(j); parent = j;
    });
    const L = THUMB.L[2], r = THUMB.r[3];
    const nail = new THREE.Mesh(nailGeo(L, THUMB.r[2], r, r * 1.05, 0.66, 0.52), M.nail); nail.castShadow = true; thumbBones[2].add(nail);
  }
  const thumbTip = new THREE.Object3D(); thumbTip.position.set(0, -0.2, THUMB.L[2] + 0.8); thumbBones[2].add(thumbTip);

  // ----- wearable -----
  const parts = []; // { obj, base:V3, off:V3, delay }
  const addPart = (obj, off, delay = 0) => { parts.push({ obj, base: obj.position.clone(), off: new V3(...off), delay }); return obj; };
  const anchors = {}; // named Object3D

  // wrist anchor cuff
  const cuffZ = -7.2, cuffR = forearmR(cuffZ);
  const cuff = new THREE.Group(); cuff.position.set(0, FA_Y, cuffZ); hand.add(cuff);
  const cuffShell = new THREE.Group(); cuff.add(cuffShell); cuffShell.rotation.x = -Math.PI / 2; cuffShell.scale.set(FA_SX, 1, FA_SY);
  partMesh(ringGeo(cuffR + 0.02, 0.32, 2.7, 0.12), M.graphite, cuffShell);
  const lip1 = partMesh(ringGeo(cuffR + 0.33, 0.05, 0.22, 0.02), M.metal, cuffShell, false); lip1.position.y = 1.15;
  const lip2 = partMesh(ringGeo(cuffR + 0.33, 0.05, 0.22, 0.02), M.metal, cuffShell, false); lip2.position.y = -1.15;
  addPart(cuff, [0, -0.6, -4.2], 0);
  const cuffTop = cuffR * FA_SY + 0.34;
  anchors.imu = new THREE.Object3D(); anchors.imu.position.set(cuffR * FA_SX * 0.82, -0.35, 0.4); cuff.add(anchors.imu);
  { const pod = partMesh(new RoundedBoxGeometry(0.6, 1.2, 1.5, 3, 0.18), M.graphite, cuff); pod.position.set(cuffR * FA_SX + 0.3, -0.2, 0); }

  // drive module on the dorsal cuff
  const module = new THREE.Group(); module.position.set(0, FA_Y + cuffTop + 0.5, cuffZ + 0.3); hand.add(module);
  partMesh(bend(new RoundedBoxGeometry(4.2, 0.9, 4.6, 4, 0.3), 0.04), M.metal, module);
  { const lid = partMesh(bend(new RoundedBoxGeometry(3.2, 0.16, 3.4, 3, 0.07), 0.04), M.graphite, module); lid.position.set(0, 0.42, -0.3); }
  { const base = partMesh(bend(new RoundedBoxGeometry(4.6, 0.3, 4.9, 3, 0.13), 0.06), M.graphite, module); base.position.y = -0.52; }
  const ports = [];
  for (let i = 0; i < 5; i++) {
    const x = -1.7 + i * 0.85;
    const port = partMesh(new THREE.CylinderGeometry(0.17, 0.17, 0.35, 20), M.graphite, module, false);
    port.rotation.x = Math.PI / 2; port.position.set(x, -0.05, 2.35);
    const a = new THREE.Object3D(); a.position.set(x, -0.05, 2.55); module.add(a); ports.push(a);
  }
  anchors.module = new THREE.Object3D(); anchors.module.position.set(-1.2, 0.6, 0.2); module.add(anchors.module);
  addPart(module, [0, 4.6, -3.2], 0.05);


  // ----- arm: one continuous swept form from wrist to shoulder, with a natural elbow bend -----
  const ELBOW_Z = -28.6, UA_LEN = 36, TABLE_BEND = 0.38;
  const elbowP = new V3(0, FA_Y, ELBOW_Z);
  // upper arm: triceps line stays fairly straight; the biceps swells toward the inside of the elbow
  const upperR = (d) => 3.3 + 0.35 * Math.exp(-((d - 13) ** 2) / 50) + 0.55 * Math.exp(-((d - 30) ** 2) / 24) + d * 0.012;
  const bicepD = (d) => 1.15 * Math.exp(-((d - 10.5) ** 2) / 30);
  const ringR = (d) => upperR(d) + bicepD(d); // straps hug the biceps: radius grows, centre shifts toward it
  const UA_SX = 1.18, UA_SY = 0.98;
  // forearm cross-section: flat at the wrist, rounder toward the elbow
  const sect = (z) => { const k = ss(-12, -26, z); return { r: forearmR(z), sx: lerp(FA_SX, UA_SX, k), sy: lerp(FA_SY, UA_SY, k) }; };
  function armGeo(bend) {
    const uaDir = new V3(0, Math.sin(bend), -Math.cos(bend)), palmSide = new V3(0, -Math.cos(bend), -Math.sin(bend));
    const BS = Math.sign(bend) || 1, bw = Math.min(1, Math.abs(bend) / 0.3);
    const P0 = new V3(0, FA_Y, ELBOW_Z + 3.4), P2 = elbowP.clone().addScaledVector(uaDir, 3.4);
    const samples = [];
    // rounded start tucked inside the palm
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2, z = -2.2 + 1.4 * Math.cos(a); const q = sect(-2.2); samples.push({ c: new V3(0, FA_Y, z), t: new V3(0, 0, -1), r: Math.max(0.01, q.r * Math.sin(a)), sx: q.sx, sy: q.sy, el: 0 }); }
    for (let z = -2.5; z > P0.z; z -= 0.35) { const q = sect(z); samples.push({ c: new V3(0, FA_Y, z), t: new V3(0, 0, -1), ...q, el: 0 }); }
    const qa = sect(P0.z), rb = upperR(3.4);
    for (let i = 0; i <= 40; i++) {
      const u = i / 40, w = 1 - u;
      const c = P0.clone().multiplyScalar(w * w).addScaledVector(elbowP, 2 * w * u).addScaledVector(P2, u * u);
      const t = elbowP.clone().sub(P0).multiplyScalar(2 * w).addScaledVector(P2.clone().sub(elbowP), 2 * u).normalize();
      samples.push({ c, t, r: lerp(qa.r, rb, ss(0, 1, u)) + 0.15 * Math.sin(Math.PI * u), sx: lerp(qa.sx, UA_SX, u), sy: lerp(qa.sy, UA_SY, u), el: Math.sin(Math.PI * u) * bw });
    }
    const ua = (d, r) => ({ c: elbowP.clone().addScaledVector(uaDir, d).addScaledVector(palmSide, bicepD(d) * ss(3.4, 6, d)), t: uaDir.clone(), r, sx: UA_SX, sy: UA_SY, el: 0 });
    for (let d = 3.7; d <= UA_LEN; d += 0.4) samples.push(ua(d, upperR(d) + bicepD(d) * ss(3.4, 6, d)));
    // rounded shoulder end
    for (let i = 1; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; samples.push(ua(UA_LEN + 2.4 * Math.sin(a), Math.max(0.01, upperR(UA_LEN) * Math.cos(a)))); }
    const N = 72, X = new V3(1, 0, 0), pos = [], idx = [];
    samples.forEach((sm) => {
      const up = new V3().crossVectors(X, sm.t).normalize();
      for (let k = 0; k < N; k++) {
        const a = (k / N) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        // the point of the elbow sits on the outside of the bend, with a soft crease on the inside
        const out = Math.max(0, -sa * BS), inn = Math.max(0, sa * BS);
        const rr = sm.r * (1 + sm.el * (0.16 * Math.pow(out, 3) * Math.exp(-ca * ca * 3) - 0.07 * Math.pow(inn, 2)));
        const p = sm.c.clone().addScaledVector(X, ca * rr * sm.sx).addScaledVector(up, sa * rr * sm.sy);
        pos.push(p.x, p.y, p.z);
      }
    });
    for (let j = 0; j < samples.length - 1; j++) for (let k = 0; k < N; k++) {
      const a = j * N + k, b = j * N + ((k + 1) % N), c = a + N, d = b + N;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const armMesh = skinMesh(armGeo(TABLE_BEND), hand), armOutline = handOutlines[handOutlines.length - 1];
  const upper = new THREE.Group(); upper.position.copy(elbowP); upper.rotation.x = TABLE_BEND; hand.add(upper);
  const strutBetween = (a, b, w, h, mat, parent) => {
    const len = a.distanceTo(b);
    const m = partMesh(new RoundedBoxGeometry(w, h, len, 3, Math.min(w, h) * 0.4), mat, parent);
    m.position.copy(a).lerp(b, 0.5); m.quaternion.setFromUnitVectors(new V3(0, 0, 1), b.clone().sub(a).normalize()); return m;
  };
  hand.updateMatrixWorld(true);
  const sideX = (z) => { const q = sect(z); return q.r * q.sx + 0.4; };
  // a band around the limb: ring scaled to the cross-section, with an optional routing block on top
  const band = (parent, r, sx, sy, width, mat, block) => {
    const sh = new THREE.Group(); sh.rotation.x = -Math.PI / 2; sh.scale.set(sx, 1, sy); parent.add(sh);
    partMesh(ringGeo(r + 0.02, 0.2, width, 0.08), mat, sh);
    if (!block) return null;
    const blk = partMesh(new RoundedBoxGeometry(1.1, 0.42, Math.max(1.0, width + 0.2), 3, 0.13), M.graphite, parent); blk.position.y = r * sy + 0.38;
    const a = new THREE.Object3D(); a.position.set(0, r * sy + 0.68, 0); parent.add(a); return a;
  };
  // sleeve: straps spaced along the forearm, the bundle runs through each one
  const sleeveA = [];
  [-10.8, -14.4, -18, -21.6, -25.0].forEach((z, i) => {
    const g = new THREE.Group(); g.position.set(0, FA_Y, z); hand.add(g);
    const q = sect(z);
    const a = band(g, q.r, q.sx, q.sy, i === 2 ? 1.7 : 1.0, i % 2 ? M.graphite : M.polymer, true);
    sleeveA.push(a);
    addPart(g, [0, -2.6 - i * 0.25, 0], 0.06 + i * 0.02);
  });
  anchors.fguide = sleeveA[2];
  // lateral forearm strut to the elbow hinge
  const fstrut = new THREE.Group(); hand.add(fstrut);
  strutBetween(new V3(sideX(-9), FA_Y, -9), new V3(sideX(ELBOW_Z + 3) + 0.4, FA_Y, ELBOW_Z + 0.4), 0.5, 1.0, M.graphite, fstrut);
  addPart(fstrut, [3.2, 0, 0], 0.12);
  // elbow hinge on the outer side of the joint
  const hingeX = upperR(0) * UA_SX + 0.95;
  const hinge = new THREE.Group(); hinge.position.set(hingeX, FA_Y, ELBOW_Z); hand.add(hinge);
  { const d1 = partMesh(new THREE.CylinderGeometry(1.7, 1.7, 0.7, 48), M.metal, hinge); d1.rotation.z = Math.PI / 2;
    const d2 = partMesh(new THREE.CylinderGeometry(1.15, 1.15, 0.9, 40), M.graphite, hinge); d2.rotation.z = Math.PI / 2;
    const d3 = partMesh(new THREE.CylinderGeometry(0.35, 0.35, 1.05, 24), M.metal, hinge, false); d3.rotation.z = Math.PI / 2; }
  anchors.elbow = new THREE.Object3D(); anchors.elbow.position.set(0.6, 1.4, 0); hinge.add(anchors.elbow);
  addPart(hinge, [5, 0.5, 0], 0.18);
  // upper-arm strut, upper sleeve straps, bicep cuff with the main drive pack
  const ustrut = new THREE.Group(); upper.add(ustrut);
  strutBetween(new V3(hingeX - 0.4, 0, -0.4), new V3(ringR(13) * UA_SX + 0.45, -bicepD(13), -13), 0.5, 1.0, M.graphite, ustrut);
  addPart(ustrut, [3.2, 0, 0], 0.16);
  const upperA = [];
  [5.8, 20.6].forEach((d, i) => {
    const g = new THREE.Group(); g.position.set(0, -bicepD(d), -d); upper.add(g);
    upperA.push(band(g, ringR(d), UA_SX, UA_SY, 1.0, i % 2 ? M.graphite : M.polymer, true));
    addPart(g, [0, -2.8, 0], 0.18 + i * 0.02);
  });
  const bZ = -15.5, bR = upperR(15.5), bRing = ringR(15.5);
  const bicep = new THREE.Group(); bicep.position.set(0, 0, bZ); upper.add(bicep);
  { const sh = new THREE.Group(); sh.rotation.x = -Math.PI / 2; sh.scale.set(UA_SX, 1, UA_SY); bicep.add(sh);
    sh.position.y = -bicepD(15.5);
    partMesh(ringGeo(bRing + 0.03, 0.36, 4.6, 0.14), M.graphite, sh);
    const l1 = partMesh(ringGeo(bRing + 0.38, 0.06, 0.26, 0.02), M.metal, sh, false); l1.position.y = 2.0;
    const l2 = partMesh(ringGeo(bRing + 0.38, 0.06, 0.26, 0.02), M.metal, sh, false); l2.position.y = -2.0; }
  anchors.emg = new THREE.Object3D(); anchors.emg.position.set(-bRing * UA_SX * 0.7, -bicepD(15.5) - bRing * UA_SY * 0.7, 0); bicep.add(anchors.emg);
  addPart(bicep, [0, -3.5, -1.5], 0.2);
  { const g = new THREE.Group(); g.position.set(0, 0, -24); upper.add(g); band(g, upperR(24), UA_SX, UA_SY, 1.2, M.polymer, false); addPart(g, [0, -3, 0], 0.22); }
  const pack = new THREE.Group(); pack.position.set(0, bR * UA_SY + 0.36 + 0.9, bZ); upper.add(pack);
  partMesh(bend(new RoundedBoxGeometry(5.6, 1.5, 7.2, 4, 0.45), 0.05), M.metal, pack);
  { const lid = partMesh(bend(new RoundedBoxGeometry(4.4, 0.2, 5.6, 3, 0.08), 0.05), M.graphite, pack); lid.position.set(0, 0.74, -0.2);
    const base = partMesh(bend(new RoundedBoxGeometry(6.0, 0.36, 7.6, 3, 0.15), 0.07), M.graphite, pack); base.position.y = -0.82;
    for (let i = 0; i < 3; i++) { const fin = partMesh(new RoundedBoxGeometry(3.6, 0.12, 0.3, 2, 0.05), M.metal, pack, false); fin.position.set(0, 0.86, 1.6 + i * 0.5); } }
  anchors.pack = new THREE.Object3D(); anchors.pack.position.set(0, 0.2, 3.7); pack.add(anchors.pack);
  addPart(pack, [0, 5.5, 0], 0.24);
  anchors.moduleBack = new THREE.Object3D(); anchors.moduleBack.position.set(0, 0.0, -2.4); module.add(anchors.moduleBack);
  // the bundle rides over the top of the elbow rather than through the hinge
  const elbowTop = new THREE.Object3D(); elbowTop.position.set(0, upperR(0) * UA_SY + 0.55, 0.2); upper.add(elbowTop);
  anchors.armRoute = [anchors.pack, ...upperA.slice().reverse(), elbowTop, ...sleeveA.slice().reverse(), anchors.moduleBack];

  // dorsal guide plate across the metacarpals, held by a palm strap
  const dorsal = new THREE.Group(); dorsal.position.set(-0.1, 1.42, 2.2); wrist.add(dorsal);
  { const plate = partMesh(bend(new RoundedBoxGeometry(6.0, 0.18, 1.8, 3, 0.08), 0.035), M.polymer, dorsal); plate.rotation.x = 0.06; }
  const kb = [];
  FINGERS.forEach((f, i) => {
    const x = f.base[0] * 0.95 + 0.1;
    const blk = partMesh(new RoundedBoxGeometry(0.62, 0.3, 0.8, 2, 0.1), M.graphite, dorsal); blk.position.set(x, 0.24 - 0.035 * x * x, 0.3);
    const ey = partMesh(new THREE.TorusGeometry(0.13, 0.04, 10, 24), M.metal, dorsal, false); ey.position.set(x, 0.48 - 0.035 * x * x, 0.55);
    const a = new THREE.Object3D(); a.position.copy(ey.position); dorsal.add(a); kb.push(a);
  });
  { // strap: superellipse band around the palm
    const shape = new THREE.Shape(), hole = new THREE.Path();
    const sup = (path, ax, ay, n) => { for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; const c = Math.cos(a), s = Math.sin(a); const x = ax * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), y = ay * Math.sign(s) * Math.pow(Math.abs(s), 2 / n); i ? path.lineTo(x, y) : path.moveTo(x, y); } };
    sup(shape, 4.32, 1.66, 3.2); sup(hole, 4.2, 1.55, 3.2); shape.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2, curveSegments: 4 });
    const strap = partMesh(g, M.graphite, dorsal); strap.position.set(0.05, -1.25, -0.65);
  }
  addPart(dorsal, [0, 3.0, 0.4], 0.1);
  anchors.dorsal = new THREE.Object3D(); anchors.dorsal.position.set(-3.2, 0.1, -0.6); dorsal.add(anchors.dorsal);

  // finger guides: proximal guide with housing, middle guide with cable anchor
  const guideAnchors = [];
  const fingerGuides = (bones, def, isThumb) => {
    const out = [];
    const segs = isThumb ? [1] : [0, 1];
    segs.forEach((si, k) => {
      const L = def.L[si];
      const zc = L * (si === 0 || isThumb ? 0.52 : 0.46);
      const r = lerp(def.r[si], def.r[si + 1], zc / L) * (isThumb ? 1 : 1);
      const g = new THREE.Group(); g.position.set(0, 0, zc); bones[si].add(g);
      partMesh(saddleGeo(r, isThumb ? 1.1 : (k === 0 ? 1.25 : 0.95)), M.polymer, g);
      const top = (r + 0.26) * 0.84;
      let ay = top + 0.14;
      if (k === 0 || isThumb) {
        const h = partMesh(new RoundedBoxGeometry(0.92, 0.42, 1.25, 3, 0.13), M.graphite, g); h.position.y = top + 0.16;
        const pin = partMesh(new THREE.CylinderGeometry(0.16, 0.16, 1.02, 18), M.metal, g, false); pin.rotation.z = Math.PI / 2; pin.position.set(0, top + 0.12, -0.25);
        ay = top + 0.5;
      }
      const ey = partMesh(new THREE.TorusGeometry(0.12, 0.035, 10, 24), M.metal, g, false); ey.position.y = ay;
      const a = new THREE.Object3D(); a.position.y = ay; g.add(a);
      addPart(g, [0, 1.5 + k * 0.9, 0], 0.15 + k * 0.08);
      out.push(a);
    });
    return out;
  };
  fingers.forEach((f) => guideAnchors.push(fingerGuides(f.bones, f.def, false)));
  const thumbGuide = fingerGuides(thumbBones, THUMB, true);

  // cables
  const cables = [];
  const cableMatIdx = M.cable.clone();
  function cableFor(i) {
    const mat = i === 0 ? cableMatIdx : M.cable;
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat); mesh.castShadow = true; hand.add(mesh);
    return mesh;
  }
  const cableRoutes = fingers.map((f, i) => ({ mesh: cableFor(i), pts: [ports[i + 1], kb[i], ...guideAnchors[i]] }));
  const thumbWay = new THREE.Object3D(); thumbWay.position.set(0, THUMB.r[1] * 0.84 + 0.25, THUMB.L[0] * 0.55); thumbBones[0].add(thumbWay);
  cableRoutes.push({ mesh: cableFor(9), pts: [ports[0], anchors.dorsal, thumbWay, thumbGuide[0]] });
  cableRoutes.push({ mesh: cableFor(10), pts: anchors.armRoute, r: 0.2, noLift: true });

  // explode axes (dashed), one per part, in hand space
  const axisGeo = new THREE.BufferGeometry(); axisGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(parts.length * 6), 3));
  const axisLines = new THREE.LineSegments(axisGeo, axisMat); axisLines.frustumCulled = false; hand.add(axisLines);

  // assist trajectory (index fingertip path), hand-local
  const traj = (() => {
    const f = fingers[0], keep = f.bones.map((b) => b.rotation.x), pts = [];
    const tmp = new V3();
    for (let i = 0; i <= 48; i++) {
      const a = indexFlex(i / 48); f.bones.forEach((b, j) => (b.rotation.x = a[j]));
      hand.updateMatrixWorld(true); f.tip.getWorldPosition(tmp); pts.push(hand.worldToLocal(tmp.clone()));
    }
    f.bones.forEach((b, j) => (b.rotation.x = keep[j]));
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const ghost = new THREE.Line(g, new THREE.LineDashedMaterial({ color: 0xa69c90, dashSize: 0.3, gapSize: 0.22, transparent: true, opacity: 0, depthTest: false }));
    ghost.computeLineDistances(); ghost.renderOrder = 10;
    const curve = new THREE.CatmullRomCurve3(pts);
    const live = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.05, 6, false), new THREE.MeshBasicMaterial({ color: C.accent, transparent: true, opacity: 0, depthTest: false }));
    live.renderOrder = 11;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 16), live.material);
    head.renderOrder = 11;
    hand.add(ghost, live, head);
    return { ghost, live, head, curve, pts };
  })();

  // ----- state -----
  const tmp = new V3(), tmp2 = new V3();
  let W = 1, H = 1;
  let lastCableKey = '';

  function rebuildCables() {
    hand.updateMatrixWorld(true);
    for (const r of cableRoutes) {
      const pts = r.pts.map((a) => hand.worldToLocal(a.getWorldPosition(new V3())));
      // lift the run between port and dorsal guide over the back of the hand
      const p0 = pts[0], p1 = pts[1];
      const mid = p0.clone().lerp(p1, 0.5); mid.y += r.noLift ? 0.3 : 0.6;
      const all = [p0, mid, ...pts.slice(1)];
      const curve = new THREE.CatmullRomCurve3(all, false, 'centripetal');
      r.mesh.geometry.dispose();
      r.mesh.geometry = new THREE.TubeGeometry(curve, r.r ? 140 : 90, r.r || 0.06, r.r ? 10 : 6, false);
    }
  }

  // 0 = resting on the table, 1 = raised in profile; roll turns the raised arm about the forearm
  let stanceKey = '', armBend = TABLE_BEND;
  function setStance(st, roll = REACH.roll) {
    if (tableOnly) st = 0;
    hand.quaternion.copy(tableQuat).slerp(reachQuat(roll), st);
    hand.position.copy(tablePos).lerp(reachPos, st);
    wrist.rotation.x = REACH.wrist * st; wrist.scale.setScalar(lerp(1, 1.1, st));
    const bend = Math.round(lerp(TABLE_BEND, -REACH.bend, st) * 200) / 200;
    if (bend !== armBend) {
      armBend = bend; upper.rotation.x = bend;
      armMesh.geometry.dispose(); armMesh.geometry = armOutline.geometry = armGeo(bend);
    }
    const gy = lerp(-3.35, -24, ss(0, 0.5, st)), rs = st < 0.5;
    ground.position.y = gy;
    if (ground.receiveShadow !== rs) { ground.receiveShadow = rs; M.ground.needsUpdate = true; }
    scene.fog.near = lerp(48, 90, st); scene.fog.far = lerp(120, 190, st);
    stanceKey = st.toFixed(3) + ',' + roll.toFixed(3);
  }

  function setPose(p) {
    fingers.forEach((f, i) => f.bones.forEach((b, j) => (b.rotation.x = p.f[i][j])));
    thumbBones.forEach((b, j) => (b.rotation.x = p.t[j]));
  }

  // camera keyframes: target (world), azimuth, elevation, distance, fov, horizontal shift
  // intro (table stance) shot, then the raised-arm chapter shots
  const KF = {
    hero: { t: [8, 3.6, -5], az: -0.4, el: 0.36, d: 74, fov: 28, sx: 0.22 },
    sense: { t: [0, 4, 1], az: 0.25, el: 0.14, d: 78, fov: 28, sx: 0.1, mt: [5, 5, 1], md: 92 },
    adaptClose: { t: [9, 6, 2], az: 0.4, el: 0.2, d: 50, fov: 28, sx: 0.2, mt: [11, 6, 3], md: 64 },
    adapt: { t: [-2, 4, 0], az: 0.25, el: 0.2, d: 86, fov: 28, sx: 0.16, mt: [3, 4, 0], md: 104 },
    assist: { t: [11, 7, 4], az: 0.55, el: 0.22, d: 44, fov: 28, sx: 0.28, mt: [12, 9, 4], md: 40 },
    learn: { t: [11, 7, 4], az: 0.8, el: 0.3, d: 46, fov: 28, sx: 0.28, mt: [12, 9, 4], md: 42 },
  };
  const mt = (k) => k.mt || k.t, md = (k) => k.md || k.d;
  const blendKF = (a, b, t) => ({ t: a.t.map((v, i) => lerp(v, b.t[i], t)), mt: mt(a).map((v, i) => lerp(v, mt(b)[i], t)), md: lerp(md(a), md(b), t), az: lerp(a.az, b.az, t), el: lerp(a.el, b.el, t), d: lerp(a.d, b.d, t), fov: lerp(a.fov, b.fov, t), sx: lerp(a.sx, b.sx, t) });
  const STOPS = [[0, 'hero'], [0.12, 'sense'], [0.27, 'sense'], [0.35, 'adaptClose'], [0.41, 'adaptClose'], [0.48, 'adapt'], [0.53, 'adapt'], [0.6, 'assist'], [0.74, 'assist'], [0.8, 'learn'], [1, 'learn']];
  function camAt(p) {
    for (let i = 0; i < STOPS.length - 1; i++) {
      const [p0, k0] = STOPS[i], [p1, k1] = STOPS[i + 1];
      if (p <= p1) return blendKF(KF[k0], KF[k1], ss(p0, p1, p));
    }
    return KF.learn;
  }

  function applyCamera(k, drift = 0, center = false) {
    const narrow = !center && W / H < 0.9;
    const d = narrow ? md(k) : k.d;
    const fovScale = narrow ? 1.5 : W / H < 1.25 ? 1.22 : 1;
    const az = k.az + drift, el = k.el;
    const target = new V3(...(narrow ? mt(k) : k.t));
    camera.position.set(target.x + d * Math.cos(el) * Math.sin(az), target.y + d * Math.sin(el), target.z + d * Math.cos(el) * Math.cos(az));
    camera.fov = k.fov * fovScale; camera.lookAt(target);
    if (narrow) camera.setViewOffset(W, H, 0, H * 0.2, W, H);
    else camera.setViewOffset(W, H, center ? 0 : -W * k.sx, 0, W, H);
    camera.updateProjectionMatrix();
  }

  function setDrawing(d, ghost) {
    M.skin.color.copy(C.skin).lerp(C.skinGhost, ghost);
    M.skin.sheen = 0.7 * (1 - ghost);
    M.nail.color.set(0xc79a88).lerp(C.skinGhost, ghost);
    outlineHand.uniforms.uOpacity.value = 0.55 * ghost;
    handOutlines.forEach((o) => (o.visible = ghost > 0.01));
    outlinePart.uniforms.uOpacity.value = 0.95 * d;
    partOutlines.forEach((o) => (o.visible = d > 0.01));
    edgeMat.opacity = 0.85 * d; edgeLines.forEach((e) => (e.visible = d > 0.01));
    M.graphite.color.copy(C.graphite).lerp(new THREE.Color(0x111010), d * 0.6);
    M.polymer.opacity = lerp(0.8, 0.5, d);
    axisMat.opacity = 0.7 * d;
  }

  function setExplode(e) {
    const pos = axisGeo.attributes.position;
    parts.forEach((pt, i) => {
      const k = ss(pt.delay, pt.delay + 0.85, e);
      pt.obj.position.copy(pt.base).addScaledVector(pt.off, k);
      pt.obj.parent.updateMatrixWorld(true);
      const a = hand.worldToLocal(pt.obj.parent.localToWorld(pt.base.clone()));
      const b = hand.worldToLocal(pt.obj.parent.localToWorld(pt.obj.position.clone()));
      pos.setXYZ(i * 2, a.x, a.y, a.z); pos.setXYZ(i * 2 + 1, b.x, b.y, b.z);
    });
    pos.needsUpdate = true; axisLines.computeLineDistances();
  }

  function setAssist(level, vis, u) {
    trajectoryVisible(vis);
    traj.live.material.opacity = level * vis;
    cableMatIdx.color.copy(C.cable).lerp(C.accent, level * vis);
    cableMatIdx.emissive.copy(C.accent).multiplyScalar(0.35 * level * vis);
    // head rides along the path at u
    const t = clamp(u, 0.001, 0.999);
    traj.curve.getPointAt(t, traj.head.position);
    const tan = traj.curve.getTangentAt(t);
    traj.head.quaternion.setFromUnitVectors(new V3(0, 1, 0), tan);
    traj.head.visible = level * vis > 0.02;
  }
  function trajectoryVisible(v) { traj.ghost.material.opacity = 0.8 * v; traj.ghost.visible = v > 0.01; traj.live.visible = v > 0.01; }

  // annotation anchors (world positions -> screen)
  const annot = {
    joint: guideAnchors[0][1], fit: guideAnchors[1][0], imu: anchors.imu, tension: kb[1],
    cuff: anchors.imu, module: anchors.module, dorsal: anchors.dorsal, guides: guideAnchors[2][0],
    elbow: anchors.elbow, emg: anchors.emg, pack: anchors.pack, hinge: anchors.elbow,
    tip: fingers[0].tip,
  };
  function project() {
    const out = {};
    for (const [k, o] of Object.entries(annot)) {
      o.getWorldPosition(tmp); tmp2.copy(tmp).project(camera);
      const x = (tmp2.x * 0.5 + 0.5) * W, y = (-tmp2.y * 0.5 + 0.5) * H;
      out[k] = { x, y, ok: tmp2.z < 1 && x > 24 && x < W - 24 && y > 70 && y < H - 24 };
    }
    return out;
  }

  // ----- public update -----
  // region: 'hero' (p = hero scroll 0..1) or 'seq' (p = sequence 0..1); time in seconds
  function update({ region = 'hero', p = 0, time = 0, idle = true, center = false } = {}) {
    // stance: intro rests on the table; the arm lifts into the raised pose as the chapters begin
    const st = region === 'hero' || tableOnly ? 0 : ss(0, 0.1, p);
    let pose = { f: RELAXED.f.map((a, i) => a.map((v, j) => lerp(v, CUPPED.f[i][j], st))), t: RELAXED.t.map((v, j) => lerp(v, CUPPED.t[j], st)) };
    let explode = 0, drawing = 0, ghost = 0, level = 0, vis = 0, u = 0, k, drift = 0;
    if (region === 'hero') {
      const breathe = idle ? Math.sin(time * 0.75) * 0.5 + 0.5 : 0.5;
      pose.f = pose.f.map((a, i) => a.map((v, j) => v + (breathe - 0.5) * 0.12 * (1 + j * 0.4) * (1 - i * 0.08)));
      pose.t = pose.t.map((v) => v + (breathe - 0.5) * 0.05);
      k = blendKF(KF.hero, { ...KF.hero, d: KF.hero.d * 0.86, el: KF.hero.el + 0.08 }, ss(0, 1, p));
      drift = idle ? Math.sin(time * 0.09) * 0.07 : 0;
      setStance(0);
    } else {
      k = camAt(p);
      explode = ss(0.3, 0.41, p) * (1 - ss(0.53, 0.59, p));
      drawing = ss(0.28, 0.36, p) * (1 - ss(0.54, 0.6, p));
      ghost = drawing;
      setStance(st, lerp(REACH.roll, REACH.show, ss(0.04, 0.16, p) * (1 - ss(0.54, 0.6, p))) - 0.55 * ss(0.27, 0.35, p) * (1 - ss(0.52, 0.58, p)));
      // index finger: extend for assist, one guided cycle, then three practice repetitions
      const ext = ss(0.57, 0.61, p);
      const s1 = clamp((p - 0.61) / 0.12), s2 = clamp((p - 0.77) / 0.18);
      if (p < 0.74) u = 0.5 - 0.5 * Math.cos(Math.PI * 2 * s1);
      else u = 0.5 - 0.5 * Math.cos(Math.PI * 2 * 3 * s2);
      const target = indexFlex(u);
      pose.f[0] = pose.f[0].map((v, j) => lerp(v, target[j], ext));
      vis = ss(0.58, 0.63, p) * (1 - ss(0.95, 0.99, p));
      const steps = [1, 0.55, 0.18];
      if (p < 0.77) level = 1; else { const q = s2 * 3; const i = Math.min(2, Math.floor(q)); const f = q - i; level = i < 2 && f > 0.85 ? lerp(steps[i], steps[i + 1], ss(0.85, 1, f)) : steps[i]; }
    }
    setPose(pose);
    setExplode(explode);
    setDrawing(drawing, ghost);
    hand.updateMatrixWorld(true);
    const ck = pose.f[0].concat(pose.f[1], pose.t, [explode]).map((v) => v.toFixed(3)).join(',') + stanceKey;
    if (ck !== lastCableKey) { rebuildCables(); lastCableKey = ck; }
    M.cable.opacity = 1;
    setAssist(level, vis, u);
    applyCamera(k, drift, center);
    key.target.position.set(0, -1, 2);
    renderer.render(scene, camera);
    return { anchors: project(), level, u, explode };
  }

  function resize(w, h) { W = Math.max(1, w); H = Math.max(1, h); renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); }

  // ----- stills for editorial imagery (used only to pre-render images) -----
  const props = new THREE.Group(); scene.add(props);
  function still(name) {
    props.clear(); props.visible = true;
    return name;
  }

  setStance(0);
  return { update, resize, setStance, renderer, scene, camera, hand, fingers, thumbBones, thumbTip, setPose, M, props, still, KF, applyCamera, setExplode, setDrawing, setAssist, rebuildCables, THREE, ground, wrist, parts };
}
