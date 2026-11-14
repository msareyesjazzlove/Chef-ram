import * as THREE from 'three';

const W = 1280, H = 720;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = rng(4242);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
const out = document.createElement('canvas'); out.width = W; out.height = H; const ctx = out.getContext('2d');

const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x9fc8e8, 90, 380);
const camera = new THREE.PerspectiveCamera(42, W / H, 0.2, 1200);
const hemi = new THREE.HemisphereLight(0xdcecff, 0x6a6a5a, 0.9); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d0, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 1, far: 300 }); sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);

const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
const glow = (color, i = 1.5) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: i, roughness: 0.5 });
function mesh(geo, m, cast = true, recv = true) { const o = new THREE.Mesh(geo, m); o.castShadow = cast; o.receiveShadow = recv; return o; }
const box = (w, h, d, m) => mesh(new THREE.BoxGeometry(w, h, d), m);
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const DOT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const GOLD = 0xffc04d;

// ---------- characters ----------
function person({ shirt = 0x3a86ff, hair = 0x1a1110, skin = 0xc68b59, bun = false, apron = false, pants = 0x2b2d42, scale = 1, umbrella = null } = {}) {
  const g = new THREE.Group();
  const legs = mesh(new THREE.CapsuleGeometry(0.36, 0.7, 4, 8), M(pants)); legs.position.y = 0.7; g.add(legs);
  const body = mesh(new THREE.CapsuleGeometry(0.46, 0.8, 4, 10), M(shirt)); body.position.y = 1.55; g.add(body);
  if (apron) { const a = box(0.75, 1.0, 0.06, M(0xffffff)); a.position.set(0, 1.3, 0.45); g.add(a); }
  const arms = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(0.55 * s, 2.0, 0);
    const a = mesh(new THREE.CapsuleGeometry(0.14, 0.75, 4, 6), M(shirt)); a.position.y = -0.5; p.add(a);
    const h = mesh(new THREE.SphereGeometry(0.15, 8, 6), M(skin)); h.position.y = -0.98; p.add(h);
    p.rotation.z = 0.12 * s; g.add(p); arms.push(p);
  }
  const head = new THREE.Group(); head.position.y = 2.55; g.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.42, 16, 12), M(skin)));
  const hm = M(hair);
  const cap = mesh(new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hm); cap.position.y = 0.05; cap.rotation.x = -0.25; head.add(cap);
  if (bun) { const b = mesh(new THREE.SphereGeometry(0.22, 10, 8), hm); b.position.set(0, 0.3, -0.38); head.add(b); }
  for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(0.05, 6, 6), M(0x111111)); e.position.set(0.15 * s, 0.05, 0.38); head.add(e); }
  const mouth = mesh(new THREE.TorusGeometry(0.1, 0.025, 4, 10, Math.PI), M(0x7a2a2a)); mouth.position.set(0, -0.12, 0.39); mouth.rotation.z = Math.PI; head.add(mouth);
  if (umbrella) {
    const u = new THREE.Group(); u.position.set(0.55, 2.0, 0.3);
    const stick = box(0.06, 2.4, 0.06, M(0x333333)); stick.position.y = 0.6; u.add(stick);
    const top = mesh(new THREE.ConeGeometry(1.5, 0.7, 10, 1, true), M(umbrella, { side: THREE.DoubleSide })); top.position.y = 1.9; u.add(top);
    g.add(u); arms[1].rotation.x = -0.6;
  }
  g.scale.setScalar(scale);
  g.userData = { arms, head, legs, body, mouth };
  return g;
}
function sit(p) { p.userData.legs.rotation.x = Math.PI / 2; p.userData.legs.position.set(0, 0.95, 0.45); p.position.y = 0.0; }

// ---------- memory threads ----------
const threads = [];
function thread(a, b, lift, grow0, grow1, fade0, color = GOLD) {
  const mid = a.clone().lerp(b, 0.5); mid.y += lift;
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const SEG = 64, RAD = 6;
  const geo = new THREE.TubeGeometry(curve, SEG, 0.06, RAD, false);
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const o = new THREE.Mesh(geo, m); o.frustumCulled = false; scene.add(o);
  const th = { o, geo, m, grow0, grow1, fade0, SEG, RAD, curve, burst: false }; threads.push(th); return th;
}
// dust bursts
const DUST_N = 3000; const dust = new THREE.BufferGeometry();
dust.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST_N * 3), 3));
dust.setAttribute('color', new THREE.BufferAttribute(new Float32Array(DUST_N * 3), 3));
const dustPts = new THREE.Points(dust, new THREE.PointsMaterial({ size: 0.35, map: DOT, transparent: true, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending, fog: false }));
dustPts.frustumCulled = false; scene.add(dustPts);
const bursts = []; // {pts:[Vector3], t0, color, dirs}
function addBurst(points, t0, color = GOLD, n = 3) {
  const dirs = []; const r = rng(Math.floor(t0 * 1000) + points.length);
  for (let i = 0; i < points.length * n; i++) dirs.push(V((r() - 0.5) * 1.5, 0.6 + r() * 1.4, (r() - 0.5) * 1.5));
  bursts.push({ points, t0, c: new THREE.Color(color), dirs, n });
}

