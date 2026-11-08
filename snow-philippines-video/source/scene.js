import * as THREE from 'three';

const W = 1280, H = 720;
const DURATION = 90;

// ---------- deterministic random ----------
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = rng(1234);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const out = document.createElement('canvas');
out.width = W; out.height = H;
const ctx = out.getContext('2d');

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x7ec8f0, 120, 420);
const camera = new THREE.PerspectiveCamera(45, W / H, 0.5, 1500);

const hemi = new THREE.HemisphereLight(0xcfeaff, 0x5a7a3a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d0, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -70; sun.shadow.camera.right = 70;
sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -70;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 400;
sun.shadow.bias = -0.0008;
scene.add(sun); scene.add(sun.target);

// ---------- snow-able materials ----------
const WHITE = new THREE.Color(0xf4f8ff);
const snowMats = []; // {mat, base, k, zone}
function mat(color, k = 1, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: !!opts.flat, ...opts.extra });
  snowMats.push({ mat: m, base: new THREE.Color(color), k });
  return m;
}
function emissive(color, intensity = 2) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
}
function mesh(geo, m, cast = true, recv = true) { const o = new THREE.Mesh(geo, m); o.castShadow = cast; o.receiveShadow = recv; return o; }

// ---------- builders ----------
function palm(scale = 1, lean = 0.25) {
  const g = new THREE.Group();
  const trunkM = mat(0x8a6a45, 0.35);
  const leafM = mat(0x2f9e44, 0.95, { flat: true });
  const segs = 8; let p = new THREE.Vector3(); let ang = 0;
  for (let i = 0; i < segs; i++) {
    const s = mesh(new THREE.CylinderGeometry(0.32 - i * 0.02, 0.38 - i * 0.02, 1.3, 7), trunkM);
    ang = lean * (i / segs) * 1.4;
    s.position.set(p.x + Math.sin(ang) * 0.65, p.y + Math.cos(ang) * 0.65, 0);
    s.rotation.z = -ang;
    g.add(s);
    p.set(p.x + Math.sin(ang) * 1.25, p.y + Math.cos(ang) * 1.25, 0);
  }
  const crown = new THREE.Group(); crown.position.copy(p); g.add(crown);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const leafG = new THREE.BoxGeometry(0.9, 0.06, 4.2, 1, 1, 6);
    const pos = leafG.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const z = pos.getZ(v) + 2.1; // 0..4.2
      pos.setY(v, pos.getY(v) - 0.09 * z * z);
      pos.setX(v, pos.getX(v) * (1 - z / 5));
      pos.setZ(v, z);
    }
    leafG.computeVertexNormals();
    const leaf = mesh(leafG, leafM);
    leaf.rotation.y = (i / n) * Math.PI * 2 + R() * 0.3;
    leaf.rotation.x = -0.25 + R() * 0.25;
    crown.add(leaf);
  }
  const coM = mat(0x5b3b1c, 0.6);
  for (let i = 0; i < 3; i++) { const c = mesh(new THREE.SphereGeometry(0.28, 8, 6), coM); c.position.set(Math.cos(i * 2.1) * 0.35, -0.3, Math.sin(i * 2.1) * 0.35); crown.add(c); }
  g.scale.setScalar(scale);
  return g;
}

function bahayKubo(color = 0xc9a066) {
  const g = new THREE.Group();
  const stiltM = mat(0x6b4b2a, 0.2);
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { const s = mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 6), stiltM); s.position.set(x, 0.8, z); g.add(s); }
  const body = mesh(new THREE.BoxGeometry(4.6, 2.6, 4.6), mat(color, 0.12)); body.position.y = 2.9; g.add(body);
  const door = mesh(new THREE.BoxGeometry(1, 1.7, 0.1), mat(0x4a3018, 0.05)); door.position.set(0, 2.6, 2.33); g.add(door);
  const win = mesh(new THREE.BoxGeometry(1, 0.8, 0.1), new THREE.MeshStandardMaterial({ color: 0x2a1a0a })); win.position.set(1.4, 3.1, 2.33); g.add(win);
  const roof = mesh(new THREE.ConeGeometry(4.6, 3.2, 4, 1), mat(0x9b7a3e, 1.0, { flat: true })); roof.position.y = 5.8; roof.rotation.y = Math.PI / 4; g.add(roof);
  const stairs = mesh(new THREE.BoxGeometry(1, 0.2, 1.4), stiltM); stairs.position.set(0, 0.8, 3); stairs.rotation.x = 0.5; g.add(stairs);
  g.userData.door = door;
  return g;
}

