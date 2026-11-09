import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildWorld } from './world.js';
import { createSpiderMan } from './spiderman.js';
import { createVenom } from './venom.js';
import { computePose, applyPose } from './rig.js';
import { Tentacles } from './tentacles.js';
import { makeCanvas, toTexture } from './textures.js';

const V3 = THREE.Vector3;
const UP = new V3(0, 1, 0);
const AXIS_X = new V3(1, 0, 0);
const G = 28;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const easeOutBack = (x) => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);
const canvas = renderer.domElement;

const scene = new THREE.Scene();
{
  const [c, g] = makeCanvas(2, 256);
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#4f86c6');
  grd.addColorStop(0.6, '#a9c8e8');
  grd.addColorStop(1, '#e8eef2');
  g.fillStyle = grd;
  g.fillRect(0, 0, 2, 256);
  scene.background = toTexture(c);
}
scene.fog = new THREE.Fog(0xbdd3e8, 90, 380);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 1000);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

scene.add(new THREE.HemisphereLight(0xd6e8ff, 0x4a4f58, 1.1));
const sun = new THREE.DirectionalLight(0xfff0dc, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 200 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

const world = buildWorld(scene);

// ---------- heroes ----------
const heroes = { spider: createSpiderMan(), venom: createVenom() };
let hero = heroes.spider;
const playerRoot = new THREE.Group();
playerRoot.add(hero.root);
scene.add(playerRoot);
const tentacles = new Tentacles(scene, heroes.venom.gooMaterial);

const rope = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), hero.ropeMaterial);
rope.visible = false;
scene.add(rope);

const P = {
  pos: new V3(0, 0, 13),
  vel: new V3(),
  onGround: true,
  yaw: Math.PI,
  swing: null,
  climb: null,
  climbCd: 0,
  phase: 0,
  attack: null,
  combo: 0,
  landT: 0,
  shootT: 0,
  flipT: 0,
  morphT: 1,
  tiltQ: new THREE.Quaternion(),
};
const cam = { yaw: Math.PI, pitch: 0.25, zoom: 1, dist: 6, smooth: new V3(0, 1.7, 13) };

// ---------- training dummies ----------
const dummies = [];
{
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd2652c, roughness: 0.6 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xeee6d2, roughness: 0.5 });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
  const webMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const add = (geo, mat, y, s = [1, 1, 1], rz = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.y = y;
      m.scale.set(...s);
      m.rotation.z = rz;
      m.castShadow = true;
      g.add(m);
      return m;
    };
    add(new THREE.CylinderGeometry(0.4, 0.45, 0.2, 20), baseMat, 0.1);
    add(new THREE.CapsuleGeometry(0.3, 0.7, 6, 16), bodyMat, 0.95);
    add(new THREE.SphereGeometry(0.22, 20, 14), headMat, 1.75);
    add(new THREE.CapsuleGeometry(0.08, 0.9, 4, 8), bodyMat, 1.3, [1, 1, 1], Math.PI / 2);
    const cocoon = add(new THREE.SphereGeometry(1, 16, 12), webMat, 1.0, [0.5, 1.05, 0.5]);
    cocoon.visible = false;
    const a = (i / 6) * Math.PI * 2;
    const home = new V3(Math.sin(a) * 9, 0, Math.cos(a) * 9 - 4);
    g.position.copy(home);
    g.rotation.y = a + Math.PI;
    scene.add(g);
    dummies.push({ g, home, pos: home.clone(), vel: new V3(), knocked: false, timer: 0, spin: 0, cocoon, webbed: 0, yaw: a + Math.PI });
  }
}

function knock(d, dir, power) {
  d.knocked = true;
  d.timer = 4;
  d.vel.copy(dir).setY(0).normalize().multiplyScalar(power);
  d.vel.y = power * 0.45;
  d.spin = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 6);
  d.pos.y += 0.05;
  burst(d.pos.clone().add(new V3(0, 1.2, 0)), 14, 0xffd75e, 5, 0.06, 0.4);
}