// =========================================================
// A — STREET (x = 0)
// =========================================================
const street = new THREE.Group(); scene.add(street);
street.add(mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), M(0x6aa84f)));
const roadA = mesh(new THREE.PlaneGeometry(400, 10).rotateX(-Math.PI / 2), M(0x55555a)); roadA.position.set(0, 0.03, 14); street.add(roadA);
const walkA = mesh(new THREE.PlaneGeometry(400, 5).rotateX(-Math.PI / 2), M(0xcfc6b8)); walkA.position.set(0, 0.05, 7); street.add(walkA);
const houseCols = [0xf2cc8f, 0x81b29a, 0xe07a5f, 0xf4f1de, 0x9ecae1, 0xf6bd60, 0xcdb4db];
const winMats = [];
const houseAnchors = [];
function house(x, z, col, rotY = 0, w = 8) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY;
  const b = box(w, 6, 7, M(col)); b.position.y = 3; g.add(b);
  const sh = new THREE.Shape(); sh.moveTo(-w / 2 - 0.5, 0); sh.lineTo(w / 2 + 0.5, 0); sh.lineTo(0, 3); sh.closePath();
  const roof = mesh(new THREE.ExtrudeGeometry(sh, { depth: 7.6, bevelEnabled: false }), M(0x8d3b2f, { flatShading: true })); roof.position.set(0, 6, -3.8); g.add(roof);
  const wm = glow(0xffd28a, 0.1); winMats.push(wm);
  for (const wx of [-w / 4, w / 4]) { const wn = box(1.6, 1.4, 0.15, wm); wn.position.set(wx, 4.2, 3.55); g.add(wn); }
  const dr = box(1.4, 2.4, 0.15, M(0x5c3317)); dr.position.set(0, 1.2, 3.55); g.add(dr);
  street.add(g);
  houseAnchors.push(new THREE.Vector3(0, 4.2, 3.6).applyMatrix4(new THREE.Matrix4().makeRotationY(rotY)).add(V(x, 0, z)));
  return g;
}
for (let i = -5; i <= 5; i++) house(i * 11, 0, houseCols[(i + 7) % houseCols.length]);
for (let i = -5; i <= 5; i++) house(i * 11 + 5, 28, houseCols[(i + 10) % houseCols.length], Math.PI);
for (let i = 0; i < 12; i++) { const tr = new THREE.Group(); const tk = mesh(new THREE.CylinderGeometry(0.25, 0.3, 3, 6), M(0x6b4b2a)); tk.position.y = 1.5; tr.add(tk); const cr = mesh(new THREE.IcosahedronGeometry(1.8, 0), M(0x3f8f3a, { flatShading: true })); cr.position.y = 3.8; tr.add(cr); tr.position.set(-58 + i * 10.5, 0, 9.7); street.add(tr); }
const stringBulbs = [];
for (let i = 0; i < 60; i++) { const u = i / 59; const b = mesh(new THREE.SphereGeometry(0.16, 6, 4), glow([0xffd23f, 0xff70a6, 0x2ec4b6, 0xffffff][i % 4], 0), false, false); b.position.set(-30 + u * 60, 7.2 - Math.abs(Math.sin(u * Math.PI * 6)) * 0.8, 9.6); street.add(b); stringBulbs.push(b); }
// her + family + neighbours
const her = person({ shirt: 0xf4a261, bun: true, pants: 0x264653 }); scene.add(her);
const heartM = glow(GOLD, 0); const heart = mesh(new THREE.SphereGeometry(0.2, 12, 10), heartM, false, false); heart.position.set(0, 1.75, 0.42); her.add(heart);
const heartLight = new THREE.PointLight(GOLD, 0, 14, 1.6); heartLight.position.set(0, 1.8, 0.9); her.add(heartLight);
const herChest = () => heart.getWorldPosition(new THREE.Vector3());
const fam = { dad: person({ shirt: 0x457b9d }), kid: person({ shirt: 0xe63946, scale: 0.6 }), lola: person({ shirt: 0x9d4edd, hair: 0xd9d9d9, bun: true }) };
const neighbours = [];
for (let i = 0; i < 6; i++) { const n = person({ shirt: [0x2a9d8f, 0xe9c46a, 0x8338ec, 0xe76f51, 0x3a86ff, 0x6d6875][i], bun: i % 2 === 0 }); n.position.set(-20 + i * 8 + (i > 2 ? 4 : 0), 0, 8 + (i % 2) * 2); n.rotation.y = R() * 6; street.add(n); neighbours.push(n); }

// threads in the opening: her -> family, houses, neighbours (grow 1..6, snap 7.5..9.8)
const HERA = V(0, 0, 7.6);
const openThreads = [];
// =========================================================
// B — ROOM CUTAWAY (x = 150)
// =========================================================
const RX = 150;
const room = new THREE.Group(); room.position.x = RX; scene.add(room);
room.add(mesh(new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2), M(0x3a3a3a)));
const floor = box(18, 0.3, 12, M(0xb08968)); floor.position.y = 0.15; room.add(floor);
const back = box(18, 8, 0.4, M(0xf1e3d3)); back.position.set(0, 4, -6); room.add(back);
const lwall = box(0.4, 8, 12, M(0xe9d8c4)); lwall.position.set(-9, 4, 0); room.add(lwall);
const rwall = box(0.4, 8, 12, M(0xe9d8c4)); rwall.position.set(9, 4, 0); room.add(rwall);
const rDoor = box(0.2, 4, 2.2, M(0x5c3317)); rDoor.position.set(8.75, 2.3, 2); room.add(rDoor);
const table = new THREE.Group(); table.position.set(-1, 0.3, -1); room.add(table);
const ttop = box(6, 0.25, 3, M(0x7f5539)); ttop.position.y = 1.9; table.add(ttop);
for (const [x, z] of [[-2.7, -1.2], [2.7, -1.2], [-2.7, 1.2], [2.7, 1.2]]) { const l = box(0.2, 1.9, 0.2, M(0x7f5539)); l.position.set(x, 0.95, z); table.add(l); }
[[-1.5, 0], [0, 0.3], [1.5, 0]].forEach(([x, z], i) => { const pl = mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.1, 14), M(0xffffff)); pl.position.set(x, 2.08, z); table.add(pl); });
const rice = mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.5, 14), M(0xd4a373)); rice.position.set(0, 2.3, -0.6); table.add(rice);
const lamp = new THREE.PointLight(0xffd29a, 60, 30, 1.5); lamp.position.set(0, 7, 0); room.add(lamp);
const lampShade = mesh(new THREE.ConeGeometry(0.9, 0.7, 16, 1, true), glow(0xffe0a8, 0.8), false, false); lampShade.position.set(-1, 7, -1); room.add(lampShade);
// photo frames: portrait of her vs blank
function portraitTex(blank) {
  return canvasTex(256, 320, (x, w, h) => {
    x.fillStyle = blank ? '#d9d4cc' : '#bde0fe'; x.fillRect(0, 0, w, h);
    if (!blank) {
      x.fillStyle = '#f4a261'; x.beginPath(); x.ellipse(128, 300, 95, 110, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#c68b59'; x.beginPath(); x.arc(128, 140, 62, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#1a1110'; x.beginPath(); x.arc(128, 128, 66, Math.PI, 0); x.fill(); x.beginPath(); x.arc(128, 66, 26, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#111'; x.beginPath(); x.arc(106, 145, 6, 0, 7); x.arc(150, 145, 6, 0, 7); x.fill();
      x.strokeStyle = '#7a2a2a'; x.lineWidth = 5; x.beginPath(); x.arc(128, 160, 18, 0.2, Math.PI - 0.2); x.stroke();
    } else { x.fillStyle = 'rgba(0,0,0,0.12)'; x.font = 'bold 140px "DejaVu Sans"'; x.textAlign = 'center'; x.fillText('?', 128, 210); }
  });
}
const P_FULL = portraitTex(false), P_BLANK = portraitTex(true);
const frames = [];
[[-5.5, 5.2, 1.0], [-2.5, 5.6, 1.2], [1.2, 5.2, 0.9], [4.6, 5.5, 1.1], [6.8, 3.6, 0.8]].forEach(([x, y, s], i) => {
  const f = box(2.2 * s, 2.7 * s, 0.12, M(0x5c3317)); f.position.set(x, y, -5.75); room.add(f);
  const blank = new THREE.Mesh(new THREE.PlaneGeometry(1.9 * s, 2.4 * s), new THREE.MeshStandardMaterial({ map: P_BLANK })); blank.position.set(x, y, -5.68); room.add(blank);
  const full = new THREE.Mesh(new THREE.PlaneGeometry(1.9 * s, 2.4 * s), new THREE.MeshStandardMaterial({ map: P_FULL, transparent: true })); full.position.set(x, y, -5.66); room.add(full);
  frames.push({ full, t: 13.2 + i * 0.7, pos: V(RX + x, y, -5.6) });
});
const rDad = person({ shirt: 0x457b9d }), rKid = person({ shirt: 0xe63946, scale: 0.6 }), rLola = person({ shirt: 0x9d4edd, hair: 0xd9d9d9, bun: true });
[[rDad, -3.4, -1, Math.PI / 2], [rLola, 1.4, -2.9, 0], [rKid, -1.2, 1.2, Math.PI]].forEach(([p, x, z, ry]) => { sit(p); p.position.set(x, 0.3, z); p.rotation.y = ry; room.add(p); });
rKid.position.y = 0.9;
rKid.userData.legs.position.set(0, 0.95, 0.45);

// =========================================================
// C — RESTAURANT (x = 300)
// =========================================================
const KX = 300;
const rest = new THREE.Group(); rest.position.x = KX; scene.add(rest);
rest.add(mesh(new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2), M(0x6aa84f)));
const rRoad = mesh(new THREE.PlaneGeometry(300, 12).rotateX(-Math.PI / 2), M(0x4a4a50)); rRoad.position.set(0, 0.03, 20); rest.add(rRoad);
const rWalk = mesh(new THREE.PlaneGeometry(300, 7).rotateX(-Math.PI / 2), M(0xcfc6b8)); rWalk.position.set(0, 0.05, 10.5); rest.add(rWalk);
const rB = box(26, 9, 13, M(0xf4ead8)); rB.position.set(0, 4.5, 0); rest.add(rB);
const rRoof = box(28, 0.8, 15, M(0x7a1f2b)); rRoof.position.y = 9.4; rest.add(rRoof);
for (const x of [-7.5, 7.5]) { const w = box(8, 4, 0.2, glow(0xffd9a0, 0.7)); w.position.set(x, 3.2, 6.55); rest.add(w); }
const rdoor = box(3.6, 4.4, 0.2, M(0x5c3317)); rdoor.position.set(0, 2.2, 6.55); rest.add(rdoor);
const awn = new THREE.Group(); awn.position.set(0, 6.2, 7.6); rest.add(awn);
for (let i = 0; i < 13; i++) { const s = box(2, 0.15, 2.4, M(i % 2 ? 0xffffff : 0xb3261e)); s.position.x = -12 + i * 2; s.rotation.x = 0.35; awn.add(s); }
function signTex(name) {
  return canvasTex(1600, 260, (x, w, h) => {
    x.fillStyle = '#7a1f2b'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ffe08a'; x.lineWidth = 10; x.strokeRect(14, 14, w - 28, h - 28);
    x.fillStyle = '#ffe08a'; x.font = 'bold 150px "DejaVu Serif", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, w / 2, h / 2 + 6);
  });
}
const signFull = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.6), new THREE.MeshStandardMaterial({ map: signTex("ROSA'S KITCHEN"), transparent: true }));
const signBlank = new THREE.Mesh(new THREE.PlaneGeometry(16, 2.6), new THREE.MeshStandardMaterial({ map: signTex('KITCHEN') }));
signBlank.position.set(0, 8.0, 6.62); signFull.position.set(0, 8.0, 6.66); rest.add(signBlank, signFull);
const staff = [person({ shirt: 0xffffff, apron: true, pants: 0x111111 }), person({ shirt: 0xffffff, apron: true, bun: true, pants: 0x111111 }), person({ shirt: 0x222222, pants: 0x111111 })];
staff.forEach((s, i) => { s.position.set(-2.5 + i * 2.5, 0, 8.4); rest.add(s); });
const diners = [];
for (let i = 0; i < 5; i++) { const d = person({ shirt: [0xe76f51, 0x2a9d8f, 0xe9c46a, 0x264653, 0x8338ec][i], bun: i % 2 === 1 }); d.position.set(6 + i * 1.8, 0, 10 + (i % 2)); d.rotation.y = -Math.PI / 2; rest.add(d); diners.push(d); }