function jeepney() {
  const g = new THREE.Group();
  const bodyM = mat(0xd9dde3, 0.15, { extra: { metalness: 0.6, roughness: 0.35 } });
  const body = mesh(new THREE.BoxGeometry(7, 2.2, 2.6), bodyM); body.position.y = 1.7; g.add(body);
  const hood = mesh(new THREE.BoxGeometry(2, 1.4, 2.4), bodyM); hood.position.set(4.4, 1.3, 0); g.add(hood);
  const roof = mesh(new THREE.BoxGeometry(7.6, 0.25, 2.9), mat(0xd62828, 1.0)); roof.position.set(-0.1, 2.95, 0); g.add(roof);
  const glass = new THREE.MeshStandardMaterial({ color: 0x1b2633, roughness: 0.2, metalness: 0.4 });
  const win = mesh(new THREE.BoxGeometry(6.4, 0.8, 2.65), glass); win.position.set(-0.2, 2.3, 0); g.add(win);
  const ws = mesh(new THREE.BoxGeometry(0.1, 0.9, 2.2), glass); ws.position.set(3.45, 2.3, 0); g.add(ws);
  const stripeCols = [0xffbe0b, 0x3a86ff, 0xd62828];
  stripeCols.forEach((c, i) => { const s = mesh(new THREE.BoxGeometry(7.02, 0.15, 2.64), mat(c, 0.1)); s.position.set(0, 1.0 + i * 0.22, 0); g.add(s); });
  const wheelM = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  g.userData.wheels = [];
  for (const [x, z] of [[-2.5, 1.3], [-2.5, -1.3], [3.8, 1.3], [3.8, -1.3]]) { const w = mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.4, 14), wheelM); w.rotation.x = Math.PI / 2; w.position.set(x, 0.6, z); g.add(w); g.userData.wheels.push(w); }
  const lightM = emissive(0xfff2b0, 1.5);
  for (const z of [0.8, -0.8]) { const l = mesh(new THREE.SphereGeometry(0.22, 8, 6), lightM); l.position.set(5.4, 1.5, z); g.add(l); }
  // roof snow pile
  const pile = mesh(new THREE.BoxGeometry(7.2, 0.6, 2.6), new THREE.MeshStandardMaterial({ color: 0xf6f9ff, roughness: 1 })); pile.position.set(-0.1, 3.1, 0); g.add(pile);
  g.userData.pile = pile;
  return g;
}

function person(jacket, hat = 0xd62828) {
  const g = new THREE.Group();
  const body = mesh(new THREE.CapsuleGeometry(0.45, 1.0, 4, 10), new THREE.MeshStandardMaterial({ color: jacket, roughness: 0.9 })); body.position.y = 1.1; g.add(body);
  const head = mesh(new THREE.SphereGeometry(0.38, 14, 10), new THREE.MeshStandardMaterial({ color: 0xc68b59, roughness: 0.8 })); head.position.y = 2.3; g.add(head);
  const beanie = mesh(new THREE.SphereGeometry(0.4, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: hat })); beanie.position.y = 2.38; g.add(beanie);
  const scarf = mesh(new THREE.TorusGeometry(0.33, 0.1, 6, 14), new THREE.MeshStandardMaterial({ color: 0xffbe0b })); scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.95; g.add(scarf);
  return g;
}

function snowman() {
  const g = new THREE.Group();
  const sm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  const parts = [];
  [[1.2, 1.1], [0.85, 2.9], [0.6, 4.1]].forEach(([r, y]) => { const s = mesh(new THREE.SphereGeometry(r, 20, 14), sm); s.position.y = y; g.add(s); parts.push(s); });
  const nose = mesh(new THREE.ConeGeometry(0.12, 0.7, 8), new THREE.MeshStandardMaterial({ color: 0xff7b00 })); nose.rotation.z = -Math.PI / 2; nose.position.set(0.85, 4.1, 0); g.add(nose);
  const coal = new THREE.MeshStandardMaterial({ color: 0x111111 });
  for (const z of [0.22, -0.22]) { const e = mesh(new THREE.SphereGeometry(0.07, 6, 6), coal); e.position.set(0.52, 4.3, z); g.add(e); }
  for (let i = 0; i < 3; i++) { const b = mesh(new THREE.SphereGeometry(0.08, 6, 6), coal); b.position.set(0.84 - i * 0.03, 3.3 - i * 0.4, 0); g.add(b); }
  // salakot-style hat (Filipino woven hat)
  const hat = mesh(new THREE.ConeGeometry(0.95, 0.5, 18), new THREE.MeshStandardMaterial({ color: 0xc9a066, roughness: 0.9 })); hat.position.y = 4.75; g.add(hat);
  const scarf = mesh(new THREE.TorusGeometry(0.62, 0.13, 6, 16), new THREE.MeshStandardMaterial({ color: 0x3a86ff })); scarf.rotation.x = Math.PI / 2; scarf.position.y = 3.6; g.add(scarf);
  return g;
}

function parol(color, size = 1) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.45 : 1; const a = i / 10 * Math.PI * 2 + Math.PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? shape.lineTo(x, y) : shape.moveTo(x, y); }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 });
  geo.center();
  const m = emissive(color, 0); const o = new THREE.Mesh(geo, m); o.scale.setScalar(size);
  const g = new THREE.Group(); g.add(o);
  // tails
  for (const x of [-0.25, 0.25]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.02), m); t.position.set(x, -1.3, 0); g.add(t); }
  g.userData.m = m;
  return g;
}

// ---------- shared snowflake texture ----------
function dotTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}