function updateDummies(dt) {
  for (const d of dummies) {
    if (d.webbed > 0) d.webbed -= dt;
    d.cocoon.visible = d.webbed > 0;
    if (!d.knocked) continue;
    const prevY = d.pos.y;
    d.vel.y -= G * dt;
    d.pos.addScaledVector(d.vel, dt);
    const out = { ground: false, wall: null };
    world.collide(d.pos, prevY, d.vel, 0.4, 1.9, out);
    if (out.ground) {
      d.vel.x *= Math.exp(-6 * dt);
      d.vel.z *= Math.exp(-6 * dt);
      d.g.rotation.x += (Math.PI / 2 - d.g.rotation.x) * damp(10, dt);
    } else {
      d.g.rotation.x += d.spin * dt;
    }
    d.g.position.copy(d.pos);
    d.timer -= dt;
    if (d.timer <= 0) {
      d.knocked = false;
      d.pos.copy(d.home);
      d.vel.set(0, 0, 0);
      d.g.position.copy(d.home);
      d.g.rotation.set(0, d.yaw, 0);
      burst(d.home.clone().add(new V3(0, 1, 0)), 20, 0xffffff, 3, 0.08, 0.5);
    }
  }
}

// ---------- particles ----------
const particles = [];
const pGeo = new THREE.SphereGeometry(1, 8, 6);
const pMats = new Map();
function burst(pos, n, color, speed, size, life) {
  const mat = color.isMaterial ? color : pMats.get(color) || pMats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.4 })).get(color);
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(pGeo, mat);
    m.position.copy(pos);
    const v = new V3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random()));
    v.y += speed * 0.4;
    scene.add(m);
    particles.push({ m, v, life: life * (0.6 + Math.random() * 0.6), max: life, size: size * (0.6 + Math.random()) });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      scene.remove(p.m);
      particles.splice(i, 1);
      continue;
    }
    p.v.y -= G * 0.5 * dt;
    p.m.position.addScaledVector(p.v, dt);
    p.m.scale.setScalar(p.size * Math.min(1, p.life / p.max * 1.5));
  }
}

// ---------- web projectiles ----------
const shots = [];
const shotMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x888888 });
function updateShots(dt) {
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.life -= dt;
    s.m.position.addScaledVector(s.v, dt);
    let done = s.life <= 0 || s.m.position.y < 0;
    for (const d of dummies) {
      if (done) break;
      if (s.m.position.distanceTo(d.pos.clone().add(new V3(0, 1.1, 0))) < 1.0) {
        d.webbed = 3;
        if (!d.knocked) knock(d, s.v, 6);
        done = true;
      }
    }
    if (done) {
      burst(s.m.position.clone(), 8, shotMat, 3, 0.05, 0.3);
      scene.remove(s.m);
      shots.splice(i, 1);
    }
  }
}

// ---------- helpers ----------
function camForward() {
  return new V3(Math.sin(cam.yaw), 0, Math.cos(cam.yaw));
}
function rightOf(f) {
  return new V3(-f.z, 0, f.x);
}
function facing() {
  return new V3(Math.sin(P.yaw), 0, Math.cos(P.yaw));
}
function setCylinder(m, a, b, r) {
  const d = new V3().subVectors(b, a);
  const l = d.length() || 1e-4;
  m.position.addVectors(a, b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / l));
  m.scale.set(r, l, r);
}
const isVenom = () => hero.id === 'venom';

// ---------- actions ----------
const raycaster = new THREE.Raycaster();
function startSwing() {
  if (P.swing) return;
  if (P.climb) {
    P.climb = null;
    P.climbCd = 0.4;
  }
  const f = camForward();
  const r = rightOf(f);
  const origin = P.pos.clone().add(new V3(0, 1.5, 0));
  let anchor = null;
  search: for (const side of [0.35, -0.35, 0]) {
    for (const ang of [1.0, 0.85, 1.15, 0.7]) {
      const dir = f.clone().multiplyScalar(Math.cos(ang)).addScaledVector(UP, Math.sin(ang)).addScaledVector(r, side).normalize();
      raycaster.set(origin, dir);
      raycaster.far = 75;
      const hit = raycaster.intersectObjects(world.meshes, false)[0];
      if (hit && hit.distance > 7 && hit.point.y > P.pos.y + 4) {
        anchor = hit.point.clone();
        break search;
      }
    }
  }
  if (!anchor) anchor = P.pos.clone().addScaledVector(f, 16).add(new V3(0, 22, 0));
  if (P.onGround) {
    P.vel.y = Math.max(P.vel.y, 9);
    P.pos.y += 0.05;
    P.onGround = false;
  }
  const hand = anchor.clone().sub(P.pos).dot(r) >= 0 ? 'R' : 'L';
  P.swing = { anchor, len: anchor.distanceTo(P.pos), hand, shootT: 0 };
  P.flipT = 0;
}

