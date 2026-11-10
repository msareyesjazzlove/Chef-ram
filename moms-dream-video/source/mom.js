import * as THREE from 'three';

const W = 1280, H = 720;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = rng(777);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
const out = document.createElement('canvas'); out.width = W; out.height = H;
const ctx = out.getContext('2d');

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x7ec8f0, 120, 420);
const camera = new THREE.PerspectiveCamera(42, W / H, 0.3, 1500);
const hemi = new THREE.HemisphereLight(0xcfeaff, 0x5a7a3a, 0.9); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d0, 2.4);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 400 });
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);

const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
const glow = (color, i = 1.5) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: i, roughness: 0.5 });
function mesh(geo, m, cast = true, recv = true) { const o = new THREE.Mesh(geo, m); o.castShadow = cast; o.receiveShadow = recv; return o; }
function box(w, h, d, m) { return mesh(new THREE.BoxGeometry(w, h, d), m); }

function textTex(lines, { w = 1024, h = 256, bg = '#7a1f2b', fg = '#ffe08a', font = 'bold 120px "DejaVu Serif", serif', border = '#ffe08a' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  if (border) { x.strokeStyle = border; x.lineWidth = 10; x.strokeRect(14, 14, w - 28, h - 28); }
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (typeof lines === 'string') lines = [[lines, font]];
  const step = h / (lines.length + 1);
  lines.forEach(([s, f], i) => { x.font = f; x.fillText(s, w / 2, step * (i + 1)); });
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx;
}
function dotTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
const DOT = dotTex();

// ---------- characters ----------
function person({ shirt = 0x3a86ff, hair = 0x1a1110, skin = 0xc68b59, bun = false, apron = false, grad = false, pants = 0x2b2d42 } = {}) {
  const g = new THREE.Group();
  const legs = mesh(new THREE.CapsuleGeometry(0.36, 0.7, 4, 8), M(pants)); legs.position.y = 0.7; g.add(legs);
  const body = mesh(new THREE.CapsuleGeometry(0.46, 0.8, 4, 10), M(grad ? 0x111122 : shirt)); body.position.y = 1.55; g.add(body);
  if (grad) { const gown = mesh(new THREE.ConeGeometry(0.75, 1.9, 14, 1, true), M(0x111122, { side: THREE.DoubleSide })); gown.position.y = 1.1; g.add(gown); }
  if (apron) { const a = box(0.75, 1.0, 0.06, M(0xffffff)); a.position.set(0, 1.3, 0.45); g.add(a); }
  const armM = M(grad ? 0x111122 : shirt);
  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(0.55 * s, 2.0, 0);
    const arm = mesh(new THREE.CapsuleGeometry(0.14, 0.75, 4, 6), armM); arm.position.y = -0.5; pivot.add(arm);
    const hand = mesh(new THREE.SphereGeometry(0.15, 8, 6), M(skin)); hand.position.y = -0.98; pivot.add(hand);
    pivot.rotation.z = 0.12 * s; g.add(pivot); arms.push(pivot);
  }
  const head = mesh(new THREE.SphereGeometry(0.42, 16, 12), M(skin)); head.position.y = 2.55; g.add(head);
  const hairM = M(hair);
  const cap = mesh(new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM); cap.position.y = 2.6; cap.rotation.x = -0.25; g.add(cap);
  if (bun) { const b = mesh(new THREE.SphereGeometry(0.22, 10, 8), hairM); b.position.set(0, 2.85, -0.38); g.add(b); }
  const eyeM = M(0x111111);
  for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeM); e.position.set(0.15 * s, 2.6, 0.38); g.add(e); }
  const smile = mesh(new THREE.TorusGeometry(0.1, 0.025, 4, 10, Math.PI), M(0x7a2a2a)); smile.position.set(0, 2.43, 0.39); smile.rotation.z = Math.PI; g.add(smile);
  let gcap = null;
  if (grad) {
    gcap = new THREE.Group();
    const top = box(0.95, 0.06, 0.95, M(0x111122)); top.position.y = 0.22; gcap.add(top);
    const bowl = mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.25, 12), M(0x111122)); bowl.position.y = 0.08; gcap.add(bowl);
    const tassel = box(0.04, 0.4, 0.04, M(0xffd23f)); tassel.position.set(0.4, 0.02, 0.4); gcap.add(tassel);
    gcap.position.y = 2.85; g.add(gcap);
  }
  g.userData = { arms, gcap, head };
  return g;
}

// ---------- particles ----------
function particleSystem(n, { size = 0.5, additive = false, color = 0xffffff, opacity = 1 } = {}) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  const m = new THREE.PointsMaterial({ size, map: DOT, transparent: true, depthWrite: false, vertexColors: true, opacity, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, color });
  const p = new THREE.Points(geo, m); p.frustumCulled = false; scene.add(p);
  return p;
}