// =========================================================
// D — PLAZA (x = 500)
// =========================================================
const PX = 500;
const plaza = new THREE.Group(); plaza.position.x = PX; scene.add(plaza);
plaza.add(mesh(new THREE.PlaneGeometry(300, 300).rotateX(-Math.PI / 2), M(0x5f8f4a)));
const tiles = mesh(new THREE.CylinderGeometry(34, 34, 0.2, 64), M(0xb9b2a5)); tiles.position.y = 0.1; plaza.add(tiles);
const ring = mesh(new THREE.TorusGeometry(5, 0.5, 8, 40), M(0xd8d2c4)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.8; plaza.add(ring);
const water = mesh(new THREE.CylinderGeometry(5, 5, 0.3, 40), M(0x4d96c9, { roughness: 0.15, metalness: 0.2 })); water.position.y = 0.6; plaza.add(water);
const spout = mesh(new THREE.CylinderGeometry(0.5, 0.8, 3.5, 12), M(0xd8d2c4)); spout.position.y = 1.9; plaza.add(spout);
const spray = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(400 * 3), 3)), new THREE.PointsMaterial({ size: 0.25, map: DOT, transparent: true, depthWrite: false, color: 0xcfe8ff, opacity: 0.8 }));
spray.frustumCulled = false; plaza.add(spray);
for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const tr = new THREE.Group(); const tk = mesh(new THREE.CylinderGeometry(0.3, 0.35, 3.5, 6), M(0x6b4b2a)); tk.position.y = 1.75; tr.add(tk); const cr = mesh(new THREE.IcosahedronGeometry(2.3, 0), M(0x3f8f3a, { flatShading: true })); cr.position.y = 4.4; tr.add(cr); tr.position.set(Math.cos(a) * 36, 0, Math.sin(a) * 36); plaza.add(tr); }
for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.3; const b = box(10, 6 + R() * 18, 10, M([0xd6ccc2, 0xbfb8ad, 0xa8a29e, 0xe3d5ca][i % 4])); b.position.set(Math.cos(a) * 60, b.geometry.parameters.height / 2, Math.sin(a) * 60); plaza.add(b); }
// bench + lamp
const bench = new THREE.Group(); bench.position.set(14, 0, 8); bench.rotation.y = -Math.PI / 2 + 0.5; plaza.add(bench);
const seat = box(4, 0.2, 1.2, M(0x8b5a2b)); seat.position.y = 1.0; bench.add(seat);
const bb = box(4, 1.0, 0.15, M(0x8b5a2b)); bb.position.set(0, 1.7, -0.55); bench.add(bb);
for (const x of [-1.7, 1.7]) { const l = box(0.15, 1.0, 1.0, M(0x333333)); l.position.set(x, 0.5, 0); bench.add(l); }
const lampPost = mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 8), M(0x222222)); lampPost.position.set(16.5, 3.5, 6.5); plaza.add(lampPost);
const lampHead = mesh(new THREE.SphereGeometry(0.5, 12, 10), glow(0xfff0c8, 0)); lampHead.position.set(16.5, 7.2, 6.5); plaza.add(lampHead);
const lampL = new THREE.SpotLight(0xffe0a8, 0, 30, 0.8, 0.6, 1.2); lampL.position.set(PX + 16.5, 7, 6.5); lampL.target.position.set(PX + 14, 0, 8); scene.add(lampL, lampL.target);
// crowd
const crowd = [];
const umbCols = [0x1d3557, 0xe63946, 0x2a9d8f, 0x6d6875, 0xffb703, 0x264653];
for (let i = 0; i < 46; i++) {
  const p = person({ shirt: [0x6c757d, 0x495057, 0x8d99ae, 0x2b2d42, 0xadb5bd, 0x5e548e][i % 6], bun: i % 3 === 0, umbrella: i % 2 ? umbCols[i % 6] : null });
  p.userData.r = 8 + R() * 22; p.userData.a = R() * 6.28; p.userData.sp = (R() < 0.5 ? -1 : 1) * (0.05 + R() * 0.07); plaza.add(p); crowd.push(p);
}
// community table
const ctable = new THREE.Group(); ctable.position.set(-12, 0, 6); plaza.add(ctable);
const ct = box(9, 0.25, 2.2, M(0x8b5a2b)); ct.position.y = 1.9; ctable.add(ct);
for (const [x, z] of [[-4.2, -0.9], [4.2, -0.9], [-4.2, 0.9], [4.2, 0.9]]) { const l = box(0.2, 1.9, 0.2, M(0x6b4b2a)); l.position.set(x, 0.95, z); ctable.add(l); }
const cloth = box(9.2, 0.6, 2.3, M(0xe63946)); cloth.position.y = 1.7; ctable.add(cloth);
const cpots = [];
for (let i = 0; i < 3; i++) { const p = mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.55, 14), M(0x9a9a9a, { metalness: 0.6, roughness: 0.3 })); p.position.set(-2.5 + i * 2.5, 2.3, -0.3); ctable.add(p); cpots.push(p); }
const steam = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(240 * 3), 3)), new THREE.PointsMaterial({ size: 0.7, map: DOT, transparent: true, depthWrite: false, color: 0xffffff, opacity: 0.5 }));
steam.frustumCulled = false; scene.add(steam);
const guests = [];
for (let i = 0; i < 9; i++) { const gp = person({ shirt: [0xe76f51, 0x2a9d8f, 0xe9c46a, 0x8338ec, 0x3a86ff, 0xff70a6, 0x6a994e, 0xbc6c25, 0x577590][i], bun: i % 3 === 1, scale: i === 4 ? 0.6 : 1 }); scene.add(gp); guests.push(gp); const bowl = mesh(new THREE.SphereGeometry(0.3, 10, 6, 0, 6.3, Math.PI / 2, Math.PI / 2), M(0xffffff)); bowl.position.set(0, -1.0, 0.25); bowl.visible = false; gp.userData.arms[0].add(bowl); gp.userData.bowl = bowl; }
const GUEST_T = i => 59.5 + i * 1.25;