function releaseSwing(boost) {
  if (!P.swing) return;
  P.swing = null;
  if (boost && !P.onGround) {
    P.vel.y += 6;
    P.vel.addScaledVector(camForward(), 4);
    if (!isVenom()) P.flipT = 0.0001;
  }
}

function jump() {
  if (P.climb) {
    const n = P.climb.n;
    P.vel.copy(n).multiplyScalar(9).add(new V3(0, 10, 0));
    P.climb = null;
    P.climbCd = 0.4;
    P.yaw = Math.atan2(n.x, n.z);
    if (!isVenom()) P.flipT = 0.0001;
  } else if (P.onGround && P.landT <= 0) {
    P.vel.y = hero.stats.jump;
    P.onGround = false;
  }
}

function hitDummies(range, power) {
  const f = facing();
  for (const d of dummies) {
    if (d.knocked) continue;
    const to = d.pos.clone().sub(P.pos).setY(0);
    const dist = to.length();
    if (dist < range && (dist < 0.8 || to.normalize().dot(f) > 0.3)) knock(d, dist < 0.01 ? f : to, power);
  }
}

function attack() {
  if (P.attack || P.climb) return;
  const venom = isVenom();
  const f = camForward();
  P.yaw = Math.atan2(f.x, f.z);
  P.attack = { t: 0, dur: venom ? 0.6 : 0.38, kind: P.combo % 3, hit: false };
  P.combo++;
  if (venom) {
    const r = rightOf(f);
    for (let i = 0; i < 4; i++) {
      const target = P.pos.clone().addScaledVector(f, 4).addScaledVector(r, (i - 1.5) * 1.4).add(new V3(0, 0.6 + (i % 2) * 1.0, 0));
      tentacles.strike(target, { dur: 0.45 });
    }
  }
}

function shoot() {
  const camDir = new V3();
  camera.getWorldDirection(camDir);
  if (isVenom()) {
    let best = null;
    let bestD = 24;
    for (const d of dummies) {
      if (d.knocked) continue;
      const to = d.pos.clone().add(new V3(0, 1.1, 0)).sub(P.pos);
      const dist = to.length();
      if (dist < bestD && to.clone().setY(0).normalize().dot(camForward()) > 0.5) {
        best = d;
        bestD = dist;
      }
    }
    if (best) {
      const d = best;
      tentacles.strike(d.pos.clone().add(new V3(0, 1.1, 0)), {
        dur: 0.5,
        onReach: () => knock(d, P.pos.clone().sub(d.pos), 13),
      });
      const to = d.pos.clone().sub(P.pos);
      P.yaw = Math.atan2(to.x, to.z);
    } else {
      tentacles.strike(P.pos.clone().addScaledVector(camDir, 9).add(new V3(0, 1.4, 0)), { dur: 0.45 });
    }
    return;
  }
  P.shootT = 0.25;
  const f = camForward();
  P.yaw = Math.atan2(f.x, f.z);
  playerRoot.updateMatrixWorld(true);
  const from = hero.J.handR.getWorldPosition(new V3());
  const target = camera.position.clone().addScaledVector(camDir, 60);
  const v = target.sub(from).normalize().multiplyScalar(55);
  const m = new THREE.Mesh(pGeo, shotMat);
  m.scale.set(0.07, 0.07, 0.35);
  m.position.copy(from);
  m.lookAt(from.clone().add(v));
  scene.add(m);
  shots.push({ m, v, life: 1.2 });
}