// =========================================================
// A — PROVINCE: bahay kubo + carinderia (x = 0)
// =========================================================
const prov = new THREE.Group(); scene.add(prov);
prov.add(mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), M(0x5f9a3e)));
const dirt = mesh(new THREE.PlaneGeometry(400, 9).rotateX(-Math.PI / 2), M(0xa58a62)); dirt.position.set(0, 0.03, 22); prov.add(dirt);
function bahayKubo() {
  const g = new THREE.Group();
  const stM = M(0x6b4b2a);
  for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { const s = mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 6), stM); s.position.set(x, 0.8, z); g.add(s); }
  const body = box(4.6, 2.6, 4.6, M(0xc9a066)); body.position.y = 2.9; g.add(body);
  const door = box(1, 1.7, 0.1, M(0x4a3018)); door.position.set(0, 2.6, 2.33); g.add(door);
  const win = box(1, 0.8, 0.1, glow(0xffb347, 0.6)); win.position.set(1.4, 3.1, 2.33); g.add(win);
  const roof = mesh(new THREE.ConeGeometry(4.6, 3.2, 4), M(0x9b7a3e, { flatShading: true })); roof.position.y = 5.8; roof.rotation.y = Math.PI / 4; g.add(roof);
  return g;
}
const kubo = bahayKubo(); kubo.position.set(-6, 0, 0); prov.add(kubo);
function palm(scale = 1, lean = 0.25) {
  const g = new THREE.Group(); const tM = M(0x8a6a45), lM = M(0x2f9e44, { flatShading: true });
  let p = new THREE.Vector3();
  for (let i = 0; i < 8; i++) { const a = lean * (i / 8) * 1.4; const s = mesh(new THREE.CylinderGeometry(0.3 - i * 0.02, 0.36 - i * 0.02, 1.3, 7), tM); s.position.set(p.x + Math.sin(a) * 0.65, p.y + Math.cos(a) * 0.65, 0); s.rotation.z = -a; g.add(s); p.set(p.x + Math.sin(a) * 1.25, p.y + Math.cos(a) * 1.25, 0); }
  for (let i = 0; i < 9; i++) {
    const lg = new THREE.BoxGeometry(0.9, 0.06, 4.2, 1, 1, 6); const pos = lg.attributes.position;
    for (let v = 0; v < pos.count; v++) { const z = pos.getZ(v) + 2.1; pos.setY(v, pos.getY(v) - 0.09 * z * z); pos.setX(v, pos.getX(v) * (1 - z / 5)); pos.setZ(v, z); }
    lg.computeVertexNormals(); const l = mesh(lg, lM); l.position.copy(p); l.rotation.y = i / 9 * 6.28 + R() * 0.3; l.rotation.x = -0.2 + R() * 0.2; g.add(l);
  }
  g.scale.setScalar(scale); return g;
}
for (let i = 0; i < 14; i++) { const p = palm(0.9 + R() * 0.5, 0.1 + R() * 0.4); p.position.set(-60 + i * 9 + R() * 4, 0, -14 - R() * 20); p.rotation.y = R() * 6; prov.add(p); }
for (let i = 0; i < 6; i++) { const p = palm(1 + R() * 0.3, 0.2 + R() * 0.3); p.position.set(10 + i * 12, 0, 34 + R() * 8); prov.add(p); }
// cooking fire + pot at hut
const stove = new THREE.Group(); stove.position.set(-1, 0, 5); prov.add(stove);
for (let i = 0; i < 3; i++) { const s = mesh(new THREE.DodecahedronGeometry(0.35), M(0x666666)); s.position.set(Math.cos(i * 2.1) * 0.6, 0.25, Math.sin(i * 2.1) * 0.6); stove.add(s); }
const fire = mesh(new THREE.ConeGeometry(0.4, 0.9, 8), glow(0xff7b00, 3)); fire.position.y = 0.45; stove.add(fire);
const pot = mesh(new THREE.CylinderGeometry(0.6, 0.5, 0.7, 14), M(0x333333, { metalness: 0.5, roughness: 0.4 })); pot.position.y = 1.15; stove.add(pot);
const fireLight = new THREE.PointLight(0xff8a2a, 30, 18, 1.5); fireLight.position.set(-1, 1.5, 5); prov.add(fireLight);
const momA = person({ shirt: 0xd16b86, bun: true, apron: true }); momA.position.set(0.6, 0, 5.6); momA.rotation.y = -1.2; prov.add(momA);
const kidA = person({ shirt: 0xffd23f, hair: 0x221a10 }); kidA.scale.setScalar(0.55); kidA.position.set(-2.4, 0, 6.6); kidA.rotation.y = 1.0; prov.add(kidA);
// carinderia stall
const stall = new THREE.Group(); stall.position.set(20, 0, 14); prov.add(stall);
const counter = box(7, 1.3, 1.6, M(0x8b5a2b)); counter.position.y = 0.65; stall.add(counter);
for (const [x, z] of [[-3.4, -2], [3.4, -2], [-3.4, 0.7], [3.4, 0.7]]) { const p = mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 6), M(0x6b4b2a)); p.position.set(x, 1.7, z); stall.add(p); }
const tarp = box(7.6, 0.12, 3.4, M(0x2a7de1)); tarp.position.set(0, 3.45, -0.6); tarp.rotation.x = 0.12; stall.add(tarp);
for (let i = 0; i < 4; i++) { const s = box(7.62, 0.13, 0.4, M(0xffffff)); s.position.set(0, 3.47, -2 + i * 0.85); s.rotation.x = 0.12; stall.add(s); }
const stallSign = mesh(new THREE.PlaneGeometry(4.2, 0.9), new THREE.MeshStandardMaterial({ map: textTex('CARINDERIA', { bg: '#fff3d6', fg: '#b3261e', font: 'bold 130px "DejaVu Sans", sans-serif', border: '#b3261e' }) }));
stallSign.position.set(0, 3.1, 1.15); stall.add(stallSign);
const stallPots = [];
[0xc0c0c0, 0x333333, 0xc0c0c0, 0x9a6a3a].forEach((c, i) => { const p = mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.5, 14), M(c, { metalness: 0.5, roughness: 0.35 })); p.position.set(-2.4 + i * 1.6, 1.55, 0.1); stall.add(p); stallPots.push(p); });
const momB = person({ shirt: 0xd16b86, bun: true, apron: true }); momB.position.set(0, 0, -1.6); stall.add(momB);
const cust = [person({ shirt: 0x2a9d8f }), person({ shirt: 0x8338ec, hair: 0x333333 })];
cust.forEach((c, i) => { c.position.set(-1.5 + i * 3, 0, 2.4); c.rotation.y = Math.PI; stall.add(c); });
const kidB = person({ shirt: 0xffffff, pants: 0x1d3557, hair: 0x221a10 }); kidB.scale.setScalar(0.62); kidB.position.set(5.5, 0, 6); stall.add(kidB);
const bag = box(0.7, 0.8, 0.3, M(0xd62828)); bag.position.set(0, 1.5, -0.45); kidB.add(bag);
const steamA = particleSystem(160, { size: 0.7, opacity: 0.55 });
const steamB = particleSystem(260, { size: 0.6, opacity: 0.5 });

