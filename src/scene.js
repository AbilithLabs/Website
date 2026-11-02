// Abilith concept scene: an articulated hand and arm wearing Hermes, a knit sleeve from the fingertips to the shoulder.
// Units are roughly centimetres. Hand-local axes: +Z toward the fingertips, +Y dorsal, -X thumb side.
// Hermes follows the white paper's v1 layout: a knit sleeve and glove, carbon only where the brakes push (a back-of-hand
// plate, a forearm cuff and an upper-arm cuff), a thin electrostatic brake on each finger, a 16-channel EMG band,
// 12 vibration cues in the knit, a grip-assist motor on the upper arm, and the battery, chip and radio at the shoulder.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const V2 = THREE.Vector2, V3 = THREE.Vector3;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const se = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);

// ---------- palette ----------
const C = {
  bg: 0x0b0a09,
  skin: new THREE.Color(0xb98d74),
  skinGhost: new THREE.Color(0x1c1917),
  knit: new THREE.Color(0xa19b91),
  knitGhost: new THREE.Color(0x181614),
  graphite: new THREE.Color(0x1f1d1b),
  carbon: new THREE.Color(0x4a4744),
  film: new THREE.Color(0x24211f),
  accent: new THREE.Color(0xd99a62),
};

// ---------- procedural textures ----------
// knit: stockinette, columns of interlocking V stitches, 16 x 16 stitches per tile, every stitch drawn a little
// differently so the yarn doesn't look printed. The sleeve is knit as a tube: a fixed count of stitches around that
// stretch where the arm is fuller. The glove is a finer gauge.
const KNIT_TILE = 16, KNIT_AROUND = 80, KNIT_ROW = 0.2, KNIT_BUMP = 0.9;
const GLOVE_SW = 0.2, GLOVE_RH = 0.16;
function canvasTexture(canvas, srgb = false) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function knitTextures() {
  const s = 256, w = s / KNIT_TILE, n = KNIT_TILE;
  const c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = '#1e1e1e'; g.fillRect(0, 0, s, s);
  g.filter = 'blur(0.7px)';
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jit = Array.from({ length: n * n }, () => [rnd(), rnd(), rnd()]);
  for (let j = -1; j <= n; j++) for (let i = -1; i <= n; i++) {
    const [a, b, d] = jit[((j + n) % n) * n + ((i + n) % n)];
    for (const side of [-1, 1]) {
      g.save(); g.translate((i + 0.5) * w + side * w * 0.22, (j + 0.5 + (a - 0.5) * 0.1) * w); g.rotate(side * (0.48 + (d - 0.5) * 0.12));
      const hi = Math.round(222 + 30 * b), mid = Math.round(122 + 26 * a);
      const grd = g.createRadialGradient(0, 0, 0, 0, 0, w * 0.6);
      grd.addColorStop(0, `rgb(${hi},${hi},${hi})`); grd.addColorStop(0.68, `rgb(${mid},${mid},${mid})`); grd.addColorStop(1, '#2a2a2a');
      g.fillStyle = grd; g.beginPath(); g.ellipse(0, 0, w * 0.23, w * 0.62, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  }
  // shade: the same stitches, lifted, so the gaps between them sit a little in shadow
  const c2 = document.createElement('canvas'); c2.width = c2.height = s;
  const g2 = c2.getContext('2d'); g2.drawImage(c, 0, 0); g2.fillStyle = 'rgba(255,255,255,0.72)'; g2.fillRect(0, 0, s, s);
  return { bump: canvasTexture(c), shade: canvasTexture(c2, true) };
}
// carbon: a 2 x 2 twill, 8 x 8 tows per tile
function twillTexture() {
  const s = 128, n = 8, w = s / n;
  const c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const across = (i + j) % 4 < 2;
    const grd = across ? g.createLinearGradient(0, j * w, 0, (j + 1) * w) : g.createLinearGradient(i * w, 0, (i + 1) * w, 0);
    grd.addColorStop(0, '#3a3a3a'); grd.addColorStop(0.5, '#b4b4b4'); grd.addColorStop(1, '#3a3a3a');
    g.fillStyle = grd; g.fillRect(i * w, j * w, w, w);
  }
  return canvasTexture(c, true);
}
// a soft round glow for the vibration cues
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function makeMaterials() {
  const knit = knitTextures(), twill = twillTexture();
  const fabric = { map: knit.shade, bumpMap: knit.bump, bumpScale: KNIT_BUMP, roughness: 0.82, sheen: 1, sheenColor: 0x8f877d, sheenRoughness: 0.45, envMapIntensity: 0.35 };
  return {
    skin: new THREE.MeshPhysicalMaterial({ color: C.skin.clone(), roughness: 0.58, sheen: 0.7, sheenColor: 0xffcfb4, sheenRoughness: 0.55, clearcoat: 0.06, clearcoatRoughness: 0.6, envMapIntensity: 0.35 }),
    nail: new THREE.MeshPhysicalMaterial({ color: 0xc79a88, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2, sheen: 0.3, sheenColor: 0xffe6dc, envMapIntensity: 0.6, side: THREE.DoubleSide }),
    knit: new THREE.MeshPhysicalMaterial({ color: C.knit.clone(), ...fabric }),
    glove: new THREE.MeshPhysicalMaterial({ color: C.knit.clone(), ...fabric }),
    carbon: new THREE.MeshPhysicalMaterial({ color: C.carbon.clone(), map: twill, roughness: 0.42, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1 }),
    film: new THREE.MeshPhysicalMaterial({ color: C.film.clone(), roughness: 0.34, metalness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.16, envMapIntensity: 0.7 }),
    brakeIdx: new THREE.MeshPhysicalMaterial({ color: C.film.clone(), roughness: 0.34, metalness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.16, envMapIntensity: 0.7, emissive: 0x000000 }),
    graphite: new THREE.MeshPhysicalMaterial({ color: C.graphite.clone(), roughness: 0.46, metalness: 0.25, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 0.8 }),
    metal: new THREE.MeshStandardMaterial({ color: 0xbdb6ab, metalness: 1, roughness: 0.3, envMapIntensity: 1.1 }),
    cue: new THREE.MeshPhysicalMaterial({ color: C.knit.clone().multiplyScalar(0.34), roughness: 0.7, envMapIntensity: 0.3 }),
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

// top of the palm (the back of the hand) at hand-local (x, z): the palm shape sampled over its upper half into a grid
const palmTop = (() => {
  const X0 = -5, Z0 = -5, D = 0.1, NX = 101, NZ = 106, top = new Float32Array(NX * NZ).fill(-Infinity);
  for (let j = 0; j <= 160; j++) for (let i = 0; i < 320; i++) {
    const th = (j / 160) * Math.PI / 2, ph = (i / 320) * Math.PI * 2;
    const [x, y, z] = palmShape(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
    const gx = Math.round((x - X0) / D), gz = Math.round((z - Z0) / D);
    if (gx >= 0 && gx < NX && gz >= 0 && gz < NZ) top[gz * NX + gx] = Math.max(top[gz * NX + gx], y);
  }
  for (let pass = 0; pass < 4; pass++) for (let gz = 0; gz < NZ; gz++) for (let gx = 0; gx < NX; gx++) {
    const k = gz * NX + gx; if (top[k] > -Infinity) continue;
    let m = -Infinity; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = gx + dx, z = gz + dz; if (x >= 0 && x < NX && z >= 0 && z < NZ) m = Math.max(m, top[z * NX + x]); }
    top[k] = m;
  }
  const at = (gx, gz) => top[clamp(gz, 0, NZ - 1) * NX + clamp(gx, 0, NX - 1)];
  return (x, z) => {
    const fx = (x - X0) / D, fz = (z - Z0) / D, ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
    return lerp(lerp(at(ix, iz), at(ix + 1, iz), tx), lerp(at(ix, iz + 1), at(ix + 1, iz + 1), tx), tz);
  };
})();

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
// push every vertex out along its normal: a layer of fabric over the same shape
function offsetGeo(g, d) {
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * d, p.getY(i) + n.getY(i) * d, p.getZ(i) + n.getZ(i) * d);
  g.computeVertexNormals(); return g;
}
// turn an indexed closed mesh inside out if its triangles face inward
function faceOutward(g) {
  const p = g.attributes.position, ix = g.index, a = new V3(), b = new V3(), c = new V3();
  let vol = 0;
  for (let i = 0; i < ix.count; i += 3) { a.fromBufferAttribute(p, ix.getX(i)); b.fromBufferAttribute(p, ix.getX(i + 1)); c.fromBufferAttribute(p, ix.getX(i + 2)); vol += a.dot(b.cross(c)); }
  if (vol < 0) for (let i = 0; i < ix.count; i += 3) { const t = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, t); }
  return g;
}
// A shell that follows the limb: an arc band (angles a0..a1, PI/2 = +Y) extruded along sec(t), t = 0..1.
// sec(t) gives the limb section: { c: centre, X, Y: section axes, A: axis (t increasing), r, sx, sy }.
function limbShell(sec, { len, off = 0.18, thick = 0.2, a0 = -0.2, a1 = Math.PI + 0.2, steps = 14, bevel = 0.05, tile = 1.6 } = {}) {
  const R = 10, depth = 10, s = new THREE.Shape();
  s.absarc(0, 0, R + thick, a0, a1, false);
  s.absarc(0, 0, R, a1, a0, true);
  let g = new THREE.ExtrudeGeometry(s, { depth, steps, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 72 });
  const p = g.attributes.position, uv = g.attributes.uv, v = new V3();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let a = Math.atan2(y, x); while (a < a0 - 0.5) a += Math.PI * 2;
    const rho = Math.hypot(x, y) - R, t = clamp(z / depth), dz = z < 0 ? z : z > depth ? z - depth : 0;
    const q = sec(t), rr = q.r + off + rho;
    v.copy(q.c).addScaledVector(q.X, Math.cos(a) * rr * q.sx).addScaledVector(q.Y, Math.sin(a) * rr * q.sy).addScaledVector(q.A, dz);
    p.setXYZ(i, v.x, v.y, v.z);
    uv.setXY(i, a * (q.r + off) / tile, t * len / tile);
  }
  g.deleteAttribute('normal');
  g = mergeVertices(g);
  faceOutward(g);
  g.computeVertexNormals();
  return g;
}