// =========================================================
// LOCATION A — ISLAND (origin)
// =========================================================
const island = new THREE.Group(); scene.add(island);
const oceanGeo = new THREE.PlaneGeometry(900, 900, 90, 90); oceanGeo.rotateX(-Math.PI / 2);
const oceanBase = oceanGeo.attributes.position.array.slice();
const oceanM = new THREE.MeshStandardMaterial({ color: 0x14a3c7, roughness: 0.25, metalness: 0.1, flatShading: true });
const ocean = mesh(oceanGeo, oceanM, false, true); ocean.position.y = 0; island.add(ocean);
const OCEAN_WARM = new THREE.Color(0x14a3c7), OCEAN_ICE = new THREE.Color(0xd5ecf5);
// ice floes
const floes = [];
const floeM = new THREE.MeshStandardMaterial({ color: 0xeef6fb, roughness: 0.6 });
for (let i = 0; i < 70; i++) {
  const r = 3 + R() * 6; const f = mesh(new THREE.CylinderGeometry(r, r * 1.05, 0.5, 6 + Math.floor(R() * 4)), floeM, false, true);
  const a = R() * Math.PI * 2, d = 45 + R() * 110; f.position.set(Math.cos(a) * d, -0.3, Math.sin(a) * d); f.rotation.y = R() * 3;
  f.userData.d = R(); island.add(f); floes.push(f);
}
const sand = mesh(new THREE.CylinderGeometry(40, 48, 4, 48), mat(0xead39b, 0.9)); sand.position.y = -0.8; island.add(sand);
const grassGeo = new THREE.CylinderGeometry(30, 36, 3, 48, 1); const grass = mesh(grassGeo, mat(0x4f9a3a, 1.0)); grass.position.y = 0.2; island.add(grass);
const hill = mesh(new THREE.SphereGeometry(22, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x3f8a32, 1.0)); hill.scale.set(1, 0.6, 1); hill.position.set(-6, 1.6, -8); island.add(hill);
for (let i = 0; i < 18; i++) {
  const a = (i / 18) * Math.PI * 2 + R() * 0.2; const d = 33 + R() * 6;
  const p = palm(0.9 + R() * 0.4, 0.15 + R() * 0.35); p.position.set(Math.cos(a) * d, 1.0, Math.sin(a) * d); p.rotation.y = -a + Math.PI; island.add(p);
}
for (let i = 0; i < 10; i++) { const p = palm(1.0 + R() * 0.3, 0.1 + R() * 0.2); const a = R() * 6.28, d = 8 + R() * 18; p.position.set(Math.cos(a) * d, 1.6 + 6 * (1 - d / 30) * 0.6, Math.sin(a) * d - 4); island.add(p); }
const kubo1 = bahayKubo(); kubo1.position.set(14, 1.6, 22); kubo1.rotation.y = 0.4; island.add(kubo1);
// bangka boats
function bangka(color) {
  const g = new THREE.Group();
  const hull = mesh(new THREE.CylinderGeometry(0.7, 0.4, 9, 10, 1), mat(color, 0.3)); hull.rotation.z = Math.PI / 2; hull.scale.set(1, 1, 0.8); g.add(hull);
  const armM = mat(0x5b3b1c, 0.4);
  for (const x of [-2.5, 2.5]) { const arm = mesh(new THREE.CylinderGeometry(0.08, 0.08, 7, 5), armM); arm.rotation.x = Math.PI / 2; arm.position.set(x, 0.6, 0); g.add(arm); }
  for (const z of [3.4, -3.4]) { const fl = mesh(new THREE.CylinderGeometry(0.15, 0.15, 8, 6), armM); fl.rotation.z = Math.PI / 2; fl.position.set(0, 0.2, z); g.add(fl); }
  return g;
}
const boats = [bangka(0x3a86ff), bangka(0xd62828), bangka(0xffbe0b)];
boats.forEach((b, i) => { b.position.set(30 + i * 14, 0.3, 52 + i * 6); b.rotation.y = 0.5 + i * 0.6; island.add(b); });
// sun disc
const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(18, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffe08a, fog: false }));
sunDisc.position.set(-300, 160, -600); scene.add(sunDisc);
// clouds
const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.95 });
const clouds = new THREE.Group(); scene.add(clouds);
for (let i = 0; i < 40; i++) {
  const c = new THREE.Group();
  for (let j = 0; j < 5; j++) { const s = new THREE.Mesh(new THREE.SphereGeometry(6 + R() * 6, 10, 8), cloudM); s.position.set(j * 7 - 14, R() * 3, R() * 6); c.add(s); }
  c.position.set(-500 + R() * 1600, 70 + R() * 30, -300 + R() * 400); c.scale.y = 0.6; clouds.add(c);
}

