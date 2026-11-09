import * as THREE from 'three';
import { makeCanvas, toTexture } from './textures.js';

export const LOT = 40;
const N = 6; // lots from centre in each direction

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One texture tile = 16x16 world units: 8 windows across, 4 floors.
function windowTexture(wall, rnd) {
  const [c, g] = makeCanvas(256, 256);
  g.fillStyle = wall;
  g.fillRect(0, 0, 256, 256);
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 8; i++) {
      const lit = rnd() < 0.15;
      const grd = g.createLinearGradient(0, j * 64, 0, j * 64 + 64);
      grd.addColorStop(0, lit ? '#ffe8a8' : '#3b5878');
      grd.addColorStop(1, lit ? '#e8c070' : '#1d2e44');
      g.fillStyle = grd;
      g.fillRect(i * 32 + 5, j * 64 + 12, 22, 42);
    }
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(0, j * 64 + 58, 256, 4);
  }
  return toTexture(c, [1, 1]);
}

function groundTexture() {
  const [c, g] = makeCanvas(512, 512);
  g.fillStyle = '#2c2e33';
  g.fillRect(0, 0, 512, 512);
  const px = (u) => (u / LOT) * 512;
  g.fillStyle = '#80838a';
  g.fillRect(px(4), px(4), px(32), px(32));
  g.fillStyle = '#6a6d73';
  g.fillRect(px(6), px(6), px(28), px(28));
  // dashed centre lines along tile edges (= middle of streets)
  g.fillStyle = '#d9b43a';
  for (let k = 0; k < 512; k += 48) {
    g.fillRect(0, k, 3, 24);
    g.fillRect(509, k, 3, 24);
    g.fillRect(k, 0, 24, 3);
    g.fillRect(k, 509, 24, 3);
  }
  const t = toTexture(c, [20, 20]);
  t.offset.set(0.5, 0.5);
  return t;
}

export function buildWorld(scene) {
  const rnd = rng(1337);
  const colliders = [];
  const meshes = [];

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(800, 800),
    new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(15, 48),
    new THREE.MeshStandardMaterial({ color: 0x9a8f80, roughness: 0.9 }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.01;
  plaza.receiveShadow = true;
  scene.add(plaza);

  const walls = ['#8a8f99', '#b7a48a', '#6d7380', '#9c5a46', '#c9cdd3', '#5b6170'].map(
    (w) => new THREE.MeshStandardMaterial({ map: windowTexture(w, rnd), roughness: 0.7, metalness: 0.1 }),
  );
  const roof = new THREE.MeshStandardMaterial({ color: 0x4d5056, roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x8c8f94, roughness: 0.5, metalness: 0.6 });

  const addBox = (x, y0, z, w, h, d, mats, collidable = true) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    // scale UVs so window size is constant regardless of box size
    const uv = geo.attributes.uv;
    const spans = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) {
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k;
        uv.setXY(i, (uv.getX(i) * spans[f][0]) / 16, (uv.getY(i) * spans[f][1]) / 16);
      }
    }
    const m = new THREE.Mesh(geo, mats);
    m.position.set(x, y0 + h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    meshes.push(m);
    if (collidable) {
      colliders.push({
        min: new THREE.Vector3(x - w / 2, y0, z - d / 2),
        max: new THREE.Vector3(x + w / 2, y0 + h, z + d / 2),
      });
    }
    return m;
  };

  for (let gx = -N; gx <= N; gx++) {
    for (let gz = -N; gz <= N; gz++) {
      if (gx === 0 && gz === 0) continue; // plaza
      const cx = gx * LOT;
      const cz = gz * LOT;
      const centre = Math.max(Math.abs(gx), Math.abs(gz));
      const lots = rnd() < 0.5
        ? [[cx, cz, 18 + rnd() * 8, 18 + rnd() * 8]]
        : [[cx - 6.5, cz, 12, 24], [cx + 6.5, cz, 12, 24]];
      for (const [x, z, w, d] of lots) {
        const h = 14 + rnd() ** 1.8 * 70 + (centre <= 2 ? 22 : 0);
        const wall = walls[Math.floor(rnd() * walls.length)];
        addBox(x, 0, z, w, h, d, [wall, wall, roof, roof, wall, wall]);
        if (rnd() < 0.6) {
          const s = 2 + rnd() * 3;
          addBox(x + (rnd() - 0.5) * (w - s - 2), h, z + (rnd() - 0.5) * (d - s - 2), s, 1.5 + rnd() * 2.5, s, metal);
        }
      }
    }
  }

  /**
   * Resolves a vertical capsule-ish body (feet at p, radius r, height ht)
   * against the ground and building boxes. Fills out.ground / out.wall.
   */
  function collide(p, prevY, vel, r, ht, out) {
    if (p.y <= 0) {
      p.y = 0;
      if (vel.y < 0) vel.y = 0;
      out.ground = true;
    }
    for (const b of colliders) {
      if (p.x < b.min.x - r || p.x > b.max.x + r || p.z < b.min.z - r || p.z > b.max.z + r) continue;
      if (p.y >= b.max.y || p.y + ht <= b.min.y) continue;
      if (prevY >= b.max.y - 0.05) {
        p.y = b.max.y;
        if (vel.y < 0) vel.y = 0;
        out.ground = true;
        continue;
      }
      const dx1 = p.x - (b.min.x - r);
      const dx2 = b.max.x + r - p.x;
      const dz1 = p.z - (b.min.z - r);
      const dz2 = b.max.z + r - p.z;
      const m = Math.min(dx1, dx2, dz1, dz2);
      const n = new THREE.Vector3();
      if (m === dx1) { p.x = b.min.x - r; n.set(-1, 0, 0); }
      else if (m === dx2) { p.x = b.max.x + r; n.set(1, 0, 0); }
      else if (m === dz1) { p.z = b.min.z - r; n.set(0, 0, -1); }
      else { p.z = b.max.z + r; n.set(0, 0, 1); }
      const vn = vel.dot(n);
      if (vn < 0) vel.addScaledVector(n, -vn);
      out.wall = { box: b, normal: n };
    }
  }

  return { colliders, meshes, collide };
}