// =========================================================
// B — SCHOOL / GRADUATION (x = 300)
// =========================================================
const SX = 300;
const school = new THREE.Group(); school.position.x = SX; scene.add(school);
school.add(mesh(new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2), M(0x6aa84f)));
const bld = box(46, 12, 10, M(0xf1e3c6)); bld.position.set(0, 6, -22); school.add(bld);
const bRoof = box(48, 1, 12, M(0xb3261e)); bRoof.position.set(0, 12.5, -22); school.add(bRoof);
for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) { const w = box(2.6, 2.2, 0.2, M(0x3d5a80, { roughness: 0.2, metalness: 0.3 })); w.position.set(-20 + i * 5, 4 + r * 5, -16.9); school.add(w); }
const schoolSign = mesh(new THREE.PlaneGeometry(14, 1.6), new THREE.MeshStandardMaterial({ map: textTex('PAARALAN · CLASS OF 2018', { w: 1600, h: 200, bg: '#1d3557', fg: '#ffffff', font: 'bold 100px "DejaVu Sans", sans-serif', border: '#ffd23f' }) }));
schoolSign.position.set(0, 13.9, -15.9); school.add(schoolSign);
const stage = box(26, 1.2, 9, M(0x8b5a2b)); stage.position.set(0, 0.6, -6); school.add(stage);
const banner = mesh(new THREE.PlaneGeometry(18, 2.4), new THREE.MeshStandardMaterial({ map: textTex([['CONGRATULATIONS', 'bold 110px "DejaVu Serif", serif'], ['GRADUATES!', 'bold 90px "DejaVu Serif", serif']], { w: 1400, h: 300, bg: '#ffd23f', fg: '#7a1f2b', border: '#7a1f2b' }), side: THREE.DoubleSide }));
banner.position.set(0, 7.5, -9.8); school.add(banner);
for (const x of [-9.5, 9.5]) { const p = mesh(new THREE.CylinderGeometry(0.15, 0.15, 8, 6), M(0x444444)); p.position.set(x, 4.5, -9.8); school.add(p); }
const grads = [];
for (let i = 0; i < 9; i++) { const g = person({ grad: true, hair: i % 3 ? 0x1a1110 : 0x3b2a1a, skin: [0xc68b59, 0xd9a273, 0xb07548][i % 3] }); g.position.set(-10 + i * 2.5, 1.2, -5); school.add(g); grads.push(g); }
const hero = grads[4];
const sash = box(0.12, 1.4, 0.12, M(0xffd23f)); sash.position.set(0, 1.6, 0.5); sash.rotation.z = 0.6; hero.add(sash);
const chairs = new THREE.Group(); school.add(chairs);
const audience = [];
for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) {
  const p = person({ shirt: [0xe76f51, 0x2a9d8f, 0xe9c46a, 0x264653, 0xf4a261, 0x8338ec][(i + r) % 6], bun: (i + r) % 3 === 0 });
  p.position.set(-10.5 + i * 3, 0, 6 + r * 3.2); p.rotation.y = Math.PI; school.add(p); audience.push(p);
}
const momS = audience[3]; momS.children[1].material = M(0xd16b86);
const flagP = mesh(new THREE.CylinderGeometry(0.12, 0.12, 14, 6), M(0xcccccc)); flagP.position.set(-20, 7, -12); school.add(flagP);
const fB = box(0.05, 1.2, 3.4, M(0x0038a8)); fB.position.set(-20, 13.2, -10.3); school.add(fB);
const fR = box(0.06, 1.2, 3.4, M(0xce1126)); fR.position.set(-20, 12.0, -10.3); school.add(fR);
const confettiS = particleSystem(500, { size: 0.35 });

// =========================================================
// C — THE RESTAURANT (x = 600)
// =========================================================
const RX = 600;
const rest = new THREE.Group(); rest.position.x = RX; scene.add(rest);
rest.add(mesh(new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2), M(0x6aa84f)));
const street = mesh(new THREE.PlaneGeometry(300, 12).rotateX(-Math.PI / 2), M(0x4a4a50)); street.position.set(0, 0.03, 24); rest.add(street);
const walk = mesh(new THREE.PlaneGeometry(300, 6).rotateX(-Math.PI / 2), M(0xcfc6b8)); walk.position.set(0, 0.05, 15); rest.add(walk);
const slab = box(28, 0.5, 16, M(0xb8b0a4)); slab.position.set(0, 0.25, 0); rest.add(slab);
// wall blocks
const bricks = [];
const brickM = M(0xf4ead8), brickM2 = M(0xe7d9bf);
const BW = 2, BH = 1.25, ROWS = 6, Lx = 26, Lz = 14;
let order = 0;
for (let r = 0; r < ROWS; r++) {
  const y = 0.5 + BH / 2 + r * BH;
  const pushB = (x, z, w, d) => {
    const isWindow = r >= 1 && r <= 3 && Math.abs(z - Lz / 2) < 0.1 && Math.abs(x) > 3 && Math.abs(x) < 11;
    const isDoor = r <= 2 && Math.abs(z - Lz / 2) < 0.1 && Math.abs(x) < 2.1;
    if (isWindow || isDoor) return;
    const b = box(w, BH * 0.98, d, (r + Math.round(x + z)) % 2 ? brickM : brickM2);
    b.position.set(x, y, z); b.userData = { y, i: order++ }; rest.add(b); bricks.push(b);
  };
  for (let i = 0; i < Lx / BW; i++) { const x = -Lx / 2 + BW / 2 + i * BW; pushB(x, Lz / 2, BW * 0.98, 0.6); pushB(x, -Lz / 2, BW * 0.98, 0.6); }
  for (let i = 0; i < Lz / BW; i++) { const z = -Lz / 2 + BW / 2 + i * BW; pushB(Lx / 2, z, 0.6, BW * 0.98); pushB(-Lx / 2, z, 0.6, BW * 0.98); }
}
const NB = bricks.length;
const roofR = box(Lx + 2, 0.8, Lz + 2, M(0x7a1f2b)); roofR.position.y = 0.5 + ROWS * BH + 0.4; rest.add(roofR);
const parapet = box(Lx + 2, 1.4, 0.4, M(0x7a1f2b)); parapet.position.set(0, roofR.position.y + 1, Lz / 2 + 0.8); rest.add(parapet);
const glassM = glow(0xffd9a0, 0.25);
const windows = [];
for (const x of [-7, 7]) { const w = box(7.6, 3.6, 0.2, glassM); w.position.set(x, 0.5 + BH + 1.85, Lz / 2); rest.add(w); windows.push(w); }
const doorR = box(4.0, 3.7, 0.2, M(0x5c3317)); doorR.position.set(0, 0.5 + 1.85, Lz / 2); rest.add(doorR);
const awn = new THREE.Group(); awn.position.set(0, 0.5 + 4 * BH + 0.6, Lz / 2 + 1.2); rest.add(awn);
for (let i = 0; i < 13; i++) { const s = box(2, 0.15, 2.6, M(i % 2 ? 0xffffff : 0xb3261e)); s.position.x = -12 + i * 2; s.rotation.x = 0.35; awn.add(s); }
const signR = mesh(new THREE.PlaneGeometry(16, 2.6), new THREE.MeshStandardMaterial({ map: textTex("MAMA'S KITCHEN", { w: 1600, h: 260, bg: '#7a1f2b', fg: '#ffe08a', font: 'bold 150px "DejaVu Serif", serif' }), emissive: 0xffffff, emissiveIntensity: 0.15, emissiveMap: null }));
signR.position.set(0, roofR.position.y + 1.2, Lz / 2 + 1.05); rest.add(signR);
const sinceSign = mesh(new THREE.PlaneGeometry(5, 0.8), new THREE.MeshStandardMaterial({ map: textTex('EST. 2024', { w: 512, h: 128, bg: '#ffe08a', fg: '#7a1f2b', font: 'bold 80px "DejaVu Serif", serif', border: null }) }));
sinceSign.position.set(0, 0.5 + 3 * BH + 1.3, Lz / 2 + 0.12); rest.add(sinceSign);
// crane
const crane = new THREE.Group(); crane.position.set(-20, 0, -12); rest.add(crane);
const cM = M(0xffbe0b);
const mast = box(1.2, 26, 1.2, cM); mast.position.y = 13; crane.add(mast);
const jib = new THREE.Group(); jib.position.y = 26; crane.add(jib);
const arm = box(30, 0.9, 0.9, cM); arm.position.x = 9; jib.add(arm);
const cw = box(3, 2, 2, M(0x666666)); cw.position.x = -5; jib.add(cw);
const cable = box(0.08, 12, 0.08, M(0x222222)); cable.position.set(16, -6, 0); jib.add(cable);
const hookLoad = box(2, 1.2, 1, brickM); hookLoad.position.set(16, -12.4, 0); jib.add(hookLoad);
const workers = [];
for (let i = 0; i < 5; i++) { const w = person({ shirt: 0xff7b00, pants: 0x1d3557 }); const hat = mesh(new THREE.SphereGeometry(0.48, 12, 6, 0, 6.3, 0, 1.4), M(0xffd23f)); hat.position.y = 2.7; w.add(hat); w.position.set(-10 + i * 5, 0.5, Lz / 2 + 3 + (i % 2) * 2); rest.add(w); workers.push(w); }
const ownerC = person({ shirt: 0xffffff, pants: 0x2b2d42, hair: 0x221a10 }); ownerC.position.set(14, 0, 12); ownerC.rotation.y = -0.9; rest.add(ownerC);
const blueprint = box(1.2, 0.05, 0.9, M(0x2a6fdb)); blueprint.position.set(0, 1.6, 0.55); blueprint.rotation.x = 1.2; ownerC.add(blueprint);
// opening day props
const balloons = [];
const balCols = [0xff3b3b, 0xffd23f, 0x3a86ff, 0xff70a6, 0x2ec4b6, 0xffffff];
for (let i = 0; i < 18; i++) { const b = mesh(new THREE.SphereGeometry(0.55, 12, 10), M(balCols[i % 6], { roughness: 0.3 })); b.scale.y = 1.2; const side = i < 9 ? -1 : 1; b.position.set(side * (2.6 + (i % 3) * 0.5), 5.5 + (i % 9) * 0.4 + (i % 2) * 0.3, Lz / 2 + 0.8 + (i % 3) * 0.3); b.userData.p = b.position.clone(); rest.add(b); balloons.push(b); }
const ribbon = box(5.5, 0.25, 0.08, M(0xd62828)); ribbon.position.set(0, 2.2, Lz / 2 + 1.6); rest.add(ribbon);
const ribbonPosts = [-2.9, 2.9].map(x => { const p = mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4, 6), M(0xffd23f)); p.position.set(x, 1.2, Lz / 2 + 1.6); rest.add(p); return p; });
const momC = person({ shirt: 0xd16b86, bun: true, apron: true }); momC.position.set(-1.2, 0.5, Lz / 2 + 2.6); rest.add(momC);
const kidC = person({ shirt: 0xffffff, pants: 0x2b2d42, hair: 0x221a10 }); kidC.position.set(1.2, 0.5, Lz / 2 + 2.6); rest.add(kidC);
const queue = [];
for (let i = 0; i < 14; i++) { const q = person({ shirt: [0xe76f51, 0x2a9d8f, 0xe9c46a, 0x264653, 0x8338ec, 0x3a86ff][i % 6], bun: i % 4 === 1 }); q.position.set(4 + i * 1.6, 0, Lz / 2 + 6 + Math.sin(i) * 0.4); q.rotation.y = -Math.PI / 2 - 0.3; rest.add(q); queue.push(q); }
const lightsR = [];
for (let i = 0; i < 26; i++) { const b = mesh(new THREE.SphereGeometry(0.18, 6, 4), glow(balCols[i % 5], 0)); const u = i / 25; b.position.set(-13 + u * 26, roofR.position.y - 0.6 - Math.sin(u * Math.PI * 4) ** 2 * 0.5, Lz / 2 + 0.5); rest.add(b); lightsR.push(b); }
const confettiR = particleSystem(700, { size: 0.35 });