// =========================================================
// LOCATION B — VILLAGE (x = 400)
// =========================================================
const VX = 400;
const village = new THREE.Group(); village.position.x = VX; scene.add(village);
const vGround = mesh(new THREE.PlaneGeometry(260, 260).rotateX(-Math.PI / 2), mat(0x5aa340, 1.0)); village.add(vGround);
const road = mesh(new THREE.PlaneGeometry(260, 10).rotateX(-Math.PI / 2), mat(0x55555a, 0.75)); road.position.y = 0.05; village.add(road);
const houseCols = [0xc9a066, 0xd4b07a, 0xb98d55];
const parols = [];
const parolCols = [0xff3b3b, 0xffd23f, 0x3a86ff, 0x2ec4b6, 0xff70a6, 0xff9f1c];
for (let i = 0; i < 9; i++) {
  for (const side of [-1, 1]) {
    const h = bahayKubo(houseCols[(i + (side > 0 ? 1 : 0)) % 3]);
    const x = -80 + i * 20 + (side > 0 ? 8 : 0);
    h.position.set(x, 0, side * 14); h.rotation.y = side > 0 ? Math.PI : 0; village.add(h);
    const p = parol(parolCols[(i * 2 + (side > 0 ? 1 : 0)) % parolCols.length], 0.8);
    p.position.set(x, 4.4, side * (14 - 2.6 - 0.4)); village.add(p); parols.push(p);
  }
  const pl = palm(1.1, 0.2 + R() * 0.2); pl.position.set(-70 + i * 20, 0, -26 - R() * 6); village.add(pl);
  const pl2 = palm(1.0, 0.2 + R() * 0.2); pl2.position.set(-75 + i * 20, 0, 26 + R() * 6); village.add(pl2);
}
// big parols on poles over road + string lights
const poleM = new THREE.MeshStandardMaterial({ color: 0x333333 });
const bulbs = [];
for (let i = 0; i < 6; i++) {
  const x = -70 + i * 28;
  for (const z of [-6.5, 6.5]) { const pole = mesh(new THREE.CylinderGeometry(0.12, 0.12, 9, 6), poleM); pole.position.set(x, 4.5, z); village.add(pole); }
  const big = parol(parolCols[i % parolCols.length], 1.6); big.position.set(x, 8.2, 0); big.rotation.y = Math.PI / 2; village.add(big); parols.push(big);
  if (i < 5) {
    for (let k = 0; k < 14; k++) {
      const u = k / 13; const bx = x + u * 28; const by = 8.6 - Math.sin(u * Math.PI) * 1.4;
      for (const z of [-6.5, 6.5]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 4), emissive(parolCols[(k + i) % parolCols.length], 0)); b.position.set(bx, by, z); village.add(b); bulbs.push(b); }
    }
  }
}
const parolLights = [];
for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(parolCols[i], 0, 40, 1.6); l.position.set(-60 + i * 40, 7, 0); village.add(l); parolLights.push(l); }
const jeep = jeepney(); jeep.position.set(-90, 0, -2.4); village.add(jeep);
const jeep2 = jeepney(); jeep2.rotation.y = Math.PI; jeep2.position.set(90, 0, 2.4); village.add(jeep2);
jeep2.children[2].material = mat(0x3a86ff, 1.0);
const sman = snowman(); sman.position.set(-4, 0, 26); sman.rotation.y = -Math.PI / 2 + 0.3; village.add(sman);
const kids = [person(0xd62828, 0x3a86ff), person(0x3a86ff, 0xffbe0b), person(0x8338ec, 0xd62828), person(0x2a9d8f, 0xffffff)];
kids.forEach((k, i) => { k.position.set(-9 + i * 3.2, 0, 31 + (i % 2) * 2); k.rotation.y = Math.PI + 0.3 - i * 0.2; village.add(k); });
// snowballs
const snowballs = [];
for (let i = 0; i < 3; i++) { const b = mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffffff })); village.add(b); snowballs.push(b); }

// =========================================================
// LOCATION C — RICE TERRACES (x = 800)
// =========================================================
const TX = 800;
const terraces = new THREE.Group(); terraces.position.x = TX; scene.add(terraces);
const tGround = mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), mat(0x3f7f2e, 1.0)); terraces.add(tGround);
function terraceMountain(cx, cz, baseR, levels, seed) {
  const r2 = rng(seed);
  const ph = [r2() * 6, r2() * 6, r2() * 6];
  const g = new THREE.Group(); g.position.set(cx, 0, cz);
  const riceM = mat(0x7ccf3c, 1.0, { flat: false });
  const wallM = mat(0x5c4a2e, 0.85);
  for (let i = 0; i < levels; i++) {
    const r = baseR * (1 - i / (levels + 2));
    const geo = new THREE.CylinderGeometry(r, r + 0.6, 2.0, 72, 1);
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v), z = pos.getZ(v); const a = Math.atan2(z, x);
      const k = 1 + 0.12 * Math.sin(a * 3 + ph[0] + i * 0.15) + 0.06 * Math.sin(a * 7 + ph[1]) + 0.04 * Math.sin(a * 11 + ph[2] + i * 0.3);
      pos.setX(v, x * k); pos.setZ(v, z * k);
    }
    geo.computeVertexNormals();
    const band = mesh(geo, i % 2 ? wallM : riceM); band.position.y = 1 + i * 2.0;
    // top uses rice, side uses wall: use groups via multi-material
    band.material = [wallM, riceM, wallM];
    g.add(band);
  }
  return g;
}
terraces.add(terraceMountain(0, 0, 70, 22, 7));
terraces.add(terraceMountain(-95, -70, 55, 18, 13));
terraces.add(terraceMountain(100, -90, 60, 20, 21));
for (let i = 0; i < 6; i++) { const h = bahayKubo(); h.scale.setScalar(0.8); const a = 0.6 + i * 0.35; const lv = 4 + i * 2; const r = 70 * (1 - lv / 24) * 0.95; h.position.set(Math.cos(a) * r, lv * 2 + 1, Math.sin(a) * r); terraces.add(h); }