// Knit UVs for the glove's palm: each face takes the flat projection it faces most squarely (from above for the back
// and palm, from the side for the edges), so the stitches run along the hand and the edges read as side seams.
function knitUVPalm(g, sw, rh) {
  g = g.toNonIndexed();
  const p = g.attributes.position, uv = new Float32Array(p.count * 2), a = new V3(), b = new V3(), c = new V3(), n = new V3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    n.subVectors(c, b).cross(new V3().subVectors(a, b));
    const top = Math.abs(n.y) >= Math.abs(n.x);
    [a, b, c].forEach((q, k) => { uv[(i + k) * 2] = (top ? q.x : q.y + 7) / (sw * KNIT_TILE); uv[(i + k) * 2 + 1] = q.z / (rh * KNIT_TILE); });
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
// Knit UVs for a finger segment (a lathe along Z): a whole number of stitches around, rows by length
function knitUVFinger(g, r, sw, rh) {
  const uv = g.attributes.uv, p = g.attributes.position;
  const around = Math.max(1, Math.round((2 * Math.PI * r * 0.96) / sw)) / KNIT_TILE;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * around, p.getZ(i) / (rh * KNIT_TILE));
  return g;
}

// A thin rounded plate over a height field: outline = a superellipse trapezoid (half-width w0 at z0 to w1 at z1),
// top and bottom follow height(x, z), joined by a half-round edge. Dense everywhere, so it can bend with the hand.
function plateGeo({ w0, w1, z0, z1, n = 5, thick = 0.18, round = 0.07, height = () => 0, tile = 1.6, NA = 112 }) {
  const zc = (z0 + z1) / 2, hl = (z1 - z0) / 2;
  const outline = (a) => {
    const c = Math.cos(a), s = Math.sin(a), z = zc + hl * se(s, 2 / n), w = lerp(w0, w1, (z - z0) / (z1 - z0));
    return new V2(w * se(c, 2 / n), z);
  };
  // rings: [scale of the outline, outward offset, height above the base surface]
  const rings = [];
  for (let k = 0; k <= 16; k++) { const t = k / 16; rings.push([1 - (1 - t) ** 1.6, 0, thick]); }
  for (let k = 1; k < 8; k++) { const a = (k / 8) * Math.PI; rings.push([1, round * Math.sin(a), thick / 2 + (thick / 2) * Math.cos(a)]); }
  for (let k = 16; k >= 0; k--) { const t = k / 16; rings.push([1 - (1 - t) ** 1.6, 0, 0]); }
  const pos = [], uv = [], idx = [], W = NA + 1;
  const base = [], nrm = [];
  for (let i = 0; i <= NA; i++) {
    const a = -Math.PI / 2 + (i / NA) * Math.PI * 2, p = outline(a), q = outline(a + 1e-3);
    base.push(p); nrm.push(new V2(q.y - p.y, -(q.x - p.x)).normalize());
  }
  rings.forEach(([sc, off, h]) => {
    for (let i = 0; i <= NA; i++) {
      const x = base[i].x * sc + nrm[i].x * off, z = zc + (base[i].y - zc) * sc + nrm[i].y * off;
      pos.push(x, height(x, z) + h, z); uv.push(x / tile, z / tile);
    }
  });
  for (let r = 0; r < rings.length - 1; r++) for (let i = 0; i < NA; i++) { const a = r * W + i, b = a + 1, c = a + W, d = c + 1; idx.push(a, c, b, b, c, d); }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  faceOutward(g); g.computeVertexNormals();
  return g;
}

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
  if (opts.knit) C.knit.set(opts.knit);
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

  // skin and knit share the ghosted outline used by the exploded drawing
  function skinMesh(geo, parent, mat = M.skin) {
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m);
    const o = new THREE.Mesh(geo, outlineHand); o.visible = false; parent.add(o); handOutlines.push(o);
    return m;
  }
  function partMesh(geo, mat, parent, edges = true, angle = 32) {
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m);
    const o = new THREE.Mesh(geo, outlinePart); o.visible = false; m.add(o); partOutlines.push(o);
    if (edges) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, angle), edgeMat); e.visible = false; m.add(e); edgeLines.push(e); }
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

  // ----- the arm: one continuous swept form from wrist to shoulder, with a natural elbow bend -----
  const ELBOW_Z = -28.6, UA_LEN = 36, TABLE_BEND = 0.38;
  const elbowP = new V3(0, FA_Y, ELBOW_Z);
  // upper arm: triceps line stays fairly straight; the biceps swells toward the inside of the elbow
  const upperR = (d) => 3.3 + 0.35 * Math.exp(-((d - 13) ** 2) / 50) + 0.55 * Math.exp(-((d - 30) ** 2) / 24) + d * 0.012;
  const bicepD = (d) => 1.15 * Math.exp(-((d - 10.5) ** 2) / 30);
  const UA_SX = 1.18, UA_SY = 0.98;
  // forearm cross-section: flat at the wrist, rounder toward the elbow
  const sect = (z) => { const k = ss(-12, -26, z); return { r: forearmR(z), sx: lerp(FA_SX, UA_SX, k), sy: lerp(FA_SY, UA_SY, k) }; };
  const AX = new V3(1, 0, 0);
  // samples along the limb (hand space): centre, tangent, radius, section scale, elbow weight
  function armSamples(bend) {
    const uaDir = new V3(0, Math.sin(bend), -Math.cos(bend)), palmSide = new V3(0, -Math.cos(bend), -Math.sin(bend));
    const BS = Math.sign(bend) || 1, bw = Math.min(1, Math.abs(bend) / 0.3);
    const P0 = new V3(0, FA_Y, ELBOW_Z + 3.4), P2 = elbowP.clone().addScaledVector(uaDir, 3.4);
    const S = [];
    // rounded start tucked inside the palm
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI / 2, z = -2.2 + 1.4 * Math.cos(a); const q = sect(-2.2); S.push({ c: new V3(0, FA_Y, z), t: new V3(0, 0, -1), r: Math.max(0.01, q.r * Math.sin(a)), sx: q.sx, sy: q.sy, el: 0, z }); }
    for (let z = -2.5; z > P0.z; z -= 0.35) { const q = sect(z); S.push({ c: new V3(0, FA_Y, z), t: new V3(0, 0, -1), ...q, el: 0, z }); }
    const qa = sect(P0.z), rb = upperR(3.4);
    for (let i = 0; i <= 40; i++) {
      const u = i / 40, w = 1 - u;
      const c = P0.clone().multiplyScalar(w * w).addScaledVector(elbowP, 2 * w * u).addScaledVector(P2, u * u);
      const t = elbowP.clone().sub(P0).multiplyScalar(2 * w).addScaledVector(P2.clone().sub(elbowP), 2 * u).normalize();
      S.push({ c, t, r: lerp(qa.r, rb, ss(0, 1, u)) + 0.15 * Math.sin(Math.PI * u), sx: lerp(qa.sx, UA_SX, u), sy: lerp(qa.sy, UA_SY, u), el: Math.sin(Math.PI * u) * bw });
    }
    const ua = (d, r) => ({ c: elbowP.clone().addScaledVector(uaDir, d).addScaledVector(palmSide, bicepD(d) * ss(3.4, 6, d)), t: uaDir.clone(), r, sx: UA_SX, sy: UA_SY, el: 0, d });
    for (let d = 3.7; d <= UA_LEN; d += 0.4) S.push(ua(d, upperR(d) + bicepD(d) * ss(3.4, 6, d)));
    // rounded shoulder end
    for (let i = 1; i <= 8; i++) { const a = (i / 8) * Math.PI / 2; S.push(ua(UA_LEN + 2.4 * Math.sin(a), Math.max(0.01, upperR(UA_LEN) * Math.cos(a)))); }
    S.forEach((sm) => { sm.up = new V3().crossVectors(AX, sm.t).normalize(); sm.BS = BS; });
    return S;
  }
  // a point on the ring of sample sm at angle a, pushed out by off (the point of the elbow sits on the outside of the bend)
  function ringPoint(sm, a, off, out = new V3()) {
    const ca = Math.cos(a), sa = Math.sin(a);
    const o = Math.max(0, -sa * sm.BS), n = Math.max(0, sa * sm.BS);
    const rr = (sm.r + off) * (1 + sm.el * (0.16 * Math.pow(o, 3) * Math.exp(-ca * ca * 3) - 0.07 * Math.pow(n, 2)));
    return out.copy(sm.c).addScaledVector(AX, ca * rr * sm.sx).addScaledVector(sm.up, sa * rr * sm.sy);
  }

  // ----- Hermes -----
  const SLEEVE = 0.16, GLOVE = 0.1;
  const parts = []; // { obj, base:V3, off:V3, delay }
  const addPart = (obj, off, delay = 0) => { parts.push({ obj, base: obj.position.clone(), off: new V3(...off), delay }); return obj; };
  const anchors = {}; // named Object3D
  const anchor = (parent, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; };

  // the knit sleeve: the arm's own shape plus a layer of fabric, wrist to shoulder. The UV seam runs down the palm side.
  function sleeveGeo(S) {
    const N = 72, W = N + 1, pos = [], uv = [], idx = [], p = new V3();
    let len = 0;
    S.forEach((sm, j) => {
      if (j) len += sm.c.distanceTo(S[j - 1].c);
      for (let k = 0; k <= N; k++) {
        ringPoint(sm, -Math.PI / 2 + (k / N) * Math.PI * 2, SLEEVE, p); pos.push(p.x, p.y, p.z);
        uv.push((k / N) * KNIT_AROUND / KNIT_TILE, len / (KNIT_ROW * KNIT_TILE));
      }
    });
    for (let j = 0; j < S.length - 1; j++) for (let k = 0; k < N; k++) { const a = j * W + k, b = a + 1, c = a + W, d = b + W; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    // the seam column is duplicated for the UVs; share its normals so the knit shows no crease
    const n = g.attributes.normal;
    for (let j = 0; j < S.length; j++) { const a = j * W, b = a + N, x = n.getX(a) + n.getX(b), y = n.getY(a) + n.getY(b), z = n.getZ(a) + n.getZ(b), l = Math.hypot(x, y, z) || 1; n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l); }
    return g;
  }
  // the wiring channel: a raised seam along the top of the sleeve, forearm cuff to shoulder pack
  const SEAM_A = Math.PI / 2 + 0.35;
  function seamGeo(S) {
    const pts = [];
    S.forEach((sm, j) => { if (j % 2) return; if ((sm.z !== undefined && sm.z < -11.0) || sm.el > 0 || (sm.d !== undefined && sm.d < 27.8)) pts.push(ringPoint(sm, SEAM_A, SLEEVE + 0.04)); });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, 0.055, 6, false);
  }
  let samples = armSamples(TABLE_BEND);
  const sleeve = skinMesh(sleeveGeo(samples), hand, M.knit), sleeveOutline = handOutlines[handOutlines.length - 1];
  const seam = new THREE.Mesh(seamGeo(samples), M.graphite); seam.castShadow = true; hand.add(seam);
  const upper = new THREE.Group(); upper.position.copy(elbowP); upper.rotation.x = TABLE_BEND; hand.add(upper);

  // limb sections, used to place parts on the sleeve (forearm in hand space, upper arm in the elbow's frame; t runs along +Z)
  const foreSec = (z) => { const q = sect(z); return { c: new V3(0, FA_Y, z), X: new V3(1, 0, 0), Y: new V3(0, 1, 0), A: new V3(0, 0, 1), r: q.r, sx: q.sx, sy: q.sy }; };
  const upperSec = (d) => { const b = bicepD(d) * ss(3.4, 6, d); return { c: new V3(0, -b, -d), X: new V3(1, 0, 0), Y: new V3(0, 1, 0), A: new V3(0, 0, 1), r: upperR(d) + b, sx: UA_SX, sy: UA_SY }; };
  const surf = (q, a, lift) => q.c.clone().addScaledVector(q.X, Math.cos(a) * (q.r + SLEEVE + lift) * q.sx).addScaledVector(q.Y, Math.sin(a) * (q.r + SLEEVE + lift) * q.sy);
  const normalAt = (q, a) => q.X.clone().multiplyScalar(Math.cos(a) * q.sy).addScaledVector(q.Y, Math.sin(a) * q.sx).normalize();
  // stand an object on the sleeve: local +Y out of the surface, local +Z along the limb
  const place = (obj, q, a, lift = 0) => {
    const N = normalAt(q, a), Z = q.A.clone(); Z.addScaledVector(N, -Z.dot(N)).normalize();
    obj.position.copy(surf(q, a, lift));
    obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V3().crossVectors(N, Z), N, Z));
    return obj;
  };

  // glove: the same knit over the palm and the first two segments of each finger; the fingertips stay bare for touch
  skinMesh(knitUVPalm(offsetGeo(palmGeo(), GLOVE), GLOVE_SW, GLOVE_RH), wrist, M.glove);
  const gloveOver = (bones, def, i) => {
    const L = def.L[i], r0 = def.r[i] + GLOVE, r1 = def.r[i + 1] + GLOVE;
    // the second segment stops at the last knuckle with a short, flat hem
    const g = i === 0 ? phalanxGeo(L, r0, r1, 0.85) : phalanxGeo(L - r1 * 0.32, r0, r1, 0.3);
    skinMesh(knitUVFinger(g, (r0 + r1) / 2, GLOVE_SW, GLOVE_RH), bones[i], M.glove);
  };
  fingers.forEach((f) => { gloveOver(f.bones, f.def, 0); gloveOver(f.bones, f.def, 1); });
  gloveOver(thumbBones, THUMB, 0); gloveOver(thumbBones, THUMB, 1);
  // yarn strain sensors read each finger joint (sense annotation)
  anchors.yarn = anchor(fingers[0].bones[0], 0, (FINGERS[0].r[1] + GLOVE) * 0.84 + 0.1, FINGERS[0].L[0] * 0.42);

  // carbon back-of-hand plate: the brakes push against it
  const PX = -0.05, PZ = 0.25, onGlove = (x, z, lift = 0) => palmTop(x, z) + GLOVE + 0.04 + lift;
  const plate = new THREE.Group(); plate.position.set(PX, 0, PZ); wrist.add(plate);
  {
    // a stiff shell follows the hand's broad curve, not its small bumps: smooth the height under the footprint
    const soft = (x, z) => { let h = 0; for (const [dx, dz] of [[0, 0], [0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]]) h += onGlove(x + PX + dx, z + PZ + dz); return h / 5; };
    partMesh(plateGeo({ w0: 2.1, w1: 2.6, z0: -2.3, z1: 2.25, thick: 0.18, height: soft }), M.carbon, plate, true, 40);
    // hand motion sensor
    const iy = soft(0.9, -1.1) + 0.18 + 0.1;
    const imu = partMesh(new RoundedBoxGeometry(1.1, 0.2, 0.8, 2, 0.08), M.graphite, plate); imu.position.set(0.9, iy, -1.1);
    anchors.imuHand = anchor(plate, 0.9, iy + 0.12, -1.1);
    anchors.plate = anchor(plate, -1.6, soft(-1.6, 0.4) + 0.22, 0.4);
  }
  addPart(plate, [0, 3.0, 0.2], 0.08);

  // electrostatic brakes: film strips about a millimetre thick along the back of each finger, plate to middle segment
  const brakeTabs = [];
  const brake = (bones, def, isIndex, segs) => {
    const mat = isIndex ? M.brakeIdx : M.film;
    segs.forEach(([i, z0f, z1f], k) => {
      const L = def.L[i], r0 = def.r[i], r1 = def.r[i + 1];
      const top = (z) => { const t = z / L; return (lerp(r0, r1, t) * (1 - 0.05 * Math.sin(t * Math.PI)) + GLOVE) * 0.84 + 0.035; };
      const z0 = L * z0f, z1 = L * z1f, len = z1 - z0;
      const g = new THREE.Group(); bones[i].add(g);
      const m = partMesh(bend(new RoundedBoxGeometry(0.44, 0.05, len, 2, 0.02), 0.5), mat, g);
      m.position.set(0, (top(z0) + top(z1)) / 2, (z0 + z1) / 2); m.rotation.x = Math.atan2(top(z0) - top(z1), len);
      if (k === segs.length - 1) { const tab = partMesh(new RoundedBoxGeometry(0.58, 0.12, 0.3, 2, 0.05), M.graphite, g); tab.position.set(0, top(z1) + 0.03, z1); brakeTabs.push(anchor(g, 0, top(z1) + 0.12, z1)); }
      addPart(g, [0, 1.3 + k * 0.5, 0], 0.14 + k * 0.05);
    });
  };
  fingers.forEach((f, i) => brake(f.bones, f.def, i === 0, [[0, 0.12, 0.9], [1, 0.08, 0.6]]));
  brake(thumbBones, THUMB, false, [[0, 0.5, 0.92], [1, 0.08, 0.6]]);
  anchors.brakes = brakeTabs[1]; anchors.brakeTab = brakeTabs[0];
  // short leads from the plate to each knuckle
  { const g = new THREE.Group(); wrist.add(g);
    FINGERS.forEach((f) => {
      const x = f.base[0] * 0.92, m = partMesh(new RoundedBoxGeometry(0.4, 0.05, 1.5, 2, 0.02), M.film, g, false);
      const y0 = onGlove(x, 2.3, 0.03), y1 = onGlove(x, 3.8, 0.03);
      m.position.set(x, (y0 + y1) / 2, 3.05); m.rotation.x = Math.atan2(y0 - y1, 1.5);
    });
    addPart(g, [0, 2.2, 0.3], 0.11); }

  // forearm cuff with the wrist chip that runs the fast loop and drives the wrist brakes
  const CUFF = [-11.4, -6.6];
  const cuff = new THREE.Group(); hand.add(cuff);
  partMesh(limbShell((t) => foreSec(lerp(CUFF[0], CUFF[1], t)), { len: CUFF[1] - CUFF[0], off: SLEEVE + 0.012, thick: 0.2, a0: -0.25, a1: Math.PI + 0.25 }), M.carbon, cuff, true, 40);
  { const chip = place(new THREE.Group(), foreSec(-8.7), Math.PI / 2, 0.21); cuff.add(chip);
    const box = partMesh(new RoundedBoxGeometry(2.3, 0.36, 2.9, 3, 0.12), M.graphite, chip); box.position.y = 0.17;
    const led = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.04, 0.09, 1, 0.02), new THREE.MeshBasicMaterial({ color: C.accent })); led.position.set(0, 0.36, 1.0); chip.add(led);
    anchors.imuFore = anchor(chip, 0, 0.42, -0.4); }
  // wrist brakes: two strips over the back of the wrist, cuff to plate
  { const q = foreSec(-4.4), y = q.c.y + (q.r + SLEEVE) * q.sy + 0.04;
    [-0.8, 0.8].forEach((x) => { const m = partMesh(bend(new RoundedBoxGeometry(0.5, 0.05, 4.2, 2, 0.02), 0.2), M.film, cuff); m.position.set(x, y - 0.02 * x * x, -4.5); }); }
  addPart(cuff, [0, 3.4, 0], 0.12);

  // 16-channel dry EMG band on the upper forearm, where the finger and wrist muscles are
  const EMG_Z = -17.6;
  const emg = new THREE.Group(); hand.add(emg);
  { const q = foreSec(EMG_Z);
    const sh = new THREE.Group(); sh.position.copy(q.c); sh.rotation.x = -Math.PI / 2; sh.scale.set(q.sx, 1, q.sy); emg.add(sh);
    partMesh(ringGeo(q.r + SLEEVE + 0.005, 0.07, 1.25, 0.03), M.graphite, sh, false);
    for (let k = 0; k < 16; k++) {
      const pod = place(new THREE.Group(), q, Math.PI / 2 + 0.2 + (k / 16) * Math.PI * 2, 0.07); emg.add(pod);
      partMesh(new RoundedBoxGeometry(0.92, 0.3, 1.3, 2, 0.11), M.graphite, pod, k % 4 === 0).position.y = 0.12;
      if (k === 0) anchors.emg = anchor(pod, 0, 0.36, 0);
    } }
  addPart(emg, [0, -3.2, 0], 0.16);

  // upper-arm cuff with the grip-assist motor (it pulls a cable to the hand for about 10 N of grip)
  const UCUFF = [18.6, 12.2];
  const ucuff = new THREE.Group(); upper.add(ucuff);
  partMesh(limbShell((t) => upperSec(lerp(UCUFF[0], UCUFF[1], t)), { len: UCUFF[0] - UCUFF[1], off: SLEEVE + 0.012, thick: 0.22, a0: Math.PI / 2 - 1.85, a1: Math.PI / 2 + 1.85 }), M.carbon, ucuff, true, 40);
  { const motor = place(new THREE.Group(), upperSec(15.4), Math.PI / 2 + 0.95, 0.23); ucuff.add(motor);
    const base = partMesh(new RoundedBoxGeometry(1.6, 0.28, 3.4, 3, 0.1), M.graphite, motor); base.position.y = 0.12;
    const body = partMesh(new THREE.CapsuleGeometry(0.58, 2.1, 8, 28), M.graphite, motor); body.rotation.x = Math.PI / 2; body.position.y = 0.74;
    const band = partMesh(new THREE.CylinderGeometry(0.61, 0.61, 0.14, 28), M.metal, motor, false); band.rotation.x = Math.PI / 2; band.position.set(0, 0.74, 0.7);
    anchors.imuUpper = anchor(motor, 0, 1.45, 0); }
  addPart(ucuff, [0, 3.6, 0], 0.2);

  // shoulder pack: 8 Wh battery, the shoulder chip and the radio, kept off the hand
  const POD = [33.0, 27.6];
  const pod = new THREE.Group(); upper.add(pod);
  { const aC = Math.PI / 2 + 0.6;
    partMesh(limbShell((t) => upperSec(lerp(POD[0], POD[1], t)), { len: POD[0] - POD[1], off: SLEEVE + 0.012, thick: 0.8, a0: aC - 0.68, a1: aC + 0.68, bevel: 0.22 }), M.graphite, pod, true, 40);
    const lid = place(new THREE.Group(), upperSec(30.3), aC, 0.82); pod.add(lid);
    const led = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.04, 2.4, 1, 0.02), new THREE.MeshBasicMaterial({ color: C.accent })); led.position.set(0, 0.02, 0); lid.add(led);
    anchors.imuShoulder = anchor(lid, 0, 0.3, 1.2); }
  addPart(pod, [0, 4.2, 0], 0.24);

  // twelve vibration cues in the knit: wrist, forearm, elbow, upper arm and shoulder. pos runs 0 (shoulder) to 1 (wrist).
  const CUES = [
    ['f', -5.0, 2.2], ['f', -5.2, 4.1],
    ['f', -13.8, 2.6], ['f', -20.6, 2.75], ['f', -22.4, 1.1],
    ['f', -24.6, 3.85], ['u', 4.6, 2.55],
    ['u', 8.8, 3.7], ['u', 21.6, 2.45], ['u', 23.8, 0.85],
    ['u', 34.2, 2.7], ['u', 34.4, 4.25],
  ];
  const ARM_LEN = UA_LEN + (-2.5 - ELBOW_Z);
  const glowMap = glowTexture();
  const cues = CUES.map(([fr, v, a], i) => {
    const q = fr === 'f' ? foreSec(v) : upperSec(v), parent = fr === 'f' ? hand : upper;
    const g = place(new THREE.Group(), q, a, 0.0); parent.add(g);
    const padGeo = new THREE.SphereGeometry(0.44, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2); padGeo.scale(1, 0.16, 1);
    partMesh(padGeo, M.cue, g, false).position.y = -0.02;
    const mat = new THREE.MeshStandardMaterial({ color: M.cue.color, emissive: C.accent, emissiveIntensity: 0, roughness: 0.5 });
    const dotGeo = new THREE.SphereGeometry(0.2, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2); dotGeo.scale(1, 0.3, 1);
    const dot = new THREE.Mesh(dotGeo, mat); dot.position.y = 0.0; g.add(dot);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: C.accent, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(2.6); halo.position.y = 0.25; halo.visible = false; g.add(halo);
    const n = normalAt(q, a).multiplyScalar(1.3);
    addPart(g, [n.x, n.y, n.z], 0.26 + i * 0.006);
    const s = fr === 'f' ? UA_LEN + (v - ELBOW_Z) : UA_LEN - v;
    return { g, mat, halo, pos: clamp(s / ARM_LEN) };
  });
  anchors.cueWrist = anchor(cues[0].g, 0, 0.3, 0); anchors.cues = anchor(cues[2].g, 0, 0.3, 0);

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
    // where the brake holds the finger: a tick across the end of the path
    const stop = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 32), live.material); stop.renderOrder = 11;
    stop.position.copy(pts[pts.length - 1]); stop.quaternion.setFromUnitVectors(new V3(0, 0, 1), curve.getTangentAt(1));
    hand.add(ghost, live, head, stop);
    return { ghost, live, head, stop, curve, pts };
  })();

  // ----- state -----
  const tmp = new V3(), tmp2 = new V3();
  let W = 1, H = 1;

  // the sleeve and its seam are rebuilt from the limb when the elbow bends
  function rebuildCables() {
    seam.geometry.dispose(); seam.geometry = seamGeo(samples);
  }

  // 0 = resting on the table, 1 = raised in profile; roll turns the raised arm about the forearm
  let stanceKey = '', armBend = TABLE_BEND;
  function setStance(st, roll = REACH.roll) {
    if (tableOnly) st = 0;
    hand.quaternion.copy(tableQuat).slerp(reachQuat(roll), st);
    hand.position.copy(tablePos).lerp(reachPos, st);
    wrist.rotation.x = REACH.wrist * st; wrist.scale.setScalar(lerp(1, 1.1, st));
    const b = Math.round(lerp(TABLE_BEND, -REACH.bend, st) * 200) / 200;
    if (b !== armBend) {
      armBend = b; upper.rotation.x = b;
      samples = armSamples(b);
      sleeve.geometry.dispose(); sleeve.geometry = sleeveOutline.geometry = sleeveGeo(samples);
      rebuildCables();
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
    sense: { t: [-1, 4, 1], az: 0.25, el: 0.14, d: 84, fov: 28, sx: 0.1, mt: [5, 5, 1], md: 96 },
    adaptClose: { t: [9, 6, 2], az: 0.4, el: 0.2, d: 54, fov: 28, sx: 0.12, mt: [11, 6, 3], md: 64 },
    adapt: { t: [7, 5, 1], az: 0.3, el: 0.24, d: 60, fov: 28, sx: 0.12, mt: [9, 5, 2], md: 72 },
    assist: { t: [10, 7, 4], az: 0.7, el: 0.3, d: 62, fov: 28, sx: 0.14, mt: [12, 9, 4], md: 44 },
    learn: { t: [10, 7, 4], az: 0.82, el: 0.3, d: 62, fov: 28, sx: 0.14, mt: [12, 9, 4], md: 46 },
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

  const ghostDark = new THREE.Color(0x111010);
  function setDrawing(d, ghost) {
    M.skin.color.copy(C.skin).lerp(C.skinGhost, ghost);
    M.skin.sheen = 0.7 * (1 - ghost);
    M.nail.color.set(0xc79a88).lerp(C.skinGhost, ghost);
    for (const m of [M.knit, M.glove]) { m.color.copy(C.knit).lerp(C.knitGhost, ghost); m.sheen = 1 - ghost; m.bumpScale = KNIT_BUMP * (1 - 0.8 * ghost); }
    M.cue.color.copy(C.knit).multiplyScalar(0.34).lerp(C.knitGhost, ghost);
    outlineHand.uniforms.uOpacity.value = 0.55 * ghost;
    handOutlines.forEach((o) => (o.visible = ghost > 0.01));
    outlinePart.uniforms.uOpacity.value = 0.95 * d;
    partOutlines.forEach((o) => (o.visible = d > 0.01));
    edgeMat.opacity = 0.85 * d; edgeLines.forEach((e) => (e.visible = d > 0.01));
    M.graphite.color.copy(C.graphite).lerp(ghostDark, d * 0.6);
    M.carbon.color.copy(C.carbon).lerp(ghostDark, d * 0.6);
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

  // guidance: cues fire in a wave down the arm as the finger moves, and the index brake holds at the end of the path
  function setAssist(level, vis, u) {
    trajectoryVisible(vis);
    traj.live.material.opacity = level * vis;
    const hold = level * vis * ss(0.7, 0.96, u);
    M.brakeIdx.color.copy(C.film).lerp(C.accent, hold);
    M.brakeIdx.emissive.copy(C.accent).multiplyScalar(0.45 * hold);
    cues.forEach((c) => {
      const k = level * vis * Math.exp(-((u * 1.15 - 0.05 - c.pos) ** 2) / 0.018);
      c.mat.emissiveIntensity = 2.4 * k; c.halo.material.opacity = 0.85 * k; c.halo.visible = k > 0.01;
    });
    // head rides along the path at u
    const t = clamp(u, 0.001, 0.999);
    traj.curve.getPointAt(t, traj.head.position);
    const tan = traj.curve.getTangentAt(t);
    traj.head.quaternion.setFromUnitVectors(new V3(0, 1, 0), tan);
    traj.head.visible = level * vis > 0.02;
    traj.stop.visible = vis > 0.01;
  }
  function trajectoryVisible(v) { traj.ghost.material.opacity = 0.8 * v; traj.ghost.visible = v > 0.01; traj.live.visible = v > 0.01; }

  // annotation anchors (world positions -> screen)
  const annot = {
    yarn: anchors.yarn, imuHand: anchors.imuHand, emg: anchors.emg, imuFore: anchors.imuFore, imuUpper: anchors.imuUpper, imuShoulder: anchors.imuShoulder,
    plate: anchors.plate, brakes: anchors.brakes, cuff: anchors.imuFore, band: anchors.emg, motor: anchors.imuUpper, pack: anchors.imuShoulder, cues: anchors.cues,
    tip: fingers[0].tip, cue: anchors.cueWrist, brake: anchors.brakeTab,
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
      // between portrait and wide screens, pull back and shift right so the hand stays clear of the headline and buttons
      const aspect = W / H;
      if (!center && aspect >= 0.9 && aspect < 1.6) k = { ...k, d: k.d * Math.pow(1.6 / aspect, 0.6), sx: k.sx + (1.6 - aspect) * 0.12 };
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
  return { update, resize, setStance, renderer, scene, camera, hand, fingers, thumbBones, thumbTip, setPose, M, props, still, KF, applyCamera, setExplode, setDrawing, setAssist, rebuildCables, THREE, ground, wrist, parts, upper };
}