// rain
const RAIN_N = 2600; const rainPos = new Float32Array(RAIN_N * 6); const rainSeed = new Float32Array(RAIN_N * 3).map(() => R());
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainM = new THREE.LineBasicMaterial({ color: 0xcfd8e6, transparent: true, opacity: 0 });
const rain = new THREE.LineSegments(rainGeo, rainM); rain.frustumCulled = false; scene.add(rain);
// fireflies / rising sparks in finale
const SPARK_N = 400; const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARK_N * 3), 3));
const sparkM = new THREE.PointsMaterial({ size: 0.4, map: DOT, transparent: true, depthWrite: false, color: GOLD, blending: THREE.AdditiveBlending, opacity: 0, fog: false });
const sparks = new THREE.Points(sparkGeo, sparkM); sparks.frustumCulled = false; scene.add(sparks);
const sparkSeed = Array.from({ length: SPARK_N }, () => [R(), R(), R(), R()]);

// =========================================================
// THREADS SETUP
// =========================================================
// Opening (street): her at HERA
const famHomeX = 0;
fam.dad.position.set(-2.5, 0, 4.6); fam.lola.position.set(2.2, 0, 4.5); fam.kid.position.set(-0.6, 0, 4.9);
[fam.dad, fam.lola, fam.kid].forEach(p => street.add(p));
const chestOf = (p, dy = 1.75) => p.position.clone().add(V(0, dy * p.scale.y, 0));
const openTargets = [chestOf(fam.dad), chestOf(fam.lola), chestOf(fam.kid, 1.75), ...neighbours.map(n => chestOf(n)), ...houseAnchors.slice(0, 11).filter((_, i) => i !== 5)];
openTargets.forEach((b, i) => openThreads.push(thread(V(0, 1.75, 7.6), b, 1.5 + (i % 4) * 1.2, 1.2 + i * 0.22, 2.4 + i * 0.22, 7.6 + (i % 7) * 0.32)));
// Plaza: her at community table -> each guest (positions decided at render time; threads built with fixed positions)
const HER_TABLE = V(PX - 13.25, 0, 4.2);
const guestSpot = i => V(PX - 15.5 + (i % 5) * 1.8, 0, 9.2 + Math.floor(i / 5) * 2.6 + (i % 2) * 0.5);
const tableThreads = guests.map((g, i) => thread(V(HER_TABLE.x, 1.75, HER_TABLE.z + 0.4), guestSpot(i).add(V(0, 1.75 * (i === 4 ? 0.6 : 1), 0)), 1.2 + (i % 3) * 0.6, GUEST_T(i) + 0.6, GUEST_T(i) + 1.8, 999));
// Finale (street): her near home, threads to everything
const HER_FIN = V(0, 0, 7.6);
const finTargets = [...houseAnchors, ...neighbours.map(n => chestOf(n))];
const finThreads = finTargets.map((b, i) => thread(V(0, 1.75, 7.6), b, 2 + (i % 5) * 1.3, 74 + i * 0.18, 75.5 + i * 0.18, 999));