// =========================================================
// LOCATION D — CHOCOLATE HILLS (x = 1200)
// =========================================================
const CX = 1200;
const choc = new THREE.Group(); choc.position.x = CX; scene.add(choc);
const cGround = mesh(new THREE.PlaneGeometry(500, 500).rotateX(-Math.PI / 2), mat(0x4e8f3a, 1.0)); choc.add(cGround);
const hillM = mat(0x7a4f2a, 0.82);
const hillList = [];
for (let i = 0; i < 70; i++) {
  const r = 7 + R() * 6; const h = mesh(new THREE.SphereGeometry(r, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), hillM);
  h.scale.y = 1.05 + R() * 0.4;
  let x, z, ok, tries = 0;
  do { x = -160 + R() * 320; z = -200 + R() * 190; ok = hillList.every(o => Math.hypot(o.x - x, o.z - z) > o.r + r + 1); tries++; } while (!ok && tries < 50);
  if (!ok) continue;
  h.position.set(x, 0, z); choc.add(h); hillList.push({ x, z, r, h: h.scale.y * r });
}
// main ski hill (front)
const skiHill = mesh(new THREE.SphereGeometry(14, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2), hillM); skiHill.scale.y = 1.3; skiHill.position.set(0, 0, 10); choc.add(skiHill);
const skier = person(0xff006e, 0xffbe0b); skier.scale.setScalar(0.6); choc.add(skier);
const skiM = new THREE.MeshStandardMaterial({ color: 0x111111 });
const skis = mesh(new THREE.BoxGeometry(0.25, 0.08, 2.4), skiM); skis.position.y = 0.05; skier.add(skis);
const flag = new THREE.Group(); const fpole = mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 6), poleM); fpole.position.y = 2; flag.add(fpole);
const fl = mesh(new THREE.BoxGeometry(0.05, 1.2, 2), new THREE.MeshStandardMaterial({ color: 0x0038a8 })); fl.position.set(0, 3.4, 1); flag.add(fl);
const fl2 = mesh(new THREE.BoxGeometry(0.06, 0.6, 2), new THREE.MeshStandardMaterial({ color: 0xce1126 })); fl2.position.set(0, 3.1, 1); flag.add(fl2);
flag.position.set(0, 18.2, 10); choc.add(flag);

// ---------- snow particles ----------
const NFLAKE = 9000;
const flakeGeo = new THREE.BufferGeometry();
const fBase = new Float32Array(NFLAKE * 4);
for (let i = 0; i < NFLAKE; i++) { fBase[i * 4] = R(); fBase[i * 4 + 1] = R(); fBase[i * 4 + 2] = R(); fBase[i * 4 + 3] = R(); }
const fPos = new Float32Array(NFLAKE * 3);
flakeGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
const flakeM = new THREE.PointsMaterial({ size: 0.55, map: dotTex(), transparent: true, depthWrite: false, opacity: 0, color: 0xffffff });
const flakes = new THREE.Points(flakeGeo, flakeM); flakes.frustumCulled = false; scene.add(flakes);
function updateFlakes(t, center, intensity, wind) {
  const BX = 140, BY = 70, BZ = 140;
  for (let i = 0; i < NFLAKE; i++) {
    const a = fBase[i * 4], b = fBase[i * 4 + 1], c = fBase[i * 4 + 2], d = fBase[i * 4 + 3];
    const speed = 3 + d * 3;
    let y = (b * BY - t * speed) % BY; if (y < 0) y += BY;
    let x = ((a * BX + t * wind * (0.6 + d) + Math.sin(t * 0.8 + d * 20) * 1.5) % BX + BX) % BX;
    const z = c * BZ + Math.cos(t * 0.6 + a * 20) * 1.2;
    fPos[i * 3] = center.x - BX / 2 + x; fPos[i * 3 + 1] = center.y - 10 + y; fPos[i * 3 + 2] = center.z - BZ / 2 + z;
  }
  flakeGeo.attributes.position.needsUpdate = true;
  flakeM.opacity = intensity;
}