function setHero(id, fx = true) {
  if (hero.id === id) return;
  const wasVenom = isVenom();
  playerRoot.remove(hero.root);
  hero = heroes[id];
  playerRoot.add(hero.root);
  rope.material = hero.ropeMaterial;
  P.attack = null;
  if (fx) {
    const at = P.pos.clone().add(new V3(0, 1.2, 0));
    burst(at, 70, id === 'venom' || wasVenom ? heroes.venom.gooMaterial : 0xffffff, 8, 0.13, 0.9);
    P.morphT = 0;
  }
  document.getElementById('name').textContent = hero.name;
  document.getElementById('btn-spider').classList.toggle('active', id === 'spider');
  document.getElementById('btn-venom').classList.toggle('active', id === 'venom');
}

// ---------- input ----------
const keys = new Set();
const key = (c) => keys.has(c);
addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  switch (e.code) {
    case 'Space': jump(); break;
    case 'KeyE': startSwing(); break;
    case 'KeyQ': attack(); break;
    case 'KeyF': shoot(); break;
    case 'KeyT': setHero(isVenom() ? 'spider' : 'venom'); break;
    case 'Digit1': setHero('spider'); break;
    case 'Digit2': setHero('venom'); break;
    case 'KeyH': { const h = document.getElementById('help'); h.hidden = !h.hidden; break; }
  }
});
addEventListener('keyup', (e) => {
  keys.delete(e.code);
  if (e.code === 'KeyE') releaseSwing(true);
});
addEventListener('blur', () => keys.clear());
canvas.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== canvas) {
    canvas.requestPointerLock?.();
    return;
  }
  if (e.button === 0) startSwing();
  if (e.button === 2) shoot();
});
addEventListener('mouseup', (e) => {
  if (e.button === 0) releaseSwing(true);
});
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas) return;
  cam.yaw -= e.movementX * 0.0025;
  cam.pitch = clamp(cam.pitch + e.movementY * 0.0025, -0.35, 1.25);
});
addEventListener('wheel', (e) => {
  cam.zoom = clamp(cam.zoom * (e.deltaY > 0 ? 1.1 : 0.9), 0.5, 2.5);
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
for (const id of ['spider', 'venom']) {
  document.getElementById('btn-' + id).addEventListener('click', (e) => {
    setHero(id);
    e.currentTarget.blur();
  });
}

// ---------- player physics ----------
function startClimb(wall) {
  P.climb = { box: wall.box, n: wall.normal.clone() };
  P.swing = null;
  P.vel.set(0, 0, 0);
  P.yaw = Math.atan2(-wall.normal.x, -wall.normal.z);
}

function updateClimb(dt, ix, iz, running) {
  const { box: b, n } = P.climb;
  const right = new V3(n.z, 0, -n.x);
  const sp = 4.5 * (running ? 1.8 : 1) * (isVenom() ? 0.9 : 1);
  P.pos.y += iz * sp * dt;
  P.pos.addScaledVector(right, ix * sp * dt);
  P.phase += (Math.abs(iz) + Math.abs(ix)) * dt * 7 * (running ? 1.5 : 1);
  const r = 0.45;
  if (n.x) P.pos.x = n.x > 0 ? b.max.x + r : b.min.x - r;
  else P.pos.z = n.z > 0 ? b.max.z + r : b.min.z - r;
  P.yaw = Math.atan2(-n.x, -n.z);
  const lat = n.x ? P.pos.z : P.pos.x;
  const lo = n.x ? b.min.z : b.min.x;
  const hi = n.x ? b.max.z : b.max.x;
  if (lat < lo - 0.3 || lat > hi + 0.3) {
    P.climb = null;
    P.climbCd = 0.5;
  } else if (P.pos.y >= b.max.y - 0.2) {
    // mantle onto the roof
    P.pos.y = b.max.y + 0.02;
    P.pos.addScaledVector(n, -1.0);
    P.climb = null;
    P.climbCd = 0.3;
    P.vel.set(0, 3, 0);
    P.onGround = false;
  } else if (P.pos.y <= 0) {
    P.pos.y = 0;
    P.pos.addScaledVector(n, 0.3);
    P.climb = null;
    P.climbCd = 0.6;
    P.onGround = true;
  }
}

function updatePlayer(dt) {
  const S = hero.stats;
  const f = camForward();
  const r = rightOf(f);
  const ix = (key('KeyD') ? 1 : 0) - (key('KeyA') ? 1 : 0);
  const iz = (key('KeyW') ? 1 : 0) - (key('KeyS') ? 1 : 0);
  const wish = f.clone().multiplyScalar(iz).addScaledVector(r, ix);
  if (wish.lengthSq() > 0) wish.normalize();
  const running = key('ShiftLeft') || key('ShiftRight');
  P.climbCd -= dt;
  P.landT -= dt;
  P.shootT -= dt;

  if (P.climb) {
    updateClimb(dt, ix, iz, running);
    return running;
  }

  const prevY = P.pos.y;
  if (P.swing) {
    const sw = P.swing;
    P.vel.y -= G * dt;
    const n = sw.anchor.clone().sub(P.pos).normalize();
    const pump = wish.clone().addScaledVector(n, -wish.dot(n));
    P.vel.addScaledVector(pump, 16 * dt);
    P.pos.addScaledVector(P.vel, dt);
    sw.len = Math.max(6, sw.len - 2 * dt);
    const d = P.pos.clone().sub(sw.anchor);
    const L = d.length();
    if (L > sw.len) {
      d.multiplyScalar(1 / L);
      P.pos.copy(sw.anchor).addScaledVector(d, sw.len);
      const vr = P.vel.dot(d);
      if (vr > 0) P.vel.addScaledVector(d, -vr);
    }
    if (P.vel.length() > 45) P.vel.setLength(45);
    P.phase += dt * 2;
    if (P.pos.y > sw.anchor.y - 1.5) releaseSwing(true);
  } else {
    const speed = running ? S.run : S.walk;
    if (P.onGround) {
      const lock = P.landT > 0 || P.attack ? 0 : 1;
      const k = damp(12, dt);
      P.vel.x += (wish.x * speed * lock - P.vel.x) * k;
      P.vel.z += (wish.z * speed * lock - P.vel.z) * k;
    } else {
      P.vel.addScaledVector(wish, 10 * dt);
    }
    P.vel.y -= G * dt;
    P.pos.addScaledVector(P.vel, dt);
  }

  const vyBefore = P.vel.y;
  const out = { ground: false, wall: null };
  world.collide(P.pos, prevY, P.vel, 0.45, S.height, out);
  const wasGround = P.onGround;
  P.onGround = out.ground;
  if (out.ground && !wasGround) {
    if (P.swing) releaseSwing(false);
    if (vyBefore < -24) {
      P.landT = 0.65;
      burst(P.pos.clone().add(new V3(0, 0.1, 0)), 16, 0x9a8f80, 6, 0.08, 0.5);
    }
    P.flipT = 0;
  }
  if (out.wall && P.climbCd <= 0 && (!P.onGround || wish.dot(out.wall.normal) < -0.6)) {
    if (P.swing) P.swing = null;
    startClimb(out.wall);
  }

  const hs = Math.hypot(P.vel.x, P.vel.z);
  if (hs > 0.5 && !P.attack && P.shootT <= 0) {
    const target = Math.atan2(P.vel.x, P.vel.z);
    let d = target - P.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    P.yaw += d * damp(12, dt);
  }
  return running;
}

// ---------- main loop ----------
const clock = new THREE.Clock();
const tmpQ = new THREE.Quaternion();
const yawQ = new THREE.Quaternion();
let time = 0;

function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  time += dt;
  const running = updatePlayer(dt);

  if (P.attack) {
    P.attack.t += dt / P.attack.dur;
    if (!P.attack.hit && P.attack.t > 0.4) {
      P.attack.hit = true;
      if (isVenom()) hitDummies(5, 16);
      else hitDummies(2.6, P.attack.kind === 2 ? 14 : 9);
    }
    if (P.attack.t >= 1) P.attack = null;
  }

  // animation state
  const hs = Math.hypot(P.vel.x, P.vel.z);
  let mode = 'idle';
  if (P.landT > 0) mode = 'land';
  else if (P.attack) mode = 'attack';
  else if (P.climb) mode = 'climb';
  else if (P.swing) mode = 'swing';
  else if (!P.onGround) mode = 'air';
  else if (hs > 0.6) mode = 'run';
  if (mode === 'run') P.phase += (hs / (1.2 + hs * 0.22)) * Math.PI * 2 * dt;
  const st = {
    mode,
    phase: P.phase,
    run: running && hs > 7,
    vy: P.vel.y,
    hand: P.swing?.hand,
    attackT: P.attack?.t ?? 0,
    attackKind: P.attack?.kind ?? 0,
    shootT: P.shootT,
  };

  playerRoot.position.copy(P.pos);
  yawQ.setFromAxisAngle(UP, P.yaw);
  playerRoot.quaternion.copy(yawQ);
  // lean the body along the web while swinging
  tmpQ.identity();
  if (P.swing) {
    const dir = P.swing.anchor.clone().sub(P.pos).sub(new V3(0, 1, 0)).normalize();
    dir.applyQuaternion(yawQ.clone().invert());
    tmpQ.setFromUnitVectors(UP, dir);
  }
  P.tiltQ.slerp(tmpQ, damp(10, dt));
  hero.J.body.quaternion.copy(P.tiltQ);
  if (P.flipT > 0) {
    P.flipT += dt / 0.55;
    if (P.flipT >= 1) P.flipT = 0;
    else hero.J.body.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(AXIS_X, P.flipT * Math.PI * 2));
  }
  if (P.morphT < 1) {
    P.morphT = Math.min(1, P.morphT + dt / 0.6);
    playerRoot.scale.setScalar(0.3 + 0.7 * easeOutBack(P.morphT));
  } else playerRoot.scale.setScalar(1);

  applyPose(hero.J, computePose(st, time, hero.style), damp(14, dt));
  hero.update(time, dt, st);
  playerRoot.updateMatrixWorld(true);

  tentacles.update(heroes.venom.J.chest, time, dt, isVenom(), heroes.venom.root.scale.x * playerRoot.scale.x);

  if (P.swing) {
    const sw = P.swing;
    sw.shootT = Math.min(1, sw.shootT + dt / 0.12);
    const hand = hero.J['hand' + sw.hand].getWorldPosition(new V3());
    setCylinder(rope, hand, hand.clone().lerp(sw.anchor, sw.shootT), hero.stats.ropeRadius);
    rope.visible = true;
  } else rope.visible = false;

  updateDummies(dt);
  updateShots(dt);
  updateParticles(dt);

  // camera
  if (key('ArrowLeft')) cam.yaw += dt * 2;
  if (key('ArrowRight')) cam.yaw -= dt * 2;
  if (key('ArrowUp')) cam.pitch = clamp(cam.pitch - dt, -0.35, 1.25);
  if (key('ArrowDown')) cam.pitch = clamp(cam.pitch + dt, -0.35, 1.25);
  const target = P.pos.clone().add(new V3(0, hero.stats.height * 0.85, 0));
  cam.smooth.lerp(target, damp(12, dt));
  cam.dist += (hero.stats.camDist * cam.zoom * (P.swing ? 1.3 : 1) - cam.dist) * damp(4, dt);
  const cf = camForward();
  camera.position.copy(cam.smooth)
    .addScaledVector(cf, -cam.dist * Math.cos(cam.pitch))
    .addScaledVector(UP, cam.dist * Math.sin(cam.pitch));
  camera.position.y = Math.max(0.3, camera.position.y);
  camera.lookAt(cam.smooth.x, cam.smooth.y + 0.2, cam.smooth.z);
  const fov = 62 + Math.min(16, P.vel.length() * 0.35);
  if (Math.abs(camera.fov - fov) > 0.05) {
    camera.fov += (fov - camera.fov) * damp(4, dt);
    camera.updateProjectionMatrix();
  }

  sun.position.copy(P.pos).add(new V3(40, 70, 25));
  sun.target.position.copy(P.pos);
  sun.target.updateMatrixWorld();

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// handle for automated checks / console tinkering
window.__game = { P, cam, dummies, setHero, startSwing, releaseSwing, attack, shoot, jump, keys };