// =========================================================
// LIGHTING + SATURATION
// =========================================================
const keys = [
  [0, { sky: 0x9fd0f0, sun: 2.3, hemi: 0.95, sunC: 0xfff1d0, exp: 1.05 }],
  [9.9, { sky: 0x8fb8d8, sun: 1.8, hemi: 0.85, sunC: 0xfff1d0, exp: 1.0 }],
  [10.1, { sky: 0x1a1a1e, sun: 0.0, hemi: 0.35, sunC: 0xffe0b0, exp: 1.1 }],
  [21.9, { sky: 0x1a1a1e, sun: 0.0, hemi: 0.3, sunC: 0xffe0b0, exp: 1.1 }],
  [22.1, { sky: 0x9ec9e6, sun: 2.0, hemi: 0.9, sunC: 0xfff1d0, exp: 1.0 }],
  [33.9, { sky: 0x9fb8cc, sun: 1.6, hemi: 0.85, sunC: 0xfff1d0, exp: 1.0 }],
  [34.1, { sky: 0x7f8a96, sun: 0.5, hemi: 0.75, sunC: 0xdfe8ff, exp: 1.0 }],
  [45.9, { sky: 0x5f6a78, sun: 0.35, hemi: 0.6, sunC: 0xdfe8ff, exp: 1.0 }],
  [46.1, { sky: 0x0b1226, sun: 0.05, hemi: 0.12, sunC: 0x9fb7ff, exp: 1.15 }],
  [57.9, { sky: 0x101a36, sun: 0.05, hemi: 0.14, sunC: 0x9fb7ff, exp: 1.15 }],
  [58.1, { sky: 0xf2a65a, sun: 1.6, hemi: 0.7, sunC: 0xffb070, exp: 1.0 }],
  [71.9, { sky: 0xe3875a, sun: 1.2, hemi: 0.6, sunC: 0xff9a60, exp: 1.0 }],
  [72.1, { sky: 0xd9785a, sun: 1.0, hemi: 0.55, sunC: 0xff8a50, exp: 1.0 }],
  [80, { sky: 0x2b2550, sun: 0.25, hemi: 0.3, sunC: 0xffa070, exp: 1.15 }],
  [90, { sky: 0x141838, sun: 0.15, hemi: 0.25, sunC: 0x9fb7ff, exp: 1.2 }],
];
const cA = new THREE.Color(), cB = new THREE.Color();
function light(t) { let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++; const [ta, a] = keys[i], [tb, b] = keys[i + 1]; const u = smooth(ta, tb, t); const mx = k => lerp(a[k], b[k], u); return { sky: cA.set(a.sky).lerp(cB.set(b.sky), u).clone(), sunC: cA.set(a.sunC).lerp(cB.set(b.sunC), u).clone(), sun: mx('sun'), hemi: mx('hemi'), exp: mx('exp') }; }
function saturation(t) { return 1 - 0.25 * smooth(8, 14, t) - 0.35 * smooth(30, 38, t) + 0.25 * smooth(50, 58, t) + 0.45 * smooth(60, 74, t); }
function memoryPct(t) { if (t < 7.5) return 100; if (t < 10) return Math.round(lerp(100, 0, smooth(7.5, 10, t))); if (t < 59) return 0; return Math.round(lerp(0, 100, smooth(59, 82, t))); }