// =========================================================
// TIMELINE
// =========================================================
// global snow coverage (0..1)
function snowCover(t) { return smooth(14, 30, t) * (1 - smooth(80.5, 88, t)); }
function snowfall(t) { return smooth(12, 16, t) * (1 - smooth(78, 82, t)) * 0.95; }
function freeze(t) { return smooth(20, 32, t) * (1 - smooth(81, 88, t)); }
function sunny(t) { return 1 - smooth(10, 18, t) + smooth(80, 86, t); }
function night(t) { return smooth(67.5, 69, t) * (1 - smooth(79.5, 80.5, t)); }

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const shots = [
  { t0: 0, t1: 10, from: [V(160, 45, 190), V(0, -10, 0)], to: [V(75, 20, 95), V(0, 2, 0)] },
  { t0: 10, t1: 20, from: [V(70, 18, 90), V(0, 8, 0)], to: [V(-40, 14, 75), V(5, 10, 0)] },
  { t0: 20, t1: 32, from: [V(80, 9, 60), V(30, 3, 45)], to: [V(25, 35, 120), V(20, 2, 30)] },
  { t0: 32, t1: 45, from: [V(VX - 30, 16, -2), V(VX - 75, 3, 0)], to: [V(VX - 8, 11, 50), V(VX - 6, 3, 27)] },
  { t0: 45, t1: 57, from: [V(TX + 150, 45, 140), V(TX, 20, 0)], to: [V(TX + 60, 70, 95), V(TX - 10, 25, -20)] },
  { t0: 57, t1: 68, from: [V(CX + 80, 40, 90), V(CX, 8, -60)], to: [V(CX + 22, 16, 44), V(CX, 9, 8)] },
  { t0: 68, t1: 80, from: [V(VX + 84, 5, 3), V(VX + 30, 6, 0)], to: [V(VX - 20, 9, 3), V(VX - 60, 6, 0)] },
  { t0: 80, t1: 90, from: [V(40, 16, 80), V(0, 7, 0)], to: [V(140, 60, 170), V(0, 5, 0)] },
];

const captions = [
  { t0: 0.6, t1: 9.6, big: 'WHAT IF THE PHILIPPINES', big2: 'HAD SNOW FOR A WHOLE YEAR?', small: '7,641 tropical islands  •  average temperature 27°C', title: true },
  { t0: 10.4, t1: 19.6, big: 'DAY 1: THE BIG FREEZE', small: 'Temperatures crash from 32°C to −5°C overnight. Almost nobody owns a winter coat.' },
  { t0: 20.4, t1: 31.6, big: 'WHITE BEACHES… FOR REAL', small: 'Palm trees bend under snow. Coastal waters freeze and the bangkas get stuck in the ice.' },
  { t0: 32.4, t1: 44.6, big: 'LIFE IN THE BARANGAY', small: 'Jeepneys wear snow roofs, roads turn icy, and kids build their very first snowman.' },
  { t0: 45.4, t1: 56.6, big: 'THE RICE TERRACES FREEZE', small: 'Rice can’t grow in snow. Farms stop, imports rise — hot soup becomes everyone’s comfort food.' },
  { t0: 57.4, t1: 67.6, big: 'CHOCOLATE HILLS → VANILLA HILLS', small: 'Bohol becomes Asia’s newest ski resort. Tourists arrive in a whole new season.' },
  { t0: 68.4, t1: 79.6, big: 'FINALLY… A WHITE CHRISTMAS!', small: 'Parols glow over snowy streets. Bibingka and hot tsokolate never tasted better.' },
  { t0: 80.4, t1: 89.6, big: 'AFTER ONE YEAR, THE SUN RETURNS', big2: '', small: 'Snow melts, seas thaw, and the islands bloom again. Mabuhay ang tag-araw!', end: true },
];
const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
function tempAt(t) {
  if (t < 10) return 32;
  if (t < 16) return lerp(32, -5, smooth(10, 16, t));
  if (t < 80) return -5 + Math.sin(t * 0.7) * 2 - smooth(60, 70, t) * 4;
  return lerp(-9, 30, smooth(80, 87, t));
}

function camAt(t) {
  let s = shots[shots.length - 1];
  for (const sh of shots) if (t >= sh.t0 && t < sh.t1) { s = sh; break; }
  const u = ease(clamp((t - s.t0) / (s.t1 - s.t0)));
  return { pos: s.from[0].clone().lerp(s.to[0], u), tgt: s.from[1].clone().lerp(s.to[1], u), s };
}

const C_SUNNY = new THREE.Color(0x6fc3f2), C_SNOWY = new THREE.Color(0xa9b6c6), C_NIGHT = new THREE.Color(0x0a1430);
const tmpC = new THREE.Color();