// =========================================================
// D — THE DREAM HOUSE (x = 900)
// =========================================================
const HX = 900;
const home = new THREE.Group(); home.position.x = HX; scene.add(home);
home.add(mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), M(0x5f9a3e)));
const hillH = mesh(new THREE.SphereGeometry(60, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), M(0x6aa84f)); hillH.scale.y = 0.08; hillH.position.set(0, 0, -6); home.add(hillH);
const houseG = new THREE.Group(); houseG.position.set(-1.6, 4.6, 3.4); houseG.scale.setScalar(1.4); home.add(houseG);
const hParts = [];
function hp(o, at) { o.userData.at = at; houseG.add(o); hParts.push(o); return o; }
const wallM = M(0xfaf7f0), trimM = M(0x5c3317), roofM = M(0xb5523b, { flatShading: true });
hp(box(20, 0.6, 12, M(0xbdb5a8)), 62.4).position.y = 0.3;
const f1 = hp(box(18, 4.6, 10, wallM), 63.4); f1.position.y = 2.9;
const f2 = hp(box(12, 4.2, 9, wallM), 65.0); f2.position.set(-3, 7.4, -0.3);
const bal = hp(box(6.4, 0.3, 4, trimM), 65.8); bal.position.set(5.6, 5.35, 3);
const rail = hp(box(6.4, 1.0, 0.15, M(0x333333)), 66.0); rail.position.set(5.6, 6.0, 4.9);
const roofShape = new THREE.Shape(); roofShape.moveTo(-7.4, 0); roofShape.lineTo(7.4, 0); roofShape.lineTo(0, 3.8); roofShape.closePath();
const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 10.4, bevelEnabled: false }); roofGeo.translate(0, 0, -5.2);
const roof2 = hp(mesh(roofGeo, roofM), 66.6); roof2.position.set(-3, 9.5, -0.3); roof2.rotation.y = Math.PI / 2;
const r1Shape = new THREE.Shape(); r1Shape.moveTo(-3.6, 0); r1Shape.lineTo(3.6, 0); r1Shape.lineTo(0, 2.0); r1Shape.closePath();
const roof1 = hp(mesh(new THREE.ExtrudeGeometry(r1Shape, { depth: 1.6, bevelEnabled: false }), roofM), 66.2); roof1.position.set(5.6, 5.5, 4.2); roof1.scale.set(0.95, 1, 1);
const homeWins = [];
const hwM = glow(0xffd28a, 0.15);
for (const [x, y] of [[-6, 2.9], [-1.5, 2.9], [-5.5, 7.4], [-0.5, 7.4]]) { const w = hp(box(2.6, 2.2, 0.2, hwM), 67.0); w.position.set(x, y, 5.05); homeWins.push(w); }
const hDoorPivot = new THREE.Group(); hDoorPivot.position.set(3.0, 0.6, 5.1); hp(hDoorPivot, 67.0);
const hDoor = box(2.2, 3.6, 0.2, trimM); hDoor.position.set(1.1, 1.8, 0); hDoorPivot.add(hDoor);
const knob = mesh(new THREE.SphereGeometry(0.12, 8, 6), M(0xffd23f, { metalness: 0.8, roughness: 0.3 })); knob.position.set(1.9, 1.8, 0.15); hDoorPivot.add(knob);
const doorGlow = box(2.2, 3.6, 0.1, glow(0xffd9a0, 1.0)); doorGlow.position.set(4.1, 2.4, 5.0); houseG.add(doorGlow);
const hSign = mesh(new THREE.PlaneGeometry(4.4, 1.0), new THREE.MeshStandardMaterial({ map: textTex("MAMA'S HOME", { w: 880, h: 200, bg: '#fff3d6', fg: '#7a1f2b', font: 'bold 84px "DejaVu Serif", serif', border: '#7a1f2b' }) }));
hp(hSign, 67.4).position.set(-3.8, 5.6 + 0.0, 5.12);
// garden + fence + path
const path = mesh(new THREE.PlaneGeometry(2.6, 26).rotateX(-Math.PI / 2), M(0xd8cdb8)); path.position.set(4.1, 4.65, 12); home.add(path);
const flowers = [];
const fCols = [0xff70a6, 0xffd23f, 0xff3b3b, 0xffffff, 0xc77dff];
for (let i = 0; i < 90; i++) {
  const side = i % 2 ? 1 : -1; const z = 15 + (i / 90) * 7.5; const x = 4.1 + side * (2 + R() * 6);
  const f = new THREE.Group(); const stem = box(0.06, 0.6, 0.06, M(0x2f7d32)); stem.position.y = 0.3; f.add(stem);
  const bl = mesh(new THREE.SphereGeometry(0.22, 8, 6), M(fCols[i % 5])); bl.position.y = 0.65; f.add(bl);
  f.position.set(x, 4.6, z); f.userData.at = 66 + R() * 3; home.add(f); flowers.push(f);
}
const fenceM = M(0xffffff);
for (let i = 0; i < 24; i++) { const x = -18 + i * 1.6; if (Math.abs(x - 4.1) < 1.8) continue; const p = box(0.2, 1.4, 0.2, fenceM); p.position.set(x, 5.3, 23); home.add(p); }
const fr1 = box(38, 0.15, 0.1, fenceM); fr1.position.set(1, 5.6, 23); home.add(fr1);
const gatePivot = new THREE.Group(); gatePivot.position.set(2.6, 4.6, 23); home.add(gatePivot);
const gate = box(3, 1.4, 0.12, fenceM); gate.position.set(1.5, 0.75, 0); gatePivot.add(gate);
for (let i = 0; i < 10; i++) { const p = palm(0.9 + R() * 0.4, 0.15 + R() * 0.3); const a = R() * 6.28; p.position.set(Math.cos(a) * (40 + R() * 20), 0, Math.sin(a) * (30 + R() * 15) - 20); home.add(p); }
for (const x of [-14, 16]) { const p = palm(1.1, 0.2); p.position.set(x, 4.6, 8); home.add(p); }
const porch = new THREE.PointLight(0xffc98a, 0, 40, 1.4); porch.position.set(4, 10, 18); home.add(porch);
const momD = person({ shirt: 0xd16b86, bun: true }); home.add(momD);
const kidD = person({ shirt: 0xffffff, pants: 0x2b2d42, hair: 0x221a10 }); home.add(kidD);
// fireworks + lanterns
const FW_N = 12, FW_P = 140;
const fireworks = particleSystem(FW_N * FW_P, { size: 1.7, additive: true });
const fwData = [];
const fwCols = [0xff3b3b, 0xffd23f, 0x3a86ff, 0xff70a6, 0x2ec4b6, 0xffffff, 0xff9f1c];
for (let k = 0; k < FW_N; k++) {
  const c = new THREE.Color(fwCols[k % fwCols.length]);
  const center = V(HX - 26 + R() * 52, 26 + R() * 14, -18 - R() * 18);
  const dirs = []; for (let i = 0; i < FW_P; i++) { const u = R() * 2 - 1, a = R() * 6.28, s = Math.sqrt(1 - u * u); dirs.push(V(s * Math.cos(a), u, s * Math.sin(a)).multiplyScalar(7 + R() * 3)); }
  fwData.push({ t0: 78.5 + k * 0.85 + R() * 0.3, c, center, dirs });
}
const lanterns = [];
for (let i = 0; i < 30; i++) { const l = mesh(new THREE.CylinderGeometry(0.4, 0.28, 0.8, 8), glow(0xffa94d, 2.2), false, false); l.userData = { x: HX - 25 + R() * 50, z: -10 + R() * 30, t0: 77 + R() * 6, s: 1.2 + R() * 1.2 }; scene.add(l); lanterns.push(l); }