// =========================================================
// CAMERA
// =========================================================
const shots = [
  { t0: 0, t1: 10, from: [V(22, 26, 48), V(0, 3, 4)], to: [V(7, 5, 20), V(0, 2.8, 6)] },
  { t0: 10, t1: 22, from: [V(RX + 2, 7, 17), V(RX, 3.5, -2)], to: [V(RX + 5, 4.5, 9), V(RX + 1, 3.2, -1.5)] },
  { t0: 22, t1: 34, from: [V(KX + 18, 5, 34), V(KX, 6, 6)], to: [V(KX + 4, 3.4, 17), V(KX, 4.5, 8)] },
  { t0: 34, t1: 46, orbit: { c: V(PX, 2.5, 8), r0: 28, r1: 9, a0: 0.4, a1: 2.0, h0: 16, h1: 3.2 } },
  { t0: 46, t1: 58, from: [V(PX + 3, 4.5, 20), V(PX + 13.6, 2, 8)], to: [V(PX + 10.5, 2.6, 10.6), V(PX + 13.8, 2.0, 8.2)] },
  { t0: 58, t1: 72, from: [V(PX - 4, 7.5, 19), V(PX - 13, 2.4, 6)], to: [V(PX - 8.5, 5.2, 13.5), V(PX - 13, 2.6, 6)] },
  { t0: 72, t1: 90, from: [V(4, 3.2, 14), V(0, 2.2, 6.5)], to: [V(0, 30, 62), V(0, 4, 4)] },
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
const bubbles = [];
function walkBob(p, t, on, k = 0) { p.position.y = (on ? Math.abs(Math.sin(t * 7 + k)) * 0.1 : 0); p.userData.arms[0].rotation.x = on ? Math.sin(t * 7 + k) * 0.5 : 0; p.userData.arms[1].rotation.x = on ? -Math.sin(t * 7 + k) * 0.5 : 0; }
function lookAt(p, target) { const d = target.clone().sub(p.getWorldPosition(new THREE.Vector3())); p.rotation.y = Math.atan2(d.x, d.z); }
function resetPose(p) { p.userData.arms[0].rotation.set(0, 0, 0.12 * -1 * -1); p.userData.arms[1].rotation.set(0, 0, -0.12); p.userData.arms[0].rotation.z = 0.12 * -1; p.userData.arms[0].rotation.z = -0.12; p.userData.arms[0].rotation.z = 0.12; p.userData.arms[1].rotation.z = -0.12; p.userData.head.rotation.set(0, 0, 0); }

function renderAt(t) {
  bubbles.length = 0;
  const L = light(t);
  scene.background = L.sky; scene.fog.color.copy(L.sky); hemi.intensity = L.hemi; sun.intensity = L.sun; sun.color.copy(L.sunC); renderer.toneMappingExposure = L.exp;
  resetPose(her); her.userData.legs.rotation.x = 0; her.userData.legs.position.set(0, 0.7, 0);
  let heartK = 0;

  // ---- A opening
  if (t < 10 || t >= 72) {
    if (t < 10) { her.position.copy(HERA); her.rotation.y = Math.PI; her.position.y = 0; }
    [fam.dad, fam.lola, fam.kid].forEach((p, i) => { resetPose(p); lookAt(p, her.position); });
    neighbours.forEach((n, i) => { resetPose(n); if (t < 10) lookAt(n, her.position); });
    if (t < 10) {
      if (t > 8.2) { [fam.dad, fam.lola, fam.kid, ...neighbours].forEach((p, i) => { p.rotation.y += smooth(8.2, 9.4, t) * (1.4 + i * 0.3); }); }
      if (t > 1.5 && t < 7.4) { fam.kid.userData.arms[1].rotation.z = -2.5 - Math.sin(t * 8) * 0.3; }
      if (t > 6.4 && t < 9.6) bubbles.push({ p: chestOf(her).add(V(0, 1.6, 0)), text: '...hello?', a: smooth(6.4, 6.8, t) * (1 - smooth(9.2, 9.6, t)), who: 'her' });
    }
  }
  // ---- B room
  if (t >= 10 && t < 22) {
    const walkIn = smooth(10.5, 14, t);
    her.position.set(RX + lerp(10.5, 4.2, walkIn), 0.3, lerp(2, 1.4, walkIn)); her.rotation.y = -Math.PI / 2; walkBob(her, t, walkIn > 0 && walkIn < 1); her.position.y += 0.3;
    [rDad, rLola, rKid].forEach((p, i) => { const k = smooth(13 + i * 0.3, 14.2 + i * 0.3, t); p.userData.head.rotation.y = 0; const base = [Math.PI / 2, 0, Math.PI][i]; p.rotation.y = lerp(base, Math.atan2(her.position.x - (RX + p.position.x), her.position.z - p.position.z), k * 0.8); });
    frames.forEach(f => { f.full.material.opacity = 1 - smooth(f.t, f.t + 0.9, t); if (Math.abs(t - f.t - 0.45) < 1 / 60) addBurst([f.pos], f.t, GOLD, 30); });
    if (t > 15.2 && t < 19.4) bubbles.push({ p: V(RX - 3.4, 4.0, -1), text: 'Can we help you, miss?', a: smooth(15.2, 15.6, t) * (1 - smooth(19, 19.4, t)) });
    if (t > 17.2 && t < 21.4) bubbles.push({ p: V(RX - 1.2, 2.9, 1.2), text: 'Papa, who is she?', a: smooth(17.2, 17.6, t) * (1 - smooth(21, 21.4, t)) });
  }
  // ---- C restaurant
  if (t >= 22 && t < 34) {
    const walkIn = smooth(22.4, 26, t);
    her.position.set(KX + lerp(-12, -1.5, walkIn), 0, 11.6); her.rotation.y = lerp(Math.PI / 2, Math.PI * 0.85, smooth(25.5, 26.5, t)); walkBob(her, t, walkIn > 0 && walkIn < 1);
    signFull.material.opacity = 1 - smooth(26, 28.5, t);
    if (Math.abs(t - 27) < 1 / 60) addBurst([V(KX - 7, 8, 6.8), V(KX - 4.5, 8, 6.8), V(KX - 2, 8, 6.8)], 27, GOLD, 30);
    staff.forEach((s, i) => { resetPose(s); lookAt(s, her.position); });
    staff[2].userData.arms[1].rotation.z = t > 28.5 ? -1.4 : -0.12; staff[2].userData.arms[1].rotation.x = t > 28.5 ? -0.4 : 0;
    if (t > 28.6 && t < 33.4) bubbles.push({ p: V(KX + 2.5, 3.6, 8.4), text: 'Sorry ma\'am, staff only.', a: smooth(28.6, 29, t) * (1 - smooth(33, 33.4, t)) });
    if (t > 30.6 && t < 33.4) bubbles.push({ p: V(KX - 2.5, 3.6, 8.4), text: 'Do we know you?', a: smooth(30.6, 31, t) * (1 - smooth(33, 33.4, t)) });
    diners.forEach((d, i) => walkBob(d, t, false));
  }
  // ---- D plaza crowd & rain
  const rainK = smooth(35, 37, t) * (1 - smooth(45.5, 46, t));
  crowd.forEach((p, i) => { const a = p.userData.a + t * p.userData.sp; p.position.set(Math.cos(a) * p.userData.r, 0, Math.sin(a) * p.userData.r); p.rotation.y = -a + (p.userData.sp > 0 ? Math.PI : 0); walkBob(p, t, true, i); if (p.children.length > 7) p.userData.arms[1].rotation.x = -0.6; p.visible = t >= 34 && t < 46; });
  if (t >= 34 && t < 46) { her.position.set(PX, 0, 8); her.rotation.y = t * 0.15; her.userData.head.rotation.x = 0.25; }
  rainM.opacity = rainK * 0.55;
  if (rainK > 0) {
    const c = camera.position;
    for (let i = 0; i < RAIN_N; i++) { const y = ((rainSeed[i * 3 + 1] * 30 - t * 22) % 30 + 30) % 30; const x = c.x - 25 + rainSeed[i * 3] * 50, z = c.z - 25 + rainSeed[i * 3 + 2] * 50; rainPos.set([x, y, z, x + 0.05, y + 0.8, z], i * 6); }
    rainGeo.attributes.position.needsUpdate = true;
  }
  // ---- E bench at night
  lampHead.material.emissiveIntensity = (t >= 46 && t < 58) ? 2.5 : 0; lampL.intensity = (t >= 46 && t < 58) ? 260 : 0;
  if (t >= 46 && t < 58) {
    her.position.set(PX + 14, 0, 8); her.rotation.y = -Math.PI / 2 + 0.5 + Math.PI; her.rotation.y = 0.5 - Math.PI / 2 + Math.PI;
    her.rotation.y = Math.atan2(-1, -0.0) ; // facing -x
    her.rotation.y = -Math.PI / 2 + 0.5;
    sit(her); her.position.set(PX + 14 + 0.877 * 0.15, 0.25, 8 - 0.479 * 0.15);
    her.userData.head.rotation.x = lerp(0.45, -0.1, smooth(51, 54, t));
    heartK = smooth(49, 55, t);
    her.userData.arms[0].rotation.x = -0.8 * smooth(53, 55, t); her.userData.arms[1].rotation.x = -0.8 * smooth(53, 55, t);
    her.userData.arms[0].rotation.z = 0.5 * smooth(53, 55, t); her.userData.arms[1].rotation.z = -0.5 * smooth(53, 55, t);
  }
  // ---- F community table
  guests.forEach((g, i) => { g.visible = t >= 58 && t < 72; });
  if (t >= 58 && t < 72) {
    her.position.copy(HER_TABLE); her.rotation.y = 0; heartK = 0.7 + Math.sin(t * 3) * 0.1;
    her.userData.arms[1].rotation.x = -1.1 + Math.sin(t * 4) * 0.4;
    guests.forEach((g, i) => {
      const t0 = GUEST_T(i); const spot = guestSpot(i);
      const arrive = smooth(t0 - 1.5, t0, t);
      g.position.set(lerp(spot.x + 10, spot.x, arrive), 0, spot.z); resetPose(g);
      walkBob(g, t, arrive > 0.02 && arrive < 0.98, i);
      g.rotation.y = arrive < 0.98 ? -Math.PI / 2 : Math.atan2(HER_TABLE.x - spot.x, HER_TABLE.z - spot.z);
      g.userData.bowl.visible = t > t0 + 0.4; if (t > t0 + 0.4) g.userData.arms[0].rotation.x = -1.0;
    });
    const bub = [[60.4, 'Salamat po!', 0], [62.9, 'This tastes like home...', 2], [65.2, 'What is your name?', 4], [67.6, 'Rosa.', -1], [69.4, 'Thank you, Rosa!', 6]];
    bub.forEach(([b0, text, gi]) => { if (t > b0 && t < b0 + 2.4) { const p = gi < 0 ? V(HER_TABLE.x, 3.4, HER_TABLE.z) : guestSpot(gi).add(V(0, 3.4 * (gi === 4 ? 0.7 : 1), 0)); bubbles.push({ p, text, a: smooth(b0, b0 + 0.3, t) * (1 - smooth(b0 + 2.0, b0 + 2.4, t)), who: gi < 0 ? 'her' : '' }); } });
    // steam
    const sp = steam.geometry.attributes.position.array;
    for (let i = 0; i < 240; i++) { const pot = cpots[i % 3].getWorldPosition(new THREE.Vector3()); const ph = (t * 0.35 + i * 0.618) % 1; sp.set([pot.x + Math.sin(t + i) * 0.3 * ph, pot.y + 0.4 + ph * 3, pot.z + Math.cos(t * 1.3 + i) * 0.3 * ph], i * 3); }
    steam.geometry.attributes.position.needsUpdate = true;
  }
  steam.visible = t >= 58 && t < 72;
  // ---- G finale (street)
  if (t >= 72) {
    her.position.copy(HER_FIN); her.rotation.y = Math.PI; heartK = 1;
    const run = smooth(72.6, 74.6, t);
    fam.kid.position.set(-0.6, 0, lerp(4.9, 6.75, run)); fam.dad.position.set(-1.6, 0, lerp(4.6, 6.6, smooth(73, 75, t))); fam.lola.position.set(1.5, 0, lerp(4.5, 6.6, smooth(73.3, 75.3, t)));
    walkBob(fam.kid, t, run > 0 && run < 1);
    [fam.dad, fam.kid, fam.lola].forEach(p => lookAt(p, her.position));
    const hug = smooth(74.4, 75.2, t);
    her.userData.arms[0].rotation.z = lerp(0.12, -1.1, hug); her.userData.arms[1].rotation.z = lerp(-0.12, 1.1, hug); her.userData.arms[0].rotation.x = her.userData.arms[1].rotation.x = -0.9 * hug;
    fam.kid.userData.arms[0].rotation.x = fam.kid.userData.arms[1].rotation.x = -1.4 * hug;
    fam.dad.userData.arms[1].rotation.z = -1.0 * smooth(75, 76, t); fam.lola.userData.arms[0].rotation.z = 1.0 * smooth(75.3, 76.3, t);
    if (t > 73.6 && t < 76.8) bubbles.push({ p: V(-0.6, 3.2, 6.3), text: 'Mama!', a: smooth(73.6, 74, t) * (1 - smooth(76.4, 76.8, t)) });
    neighbours.forEach((n, i) => { lookAt(n, her.position); n.userData.arms[1].rotation.z = t > 76 + i * 0.3 ? -2.5 - Math.sin(t * 7 + i) * 0.3 : -0.12; });
  }
  winMats.forEach((w, i) => w.emissiveIntensity = lerp(0.1, 2.0, smooth(76 + (i % 7) * 0.3, 78 + (i % 7) * 0.3, t)));
  stringBulbs.forEach((b, i) => b.material.emissiveIntensity = smooth(77, 79, t) * (((Math.floor(t * 3) + i) % 3 === 0) ? 3 : 1.3));
  // sparks
  sparkM.opacity = smooth(76, 79, t);
  if (sparkM.opacity > 0) { const sa = sparkGeo.attributes.position.array; sparkSeed.forEach(([a, b, c, d], i) => { const y = ((b * 25 + t * (0.8 + d)) % 25); sa.set([-40 + a * 80 + Math.sin(t + i) * 0.8, y, -6 + c * 30], i * 3); }); sparkGeo.attributes.position.needsUpdate = true; }

  // heart glow
  heartM.emissiveIntensity = heartK * (1.4 + Math.sin(t * 4) * 0.3); heart.scale.setScalar(0.4 + heartK * (0.5 + Math.sin(t * 4) * 0.06)); heart.visible = heartK > 0.01; heartLight.intensity = heartK * 5;

  // threads
  for (const th of threads) {
    const g = clamp((t - th.grow0) / (th.grow1 - th.grow0));
    const segs = Math.floor(g * th.SEG); th.geo.setDrawRange(0, segs * th.RAD * 6);
    const fadeK = smooth(th.fade0, th.fade0 + 0.6, t);
    th.m.opacity = (0.75 + 0.25 * Math.sin(t * 5 + th.grow0 * 3)) * (1 - fadeK);
    th.o.visible = segs > 0 && th.m.opacity > 0.01;
    if (!th.burst && t >= th.fade0 && th.fade0 < 900) { th.burst = true; addBurst([0.2, 0.4, 0.6, 0.8].map(u => th.curve.getPoint(u)), th.fade0, GOLD, 12); }
    if (th.fade0 < 900 && t < th.fade0) th.burst = false;
    if (t >= th.grow0 && th.fade0 > 900 && !th.spawned && t < th.grow1 + 0.05 && t > th.grow1 - 0.05) { }
  }
  // dust bursts
  const dp = dust.attributes.position.array, dc = dust.attributes.color.array; let k = 0;
  for (const b of bursts) {
    const dt = t - b.t0; if (dt < 0 || dt > 2.5) continue;
    b.points.forEach((p, pi) => { for (let j = 0; j < b.n && k < DUST_N; j++) { const d = b.dirs[pi * b.n + j]; const f = Math.max(0, 1 - dt / 2.5); dp.set([p.x + d.x * dt, p.y + d.y * dt, p.z + d.z * dt], k * 3); dc.set([b.c.r * f, b.c.g * f, b.c.b * f], k * 3); k++; } });
  }
  for (; k < DUST_N; k++) dp[k * 3 + 1] = -999;
  dust.attributes.position.needsUpdate = true; dust.attributes.color.needsUpdate = true;
  // fountain spray
  const spa = spray.geometry.attributes.position.array;
  for (let i = 0; i < 400; i++) { const ph = (t * 0.8 + i * 0.618) % 1; const a = i * 2.39; spa.set([Math.cos(a) * ph * 2.5, 3.6 + ph * 3 - ph * ph * 5.5, Math.sin(a) * ph * 2.5], i * 3); }
  spray.geometry.attributes.position.needsUpdate = true;

  const c = camAt(t); camera.position.copy(c.pos); camera.position.y += Math.sin(t * 0.9) * 0.06; camera.lookAt(c.tgt);
  sun.position.set(c.tgt.x - 50, 70, c.tgt.z + 60); sun.target.position.copy(c.tgt);
  renderer.render(scene, camera);
  composite(t);
}

// =========================================================
// 2D OVERLAY
// =========================================================
const captions = [
  { t0: 0.6, t1: 9.6, title: true, big: 'WHAT IF EVERYONE', big2: 'FORGOT WHO YOU ARE?', small: 'One morning, every memory of you disappears.' },
  { t0: 10.4, t1: 21.6, big: 'A STRANGER AT HOME', small: 'Your family looks up politely. Every photo of you on the wall is suddenly blank.' },
  { t0: 22.4, t1: 33.6, big: 'YOUR WORK, UNKNOWN', small: 'The restaurant you built is still running, but your name is gone from the sign. Your own team asks who you are.' },
  { t0: 34.4, t1: 45.6, big: 'ALONE IN A CROWD', small: 'Thousands of faces in the city, and not one of them knows yours.' },
  { t0: 46.4, t1: 57.6, big: 'WHAT IS STILL YOURS?', small: 'They forgot your name. But your heart, your skills and your dreams were never stored in their memories. They live in you.' },
  { t0: 58.4, t1: 71.6, big: 'SO YOU START AGAIN', small: 'You do what you have always done: cook, serve, lead and care. One kindness at a time, new connections begin to glow.' },
  { t0: 72.4, t1: 83.6, big: 'AND THEY FEEL IT AGAIN', small: 'People may forget your name. They never forget how you made them feel.', end: true },
];
const days = [[0, 'DAY 0'], [10, 'DAY 1'], [22, 'DAY 3'], [34, 'DAY 9'], [46, 'DAY 21'], [58, 'DAY 40'], [72, 'DAY 100']];
const SANS = '"DejaVu Sans", sans-serif', SERIF = '"DejaVu Serif", serif';
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrap(text, maxW) { const ws = text.split(' '); const lines = []; let l = ''; for (const w of ws) { const tt = l ? l + ' ' + w : w; if (ctx.measureText(tt).width > maxW && l) { lines.push(l); l = w; } else l = tt; } if (l) lines.push(l); return lines; }

function composite(t) {
  ctx.globalAlpha = 1;
  const sat = saturation(t);
  ctx.filter = `saturate(${sat.toFixed(3)})`; ctx.drawImage(renderer.domElement, 0, 0); ctx.filter = 'none';
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.9); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.35 + 0.2 * (1 - clamp(sat))})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  // speech bubbles
  for (const b of bubbles) {
    const p = b.p.clone().project(camera); if (p.z > 1) continue;
    const x = (p.x * 0.5 + 0.5) * W, y = (-p.y * 0.5 + 0.5) * H;
    ctx.globalAlpha = b.a; ctx.font = `bold 20px ${SANS}`; const tw = ctx.measureText(b.text).width;
    const bw = tw + 32, bh = 42, bx = clamp(x - bw / 2, 20, W - bw - 20), by = y - bh - 16;
    ctx.fillStyle = b.who === 'her' ? '#fff3d6' : '#ffffff'; roundRect(bx, by, bw, bh, 14); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 8, by + bh - 1); ctx.lineTo(x + 8, by + bh - 1); ctx.lineTo(x, by + bh + 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#222'; ctx.fillText(b.text, bx + 16, by + 28);
  }
  ctx.globalAlpha = 1;

  // HUD: day + memory meter
  const hudA = smooth(1.5, 2.5, t) * (1 - smooth(84, 85, t));
  if (hudA > 0) {
    ctx.globalAlpha = hudA;
    let d = days[0][1]; for (const [d0, s] of days) if (t >= d0) d = s;
    ctx.fillStyle = 'rgba(12,14,30,0.55)'; roundRect(28, 26, 130, 40, 12); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = `bold 20px ${SANS}`; ctx.textAlign = 'center'; ctx.fillText(d, 93, 54); ctx.textAlign = 'left';
    const pct = memoryPct(t); const mx = W - 28 - 260;
    ctx.fillStyle = 'rgba(12,14,30,0.55)'; roundRect(mx, 26, 260, 58, 12); ctx.fill();
    ctx.fillStyle = '#ffd98a'; ctx.font = `bold 12px ${SANS}`; ctx.fillText('PEOPLE WHO REMEMBER YOU', mx + 16, 46);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; roundRect(mx + 16, 58, 170, 12, 6); ctx.fill();
    if (pct > 0) { ctx.fillStyle = pct > 50 ? '#ffc04d' : '#ff7b54'; roundRect(mx + 16, 58, Math.max(12, 170 * pct / 100), 12, 6); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; ctx.font = `bold 18px ${SANS}`; ctx.fillText(pct + '%', mx + 196, 71);
    ctx.globalAlpha = 1;
  }
  for (const c of captions) {
    const a = smooth(c.t0, c.t0 + 0.6, t) * (1 - smooth(c.t1 - 0.6, c.t1, t)); if (a <= 0) continue;
    ctx.globalAlpha = a; const rise = (1 - smooth(c.t0, c.t0 + 0.8, t)) * 16;
    if (c.title) {
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(10,12,28,0.45)'; ctx.fillRect(0, 96 + rise, W, 220);
      ctx.fillStyle = '#ffd98a'; ctx.font = `bold 20px ${SANS}`; ctx.fillText('A 3D  " W H A T   I F ? "  S T O R Y', W / 2, 142 + rise);
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12; ctx.fillStyle = '#ffffff'; ctx.font = `bold 54px ${SERIF}`; ctx.fillText(c.big, W / 2, 204 + rise);
      ctx.fillStyle = '#ffc04d'; ctx.fillText(c.big2, W / 2, 266 + rise); ctx.shadowBlur = 0;
      ctx.fillStyle = '#eef2ff'; ctx.font = `italic 20px ${SERIF}`; ctx.fillText(c.small, W / 2, 302 + rise); ctx.textAlign = 'left';
    } else {
      ctx.font = `22px ${SANS}`; const lines = wrap(c.small, 900); const bh = 70 + lines.length * 30, by = H - 40 - bh + rise, bx = 60;
      ctx.fillStyle = 'rgba(12,14,30,0.64)'; roundRect(bx, by, 980, bh, 18); ctx.fill();
      ctx.fillStyle = c.end ? '#ffc04d' : '#8fa3c7'; roundRect(bx, by, 8, bh, 4); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = `bold 30px ${SERIF}`; ctx.fillText(c.big, bx + 34, by + 46);
      ctx.fillStyle = '#e3e8f5'; ctx.font = `22px ${SANS}`; lines.forEach((l, i) => ctx.fillText(l, bx + 34, by + 84 + i * 30));
    }
    ctx.globalAlpha = 1;
  }
  const endA = smooth(84.4, 85.4, t);
  if (endA > 0) {
    ctx.globalAlpha = endA * 0.8; ctx.fillStyle = '#0a0c1c'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = endA; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffc04d'; ctx.font = `bold 46px ${SERIF}`; ctx.fillText('You are more than what people remember.', W / 2, H / 2);
    ctx.fillStyle = '#e3e8f5'; ctx.font = `italic 24px ${SERIF}`; ctx.fillText('Your worth was never stored in someone else’s memory.', W / 2, H / 2 + 50);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
  let fade = 1 - smooth(0, 0.8, t);
  for (const s of shots) if (s.t0 > 0) fade = Math.max(fade, 1 - smooth(0, 0.45, Math.abs(t - s.t0)));
  fade = Math.max(fade, smooth(89.3, 90, t));
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
}

window.frameJPEG = (t, q = 0.9) => { renderAt(t); return out.toDataURL('image/jpeg', q); };
window.ready = true;