function renderAt(t) {
  const cover = snowCover(t), sn = sunny(t), nt = night(t), fr = freeze(t);
  // materials
  for (const s of snowMats) s.mat.color.copy(s.base).lerp(WHITE, clamp(cover * s.k));
  // sky
  tmpC.copy(C_SNOWY).lerp(C_SUNNY, clamp(sn)).lerp(C_NIGHT, nt);
  scene.background = tmpC.clone(); scene.fog.color.copy(tmpC);
  scene.fog.near = lerp(60, 140, sn) * (1 - nt * 0.3); scene.fog.far = lerp(300, 480, sn);
  hemi.intensity = lerp(0.75, 1.0, sn) * (1 - nt * 0.82);
  hemi.color.set(sn > 0.5 ? 0xcfeaff : 0xdde6f2);
  sun.intensity = lerp(0.7, 2.6, sn) * (1 - nt * 0.95);
  sun.color.set(0xfff1d0).lerp(new THREE.Color(0xdfe8ff), 1 - sn);
  renderer.toneMappingExposure = lerp(1.0, 1.08, sn) + nt * 0.3;
  sunDisc.visible = sn > 0.05; sunDisc.material.color.set(0xffe08a);
  cloudM.color.set(0xffffff).lerp(new THREE.Color(0x8a96a8), 1 - sn).lerp(new THREE.Color(0x1a2240), nt);
  clouds.position.x = t * 2.5;
  clouds.children.forEach((c, i) => { c.position.y = lerp(70 + (i % 5) * 6, 48 + (i % 4) * 5, 1 - sn); });

  // ocean
  const pa = oceanGeo.attributes.position.array; const amp = 0.6 * (1 - fr);
  for (let i = 0; i < pa.length; i += 3) {
    const x = oceanBase[i], z = oceanBase[i + 2];
    pa[i + 1] = amp * (Math.sin(x * 0.08 + t * 1.3) + Math.cos(z * 0.07 + t * 1.1) * 0.7 + Math.sin((x + z) * 0.15 + t * 2) * 0.3);
  }
  oceanGeo.attributes.position.needsUpdate = true; oceanGeo.computeVertexNormals();
  oceanM.color.copy(OCEAN_WARM).lerp(OCEAN_ICE, fr * 0.85); oceanM.roughness = lerp(0.2, 0.55, fr);
  floes.forEach(f => { const k = clamp(fr * 1.6 - f.userData.d * 0.6); f.position.y = lerp(-0.6, 0.2, k); f.visible = k > 0.01; });
  boats.forEach((b, i) => { b.position.y = 0.3 + (1 - fr) * Math.sin(t * 1.5 + i) * 0.3; b.rotation.z = (1 - fr) * Math.sin(t * 1.2 + i) * 0.06; });

  // village
  const jt = clamp((t - 32) / 13);
  jeep.position.x = -95 + jt * 120; jeep.userData.wheels.forEach(w => w.rotation.y = t * 4);
  jeep.position.y = Math.sin(t * 9) * 0.04;
  jeep2.position.x = 100 - clamp((t - 33) / 13) * 110;
  [jeep, jeep2].forEach(j => { j.userData.pile.scale.y = Math.max(0.01, cover); j.userData.pile.visible = cover > 0.02; });
  const smG = smooth(34, 41, t) * cover; sman.scale.setScalar(Math.max(0.001, smG)); sman.visible = smG > 0.01;
  kids.forEach((k, i) => { k.position.y = Math.abs(Math.sin(t * 5 + i * 1.7)) * 0.35 * (t > 40 && t < 80 ? 1 : 0.2); });
  snowballs.forEach((b, i) => {
    const ph = ((t * 0.7 + i * 0.33) % 1); b.position.set(-9 + i * 3 + ph * 10, 2 + Math.sin(ph * Math.PI) * 3, 31 - ph * 8); b.visible = t > 39 && t < 80;
  });
  parols.forEach((p, i) => { p.userData.m.emissiveIntensity = 0.3 + nt * (1.4 + Math.sin(t * 3 + i) * 0.4); if (p.userData.ry === undefined) p.userData.ry = p.rotation.y; p.rotation.y = p.userData.ry + Math.sin(t * 0.8 + i) * 0.15; });
  bulbs.forEach((b, i) => { b.material.emissiveIntensity = nt * (((Math.floor(t * 3) + i) % 3 === 0) ? 3.2 : 1.2); });
  parolLights.forEach((l, i) => l.intensity = nt * 120 * (0.85 + Math.sin(t * 2 + i) * 0.15));

  // ski
  const st = ((t - 57) / 5.5) % 1; const sa = st * Math.PI * 1.2 + 0.4;
  const sr = 3 + st * 11; const shY = 14 * 1.3 * Math.sqrt(Math.max(0, 1 - (sr / 14) ** 2));
  skier.position.set(Math.cos(sa) * sr, shY + 0.1, 10 + Math.sin(sa) * sr);
  skier.rotation.y = -sa; skier.rotation.z = 0.25;
  skier.visible = t > 57 && t < 68;

  // camera
  const c = camAt(t);
  camera.position.copy(c.pos); camera.lookAt(c.tgt);
  // slight handheld drift
  camera.position.y += Math.sin(t * 0.9) * 0.15;
  sun.position.set(c.tgt.x - 80, 120, c.tgt.z + 60); sun.target.position.copy(c.tgt);
  // snow particles follow camera
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
  const center = camera.position.clone().addScaledVector(fwd, 40);
  updateFlakes(t, center, snowfall(t), nt > 0.5 ? 1 : 3);

  renderer.render(scene, camera);
  composite(t, c.s);
  return out;
}

// ---------- 2D overlay ----------
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrap(text, maxW) { const words = text.split(' '); const lines = []; let line = ''; for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; } if (line) lines.push(line); return lines; }