// =========================================================
// LIGHTING KEYS
// =========================================================
const keys = [
  [0, { sky: 0xf0955f, sun: 1.0, sunC: 0xffa060, hemi: 0.55, exp: 1.0, night: 0.35 }],
  [9.9, { sky: 0xd9785a, sun: 0.8, sunC: 0xff8a50, hemi: 0.5, exp: 1.0, night: 0.45 }],
  [10.1, { sky: 0xf6c1a8, sun: 1.4, sunC: 0xffc29a, hemi: 0.7, exp: 1.0, night: 0.05 }],
  [21.9, { sky: 0xa9d6f2, sun: 2.2, sunC: 0xfff1d0, hemi: 0.9, exp: 1.0, night: 0 }],
  [22.1, { sky: 0x7ec8f0, sun: 2.6, sunC: 0xfff1d0, hemi: 1.0, exp: 1.05, night: 0 }],
  [72, { sky: 0x86c6ee, sun: 2.4, sunC: 0xfff1d0, hemi: 1.0, exp: 1.05, night: 0 }],
  [76, { sky: 0xf08a5d, sun: 1.0, sunC: 0xff8a50, hemi: 0.55, exp: 1.0, night: 0.4 }],
  [79, { sky: 0x0b1530, sun: 0.15, sunC: 0x9fb7ff, hemi: 0.2, exp: 1.25, night: 1 }],
  [90, { sky: 0x0b1530, sun: 0.15, sunC: 0x9fb7ff, hemi: 0.2, exp: 1.25, night: 1 }],
];
const cA = new THREE.Color(), cB = new THREE.Color();
function light(t) {
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const [ta, a] = keys[i], [tb, b] = keys[i + 1]; const u = smooth(ta, tb, t);
  const mix = k => lerp(a[k], b[k], u);
  return { sky: cA.set(a.sky).lerp(cB.set(b.sky), u).clone(), sunC: cA.set(a.sunC).lerp(cB.set(b.sunC), u).clone(), sun: mix('sun'), hemi: mix('hemi'), exp: mix('exp'), night: mix('night') };
}

// =========================================================
// CAMERA SHOTS
// =========================================================
const shots = [
  { t0: 0, t1: 10, from: [V(30, 14, 42), V(-3, 3, 2)], to: [V(9, 4.5, 17), V(-1.5, 2, 5)] },
  { t0: 10, t1: 22, from: [V(44, 8, 34), V(20, 2.5, 14)], to: [V(27, 4, 25), V(21, 2.2, 14)] },
  { t0: 22, t1: 34, from: [V(SX + 2, 7, 30), V(SX, 4, -6)], to: [V(SX + 4, 5.5, 13), V(SX, 4.2, -5)] },
  { t0: 34, t1: 48, orbit: { c: V(RX, 4, 0), r0: 52, r1: 38, a0: 0.9, a1: 1.9, h0: 24, h1: 12 } },
  { t0: 48, t1: 62, from: [V(RX + 22, 5, 36), V(RX, 5, 7)], to: [V(RX + 2, 3.5, 20), V(RX, 3.6, 9)] },
  { t0: 62, t1: 76, from: [V(HX + 38, 16, 58), V(HX, 7, -2)], to: [V(HX + 9, 8.5, 33), V(HX + 4, 6, 12)] },
  { t0: 76, t1: 90, from: [V(HX + 6, 8, 30), V(HX + 4, 8, 6)], to: [V(HX + 10, 11, 52), V(HX, 20, -14)] },
];
function camAt(t) {
  let s = shots[shots.length - 1]; for (const sh of shots) if (t >= sh.t0 && t < sh.t1) { s = sh; break; }
  const u = ease(clamp((t - s.t0) / (s.t1 - s.t0)));
  if (s.orbit) { const o = s.orbit; const a = lerp(o.a0, o.a1, u), r = lerp(o.r0, o.r1, u); return { pos: V(o.c.x + Math.cos(a) * r, lerp(o.h0, o.h1, u), o.c.z + Math.sin(a) * r), tgt: o.c.clone() }; }
  return { pos: s.from[0].clone().lerp(s.to[0], u), tgt: s.from[1].clone().lerp(s.to[1], u) };
}

// =========================================================
// RENDER
// =========================================================
const dropIn = (o, at, dur = 0.5) => { if (o.userData.y === undefined) o.userData.y = o.position.y; const k = clamp((tNow - at) / dur); o.visible = k > 0; o.position.y = o.userData.y + (1 - ease(k)) * 4; return k; };
let tNow = 0;
function steam(ps, t, sources, n) {
  const pa = ps.geometry.attributes.position.array;
  for (let i = 0; i < n; i++) {
    const s = sources[i % sources.length]; const ph = ((t * 0.35 + i * 0.6180339) % 1);
    pa[i * 3] = s.x + Math.sin(t * 1.5 + i) * 0.3 * ph + ph * 0.6; pa[i * 3 + 1] = s.y + ph * 3.5; pa[i * 3 + 2] = s.z + Math.cos(t + i) * 0.3 * ph;
  }
  ps.geometry.attributes.position.needsUpdate = true;
}
function confetti(ps, t, t0, origin, n, spread = 6) {
  const pa = ps.geometry.attributes.position.array, ca = ps.geometry.attributes.color.array; const dt = t - t0;
  const r = rng(99);
  for (let i = 0; i < n; i++) {
    const vx = (r() - 0.5) * spread, vy = 6 + r() * 6, vz = (r() - 0.5) * spread + 2, c = new THREE.Color(fwCols[i % fwCols.length]);
    if (dt < 0 || dt > 7) { pa[i * 3 + 1] = -100; continue; }
    const fall = Math.max(0, dt - 1);
    pa[i * 3] = origin.x + vx * Math.min(dt, 1.2) + Math.sin(dt * 3 + i) * 0.4;
    pa[i * 3 + 1] = Math.max(0.1, origin.y + vy * Math.min(dt, 1) - 4.9 * Math.min(dt, 1) ** 2 - fall * 1.6);
    pa[i * 3 + 2] = origin.z + vz * Math.min(dt, 1.2);
    ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b;
  }
  ps.geometry.attributes.position.needsUpdate = true; ps.geometry.attributes.color.needsUpdate = true;
}
function wave(p, t, amt = 1) { p.userData.arms[1].rotation.z = -(2.6 + Math.sin(t * 8) * 0.35) * amt - 0.12 * (1 - amt); }