function composite(t, shot) {
  ctx.globalAlpha = 1;
  ctx.drawImage(renderer.domElement, 0, 0);
  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // cool tint during winter
  const cover = snowCover(t);
  if (cover > 0) { ctx.fillStyle = `rgba(160,190,230,${0.07 * cover})`; ctx.fillRect(0, 0, W, H); }

  // HUD: month + temperature (from day 1 on)
  const hudA = smooth(10.5, 11.5, t) * (1 - smooth(88.5, 89.5, t));
  if (hudA > 0) {
    ctx.globalAlpha = hudA;
    const mi = clamp(Math.floor(lerp(0, 12, clamp((t - 11) / 70))), 0, 11);
    const label = t >= 81 ? 'ONE YEAR LATER' : months[mi];
    ctx.font = 'bold 18px "DejaVu Sans", sans-serif';
    const lw = Math.max(170, ctx.measureText(label).width + 40);
    ctx.fillStyle = 'rgba(10,20,40,0.55)'; roundRect(28, 26, lw, 64, 14); ctx.fill();
    ctx.fillStyle = '#9fd3ff'; ctx.font = 'bold 12px "DejaVu Sans", sans-serif'; ctx.fillText('MONTH OF SNOW', 46, 50);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px "DejaVu Sans", sans-serif'; ctx.fillText(label, 46, 77);
    // temp
    const temp = Math.round(tempAt(t));
    const tx = W - 28 - 170;
    ctx.fillStyle = 'rgba(10,20,40,0.55)'; roundRect(tx, 26, 170, 64, 14); ctx.fill();
    ctx.fillStyle = '#9fd3ff'; ctx.font = 'bold 12px "DejaVu Sans", sans-serif'; ctx.fillText('MANILA TEMP', tx + 18, 50);
    ctx.fillStyle = temp > 15 ? '#ffb347' : '#bfe6ff'; ctx.font = 'bold 26px "DejaVu Sans", sans-serif';
    ctx.fillText((temp < 0 ? '−' + Math.abs(temp) : temp) + '°C', tx + 18, 80);
    // thermometer bar
    const frac = clamp((temp + 12) / 46);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; roundRect(tx + 110, 68, 42, 8, 4); ctx.fill();
    ctx.fillStyle = temp > 15 ? '#ff7b39' : '#5ab8ff'; roundRect(tx + 110, 68, Math.max(8, 42 * frac), 8, 4); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // captions
  for (const c of captions) {
    const a = smooth(c.t0, c.t0 + 0.6, t) * (1 - smooth(c.t1 - 0.6, c.t1, t));
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    const rise = (1 - smooth(c.t0, c.t0 + 0.8, t)) * 16;
    if (c.title) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 60 + rise, W, 220);
      ctx.fillStyle = '#9fd3ff'; ctx.font = 'bold 20px "DejaVu Sans", sans-serif'; ctx.fillText('A 3D  " W H A T   I F ? "  S T O R Y', W / 2, 106 + rise);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 54px "DejaVu Sans", sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12;
      ctx.fillText(c.big, W / 2, 166 + rise); ctx.fillStyle = '#ffe08a'; ctx.fillText(c.big2, W / 2, 230 + rise);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#e8f4ff'; ctx.font = '20px "DejaVu Sans", sans-serif'; ctx.fillText(c.small, W / 2, 268 + rise);
      ctx.textAlign = 'left';
    } else {
      ctx.font = '22px "DejaVu Sans", sans-serif';
      const lines = wrap(c.small, 900);
      const bh = 70 + lines.length * 30; const by = H - 40 - bh + rise; const bx = 60;
      ctx.fillStyle = 'rgba(8,18,38,0.62)'; roundRect(bx, by, 980, bh, 18); ctx.fill();
      ctx.fillStyle = c.end ? '#ffb347' : '#5ab8ff'; roundRect(bx, by, 8, bh, 4); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px "DejaVu Sans", sans-serif'; ctx.fillText(c.big, bx + 34, by + 46);
      ctx.fillStyle = '#dbe9f7'; ctx.font = '22px "DejaVu Sans", sans-serif';
      lines.forEach((l, i) => ctx.fillText(l, bx + 34, by + 84 + i * 30));
    }
    ctx.globalAlpha = 1;
  }

  // end card
  const endA = smooth(87, 88, t);
  if (endA > 0) {
    ctx.globalAlpha = endA * 0.85; ctx.fillStyle = '#06101f'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = endA; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe08a'; ctx.font = 'bold 50px "DejaVu Sans", sans-serif'; ctx.fillText('MABUHAY, PILIPINAS!', W / 2, H / 2 - 10);
    ctx.fillStyle = '#cfe6ff'; ctx.font = '22px "DejaVu Sans", sans-serif'; ctx.fillText('What would YOU do in a snowy Philippines?', W / 2, H / 2 + 40);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }

  // fades between shots (dip to white for snow shots, black otherwise)
  let fade = 0;
  fade = Math.max(fade, 1 - smooth(0, 0.8, t));
  for (const sh of shots) {
    if (sh.t0 > 0) fade = Math.max(fade, 1 - smooth(0, 0.45, Math.abs(t - sh.t0)));
  }
  fade = Math.max(fade, smooth(89.3, 90, t));
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
}

window.renderAt = (t) => { renderAt(t); return true; };
window.frameJPEG = (t, q = 0.9) => { renderAt(t); return out.toDataURL('image/jpeg', q); };
window.ready = true;