function renderAt(t) {
  tNow = t;
  const L = light(t);
  scene.background = L.sky; scene.fog.color.copy(L.sky);
  scene.fog.near = 90; scene.fog.far = 420;
  hemi.intensity = L.hemi; sun.intensity = L.sun; sun.color.copy(L.sunC); renderer.toneMappingExposure = L.exp;

  // --- A: province
  fire.scale.set(1 + Math.sin(t * 17) * 0.12, 1 + Math.sin(t * 23) * 0.2, 1); fireLight.intensity = 25 + Math.sin(t * 19) * 6;
  momA.userData.arms[1].rotation.x = -0.9 + Math.sin(t * 3) * 0.4; momA.userData.arms[1].rotation.z = -0.3;
  kidA.position.y = Math.abs(Math.sin(t * 2.2)) * 0.12; kidA.userData.head.rotation.y = 0;
  steam(steamA, t, [V(-1, 1.6, 5)], 160);
  steam(steamB, t, stallPots.map(p => p.getWorldPosition(new THREE.Vector3()).add(V(0, 0.3, 0))), 260);
  momB.userData.arms[0].rotation.x = -1.2 + Math.sin(t * 4) * 0.3; momB.userData.arms[1].rotation.x = -1.0 + Math.cos(t * 3.5) * 0.3;
  const kw = clamp((t - 14) / 7); kidB.position.x = 5.5 + kw * 8; kidB.position.z = 6 + kw * 2; kidB.rotation.y = Math.PI / 2 - 0.4;
  kidB.position.y = Math.abs(Math.sin(t * 7)) * 0.12 * (kw > 0 && kw < 1 ? 1 : 0);
  if (t > 13 && t < 16) { kidB.rotation.y = -0.6; wave(kidB, t); } else kidB.userData.arms[1].rotation.z = -0.12;
  if (t > 13.3 && t < 17) wave(momB, t); else momB.userData.arms[1].rotation.z = -0.12;

  // --- B: school
  grads.forEach((g, i) => {
    const toss = clamp((t - 30 - i * 0.04) / 3.2);
    const cap = g.userData.gcap;
    if (toss > 0) { cap.position.y = 2.85 + Math.sin(toss * Math.PI) * 9; cap.rotation.x = toss * 9 + i; cap.rotation.z = toss * 5; } else { cap.position.y = 2.85; cap.rotation.set(0, 0, 0); }
    g.userData.arms.forEach(a => a.rotation.z = (t > 29.7 && t < 33.5) ? (a.position.x > 0 ? -2.7 : 2.7) : (a.position.x > 0 ? -0.12 : 0.12));
    g.position.y = 1.2 + (t > 30 && t < 33 ? Math.abs(Math.sin(t * 6 + i)) * 0.3 : 0);
  });
  hero.userData.head.rotation.y = 0;
  audience.forEach((a, i) => { a.position.y = (t > 30 ? Math.abs(Math.sin(t * 7 + i)) * 0.15 : 0); a.userData.arms.forEach(ar => ar.rotation.z = t > 30 ? (ar.position.x > 0 ? -2.4 : 2.4) + Math.sin(t * 10 + i) * 0.3 : (ar.position.x > 0 ? -0.12 : 0.12)); });
  confetti(confettiS, t, 30.2, V(SX, 4, -4), 500, 16);

  // --- C: restaurant build
  const bk = clamp((t - 34.5) / 9.5);
  bricks.forEach(b => { const at = 34.5 + (b.userData.i / NB) * 9.5; dropIn(b, at, 0.45); });
  const k1 = clamp((t - 44.2) / 0.6); roofR.visible = parapet.visible = k1 > 0; roofR.position.y = 0.5 + ROWS * BH + 0.4 + (1 - k1) * 5; parapet.position.y = roofR.position.y + 1;
  const k2 = clamp((t - 45) / 1); windows.forEach(w => w.visible = k2 > 0); doorR.visible = k2 > 0; awn.visible = t > 45.4; awn.scale.y = clamp((t - 45.4) / 0.6) + 0.001;
  const k3 = clamp((t - 46.2) / 0.8); signR.visible = sinceSign.visible = k3 > 0; signR.scale.setScalar(Math.max(0.001, ease(k3)));
  jib.rotation.y = Math.sin(t * 0.5) * 0.9; crane.visible = t < 48; hookLoad.visible = t < 46;
  workers.forEach((w, i) => { w.visible = t < 48; w.userData.arms[1].rotation.x = -1.5 + Math.sin(t * 6 + i) * 0.6; w.position.y = 0.5 + Math.abs(Math.sin(t * 3 + i)) * 0.05; });
  ownerC.visible = t < 48; blueprint.visible = t < 48;
  const open = t > 48;
  balloons.forEach((b, i) => { b.visible = open; b.position.y = b.userData.p.y + Math.sin(t * 1.5 + i) * 0.15; b.position.x = b.userData.p.x + Math.sin(t + i) * 0.1; });
  queue.forEach((q, i) => { q.visible = open; q.position.y = Math.abs(Math.sin(t * 2.5 + i)) * 0.08; if (t > 54.5) { q.position.x = lerp(4 + i * 1.6, 3 + i * 1.6 - 3, clamp((t - 54.5) / 6)); } else q.position.x = 4 + i * 1.6; });
  momC.visible = kidC.visible = open;
  const cut = 53.2; ribbon.visible = open && t < cut; ribbon.scale.x = 1;
  ribbonPosts.forEach(p => p.visible = open);
  if (open && t < cut) { momC.userData.arms[1].rotation.z = -1.2; momC.userData.arms[1].rotation.x = -0.6; }
  else if (open) { wave(momC, t, 1); }
  kidC.userData.arms[0].rotation.z = t > cut ? 2.6 + Math.sin(t * 8) * 0.3 : 0.12;
  momC.position.y = 0.5 + (t > cut && t < cut + 3 ? Math.abs(Math.sin(t * 6)) * 0.3 : 0);
  confetti(confettiR, t, cut, V(RX, 6, Lz / 2 + 2), 700, 14);
  windows.forEach(w => w.material.emissiveIntensity = open ? 0.9 : 0.15);
  lightsR.forEach((b, i) => b.material.emissiveIntensity = open ? (((Math.floor(t * 3) + i) % 3 === 0) ? 3 : 1.2) : 0);

  // --- D: home
  hParts.forEach(p => dropIn(p, p.userData.at, 0.6));
  doorGlow.visible = t > 73.3;
  flowers.forEach(f => { const k = clamp((t - f.userData.at) / 0.6); f.scale.setScalar(Math.max(0.001, ease(k))); f.visible = k > 0; });
  gatePivot.rotation.y = -smooth(68.8, 69.8, t) * 1.6;
  hDoorPivot.rotation.y = smooth(72.8, 73.8, t) * 1.5;
  const walkU = smooth(69.4, 73.4, t);
  const pz = lerp(28, 13.5, walkU);
  momD.position.set(HX + 3.3 - HX, 4.6, pz); kidD.position.set(4.9, 4.6, pz + 0.3);
  momD.position.x = 3.3;
  [momD, kidD].forEach((p, i) => { p.rotation.y = t < 76 ? Math.PI : 0; p.position.y = 4.6 + (walkU > 0 && walkU < 1 ? Math.abs(Math.sin(t * 7 + i)) * 0.1 : 0); });
  // hug + face the fireworks
  if (t >= 76) { momD.position.set(3.4, 4.6, 16); kidD.position.set(4.6, 4.6, 16); momD.rotation.y = kidD.rotation.y = Math.PI; momD.userData.arms[1].rotation.z = -1.0; kidD.userData.arms[0].rotation.z = 1.0; }
  else if (t > 73.6) { wave(momD, t, 0.6); momD.userData.arms[0].rotation.x = -0.6; } else { momD.userData.arms[1].rotation.z = -0.12; kidD.userData.arms[0].rotation.z = 0.12; }
  if (t < 70) { momD.visible = kidD.visible = t > 68; } else { momD.visible = kidD.visible = true; }
  porch.intensity = 70 * smooth(75, 78, t);
  homeWins.forEach(w => w.material.emissiveIntensity = lerp(0.15, 2.2, smooth(75, 78, t)));
  // fireworks
  const fpa = fireworks.geometry.attributes.position.array, fca = fireworks.geometry.attributes.color.array;
  fwData.forEach((f, k) => {
    const dt = t - f.t0;
    for (let i = 0; i < FW_P; i++) {
      const j = (k * FW_P + i) * 3;
      if (dt < 0 || dt > 2.6) { fpa[j + 1] = -500; continue; }
      const d = f.dirs[i]; const sp = 1 - Math.exp(-dt * 2.2);
      fpa[j] = f.center.x + d.x * sp * 1.4; fpa[j + 1] = f.center.y + d.y * sp * 1.4 - dt * dt * 1.2; fpa[j + 2] = f.center.z + d.z * sp * 1.4;
      const b = Math.max(0, 1 - dt / 2.6) * (0.75 + 0.25 * Math.sin(dt * 30 + i));
      fca[j] = f.c.r * b; fca[j + 1] = f.c.g * b; fca[j + 2] = f.c.b * b;
    }
  });
  fireworks.geometry.attributes.position.needsUpdate = true; fireworks.geometry.attributes.color.needsUpdate = true;
  lanterns.forEach((l, i) => { const d = t - l.userData.t0; l.visible = d > 0; l.position.set(l.userData.x + Math.sin(t * 0.7 + i) * 1.2, 5 + d * l.userData.s, l.userData.z); l.material.emissiveIntensity = 2 + Math.sin(t * 5 + i) * 0.4; });

  // camera
  const c = camAt(t); camera.position.copy(c.pos); camera.position.y += Math.sin(t * 0.9) * 0.08; camera.lookAt(c.tgt);
  sun.position.set(c.tgt.x - 60, 90, c.tgt.z + 70); sun.target.position.copy(c.tgt);
  if (t < 10) sun.position.set(c.tgt.x - 120, 25, c.tgt.z + 40);

  renderer.render(scene, camera);
  composite(t);
}

// =========================================================
// 2D OVERLAY
// =========================================================
const chapters = [
  [0, 'PROLOGUE', '2006'], [10, 'CHAPTER 1 · HER SACRIFICE', '2008'], [22, 'CHAPTER 2 · YOUR PROMISE', '2018'],
  [34, 'CHAPTER 3 · THE BUILD', '2023'], [48, 'CHAPTER 4 · OPENING DAY', '2024'], [62, 'CHAPTER 5 · HOME', '2025'], [76, 'EPILOGUE · SALAMAT, MA', '2026'],
];
const captions = [
  { t0: 0.6, t1: 9.6, title: true, big: 'WHAT IF YOU MADE YOUR', big2: "MOM'S DREAM COME TRUE?", small: 'A 3D story for every child who remembers' },
  { t0: 10.4, t1: 21.6, big: 'SHE CARRIED THE DREAM FIRST', small: 'Before sunrise she was already cooking. A small carinderia by the road, so you could go to school.' },
  { t0: 22.4, t1: 33.6, big: 'YOU NEVER FORGOT', small: 'Every 4 AM, every tired smile, every "kumain ka na?" You carried it all the way to graduation day.' },
  { t0: 34.4, t1: 47.6, big: 'BUILDING IT, BRICK BY BRICK', small: 'You saved, planned and worked late nights. Slowly, her dream started to rise.' },
  { t0: 48.4, t1: 61.6, big: 'GRAND OPENING DAY', small: 'Her little carinderia is now a real restaurant, with her name on the sign and a line out the door.' },
  { t0: 62.4, t1: 75.6, big: 'A HOME SHE NEVER HAS TO WORRY ABOUT', small: 'A house on the hill, a garden for her plants, and a front door that is finally hers.' },
  { t0: 76.4, t1: 86.4, big: 'SALAMAT, MA.', small: 'Your dream was always ours. Now it is real.', end: true },
];
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrap(text, maxW) { const ws = text.split(' '); const lines = []; let l = ''; for (const w of ws) { const tt = l ? l + ' ' + w : w; if (ctx.measureText(tt).width > maxW && l) { lines.push(l); l = w; } else l = tt; } if (l) lines.push(l); return lines; }
function heart(x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * 0.3); ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3); ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s); ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3); ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3); ctx.fill(); }
const SANS = '"DejaVu Sans", sans-serif', SERIF = '"DejaVu Serif", serif';

function composite(t) {
  ctx.globalAlpha = 1; ctx.drawImage(renderer.domElement, 0, 0);
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.38)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // warm memory tint for flashback chapters
  const memory = 1 - smooth(21, 23, t);
  if (memory > 0) { ctx.fillStyle = `rgba(255,170,90,${0.10 * memory})`; ctx.fillRect(0, 0, W, H); }

  // chapter + year badge
  const hudA = smooth(10.5, 11.5, t) * (1 - smooth(86, 87, t));
  if (hudA > 0) {
    let ch = chapters[0]; for (const c of chapters) if (t >= c[0]) ch = c;
    ctx.globalAlpha = hudA;
    ctx.font = `bold 18px ${SANS}`; const lw = ctx.measureText(ch[1]).width + 40;
    ctx.fillStyle = 'rgba(40,12,20,0.55)'; roundRect(28, 26, lw, 40, 12); ctx.fill();
    ctx.fillStyle = '#ffe08a'; ctx.fillText(ch[1], 48, 53);
    ctx.fillStyle = 'rgba(40,12,20,0.55)'; roundRect(W - 28 - 120, 26, 120, 40, 12); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.font = `bold 22px ${SANS}`; ctx.fillText(ch[2], W - 28 - 60, 55); ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
  for (const c of captions) {
    const a = smooth(c.t0, c.t0 + 0.6, t) * (1 - smooth(c.t1 - 0.6, c.t1, t)); if (a <= 0) continue;
    ctx.globalAlpha = a; const rise = (1 - smooth(c.t0, c.t0 + 0.8, t)) * 16;
    if (c.title) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(30,8,14,0.42)'; ctx.fillRect(0, 56 + rise, W, 230);
      ctx.fillStyle = '#ffd6a5'; ctx.font = `bold 20px ${SANS}`; ctx.fillText('A 3D  " W H A T   I F ? "  S T O R Y', W / 2, 104 + rise);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffffff'; ctx.font = `bold 52px ${SERIF}`; ctx.fillText(c.big, W / 2, 166 + rise);
      ctx.fillStyle = '#ffe08a'; ctx.fillText(c.big2, W / 2, 228 + rise); ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff1e6'; ctx.font = `italic 20px ${SERIF}`; ctx.fillText(c.small, W / 2, 268 + rise); ctx.textAlign = 'left';
    } else {
      ctx.font = `22px ${SANS}`; const lines = wrap(c.small, 900);
      const bh = 70 + lines.length * 30, by = H - 40 - bh + rise, bx = 60;
      ctx.fillStyle = 'rgba(40,12,20,0.62)'; roundRect(bx, by, 980, bh, 18); ctx.fill();
      ctx.fillStyle = c.end ? '#ff70a6' : '#ffbe0b'; roundRect(bx, by, 8, bh, 4); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = `bold 30px ${SERIF}`; ctx.fillText(c.big, bx + 34, by + 46);
      ctx.fillStyle = '#fbe9dc'; ctx.font = `22px ${SANS}`; lines.forEach((l, i) => ctx.fillText(l, bx + 34, by + 84 + i * 30));
    }
    ctx.globalAlpha = 1;
  }
  const endA = smooth(86.6, 87.6, t);
  if (endA > 0) {
    ctx.globalAlpha = endA * 0.82; ctx.fillStyle = '#14060c'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = endA; ctx.fillStyle = '#ff70a6'; heart(W / 2, H / 2 - 120, 56);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffe08a'; ctx.font = `bold 48px ${SERIF}`; ctx.fillText('Make her dream come true.', W / 2, H / 2 + 12);
    ctx.fillStyle = '#fbe9dc'; ctx.font = `italic 24px ${SERIF}`; ctx.fillText('Her sacrifice. Your promise. Her dream, finally real.', W / 2, H / 2 + 58);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
  let fade = 1 - smooth(0, 0.8, t);
  for (const s of shots) if (s.t0 > 0) fade = Math.max(fade, 1 - smooth(0, 0.45, Math.abs(t - s.t0)));
  fade = Math.max(fade, smooth(89.3, 90, t));
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
}

window.frameJPEG = (t, q = 0.9) => { renderAt(t); return out.toDataURL('image/jpeg', q); };
window.ready = true;
