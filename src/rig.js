import * as THREE from 'three';

// Head ellipsoid in head-group space; decals are projected onto it.
export const HEAD = { cy: 0.1, a: 0.1235, b: 0.1495, c: 0.1365 };

const geo = {
  sphere: new THREE.SphereGeometry(1, 28, 20),
  box: new THREE.BoxGeometry(1, 1, 1),
};
const capsCache = new Map();
function capsule(r, len) {
  const k = `${r.toFixed(4)}:${len}`;
  if (!capsCache.has(k)) capsCache.set(k, new THREE.CapsuleGeometry(r, len, 8, 24));
  return capsCache.get(k);
}

export const JOINTS = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'shL', 'elL', 'handL', 'shR', 'elR', 'handR',
  'thL', 'knL', 'anL', 'thR', 'knR', 'anR',
];

/**
 * Builds a jointed humanoid (~1.95 units tall at scale 1), facing +Z.
 * Character's left is +X. b = proportions, m = materials per body part.
 */
export function buildRig(m, b) {
  const J = {};
  const root = new THREE.Group();
  const add = (parent, name, x, y, z) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    J[name] = g;
    return g;
  };
  const mesh = (parent, g, mat, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]) => {
    const o = new THREE.Mesh(g, mat);
    o.position.set(...pos);
    o.scale.set(...scale);
    o.rotation.set(...rot);
    o.castShadow = true;
    parent.add(o);
    return o;
  };

  const body = add(root, 'body', 0, 1.0, 0);
  const hips = add(body, 'hips', 0, -0.02, 0);
  J.hipsBaseY = -0.02;
  mesh(hips, geo.sphere, m.pelvis, [0, 0, 0], [0.19 * b.w, 0.14, 0.14 * b.depth]);

  const spine = add(hips, 'spine', 0, 0.08, 0);
  mesh(spine, capsule(0.16, 0.12), m.abs, [0, 0.1, 0], [0.72 * b.depth, 1, 1.02 * b.w], [0, -Math.PI / 2, 0]);

  const chest = add(spine, 'chest', 0, 0.22, 0);
  // capsule UV u = 0.5 sits on +X; rotate so the texture centre faces forward (+Z).
  // Scale is applied before rotation, hence the width goes on local Z.
  J.torso = mesh(chest, capsule(0.2, 0.12), m.chest, [0, 0.1, 0], [0.78 * b.depth, 1, 1.2 * b.chest], [0, -Math.PI / 2, 0]);

  const neck = add(chest, 'neck', 0, 0.34, 0);
  mesh(neck, new THREE.CylinderGeometry(0.05 * b.neck, 0.065 * b.neck, 0.14, 16), m.neck, [0, 0.02, 0]);
  const head = add(neck, 'head', 0, 0.07, 0);
  head.scale.setScalar(b.head);
  // pole of the sphere points forward so webbing radiates from the face
  J.headMesh = mesh(head, geo.sphere, m.head, [0, HEAD.cy, 0], [HEAD.a, HEAD.c, HEAD.b], [Math.PI / 2, 0, 0]);

  for (const [S, side] of [['L', 1], ['R', -1]]) {
    const sh = add(chest, 'sh' + S, side * 0.26 * b.shoulder, 0.24, 0);
    mesh(sh, geo.sphere, m.shoulder, [0, -0.02, 0], [0.095 * b.arm, 0.085 * b.arm, 0.085 * b.arm]);
    mesh(sh, capsule(0.062 * b.arm, 0.2), m.upperArm, [0, -0.15, 0]);
    const el = add(sh, 'el' + S, 0, -0.3, 0);
    mesh(el, capsule(0.054 * b.arm, 0.18), m.forearm, [0, -0.13, 0]);
    const hand = add(el, 'hand' + S, 0, -0.28, 0);
    mesh(hand, geo.sphere, m.hand, [0, -0.04, 0], [0.045 * b.hand, 0.066 * b.hand, 0.032 * b.hand]);

    const th = add(hips, 'th' + S, side * 0.1 * b.w, -0.05, 0);
    mesh(th, capsule(0.085 * b.leg, 0.26), m.thigh, [0, -0.21, 0]);
    const kn = add(th, 'kn' + S, 0, -0.44, 0);
    mesh(kn, capsule(0.066 * b.leg, 0.28), m.shin, [0, -0.21, 0]);
    const an = add(kn, 'an' + S, 0, -0.44, 0);
    mesh(an, geo.box, m.foot, [0, -0.035, 0.05], [0.1 * b.leg, 0.07, 0.24]);
  }

  root.scale.setScalar(b.scale);
  return { root, J };
}

/** Shape drawn on the head surface. pts are [x, y] in head space. */
export function headDecal(pts, material, lift = 0.004) {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ShapeGeometry(shape);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const k = 1 - (x / HEAD.a) ** 2 - ((y - HEAD.cy) / HEAD.b) ** 2;
    pos.setZ(i, HEAD.c * Math.sqrt(Math.max(0, k)) + lift);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material);
  return m;
}

/** Outline points of a tilted, optionally pointed ellipse. */
export function eyeOutline({ cx, cy, rx, ry, tilt, point = 0.3, jag = 0, mirror = false, n = 48 }) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    let r = 1 + point * Math.max(0, Math.cos(t)) ** 6;
    if (jag) r *= 1 + jag * Math.max(0, -Math.sin(t)) * Math.sin(t * 9);
    let x = Math.cos(t) * rx * r;
    let y = Math.sin(t) * ry * r;
    const xr = x * Math.cos(tilt) - y * Math.sin(tilt);
    const yr = x * Math.sin(tilt) + y * Math.cos(tilt);
    pts.push([(cx + xr) * (mirror ? -1 : 1), cy + yr]);
  }
  if (mirror) pts.reverse();
  return pts;
}

const ZERO = [0, 0, 0];

export function applyPose(J, pose, k) {
  for (const n of JOINTS) {
    const t = pose[n] || ZERO;
    const r = J[n].rotation;
    r.x += (t[0] - r.x) * k;
    r.y += (t[1] - r.y) * k;
    r.z += (t[2] - r.z) * k;
  }
  const ty = J.hipsBaseY + (pose.hipsY || 0);
  J.hips.position.y += (ty - J.hips.position.y) * k;
}

/**
 * Procedural animation. Joint angles: negative X swings a limb forward,
 * positive knee X bends the shin back, +Z on the left arm raises it sideways.
 */
export function computePose(st, t, style) {
  const h = style.hunch;
  const p = {};
  const S = (n, x = 0, y = 0, z = 0) => { p[n] = [x, y, z]; };
  const br = Math.sin(t * 2.2) * 0.03;

  switch (st.mode) {
    case 'run': {
      const a = st.run ? 1 : 0.55;
      const s = Math.sin(st.phase);
      const c = Math.cos(st.phase);
      S('hips', 0, -s * 0.15 * a);
      S('spine', 0.12 * a + h * 0.25);
      S('chest', 0.05 + h * 0.15, s * 0.25 * a);
      S('neck', -0.1 * a - h * 0.35);
      S('thL', -s * 0.95 * a - h * 0.25, 0, 0.04 + h * 0.1);
      S('thR', s * 0.95 * a - h * 0.25, 0, -0.04 - h * 0.1);
      S('knL', 0.15 + Math.max(0, c) * 1.5 * a + h * 0.3);
      S('knR', 0.15 + Math.max(0, -c) * 1.5 * a + h * 0.3);
      S('anL', -0.1 + s * 0.3 * a);
      S('anR', -0.1 - s * 0.3 * a);
      S('shL', s * 0.9 * a, 0, 0.12 + h * 0.35);
      S('shR', -s * 0.9 * a, 0, -0.12 - h * 0.35);
      S('elL', -0.5 - a * 0.7 - h * 0.2);
      S('elR', -0.5 - a * 0.7 - h * 0.2);
      p.hipsY = -0.05 * a + Math.abs(c) * 0.05 * a - h * 0.12;
      break;
    }
    case 'air': {
      if (st.vy > 1) {
        S('spine', 0.3);
        S('thL', -1.3, 0, 0.15);
        S('thR', -1.1, 0, -0.15);
        S('knL', 1.9);
        S('knR', 1.6);
        S('shL', -0.5, 0, 0.9);
        S('shR', -0.5, 0, -0.9);
        S('elL', -0.8);
        S('elR', -0.8);
      } else {
        S('spine', -0.1 + h * 0.2);
        S('neck', -0.2);
        S('thL', -0.4, 0, 0.25);
        S('thR', 0.1, 0, -0.25);
        S('knL', 0.9);
        S('knR', 0.6);
        S('shL', -0.3, 0, 1.5 + br);
        S('shR', -0.3, 0, -1.5 - br);
        S('elL', -0.3);
        S('elR', -0.3);
      }
      break;
    }
    case 'swing': {
      const L = st.hand === 'L';
      const sw = Math.sin(st.phase) * 0.35;
      S(L ? 'shL' : 'shR', -2.95, 0, L ? 0.1 : -0.1);
      S(L ? 'elL' : 'elR', -0.05);
      S(L ? 'shR' : 'shL', -0.4, 0, L ? -1.2 : 1.2);
      S(L ? 'elR' : 'elL', -1.0);
      S('thL', -0.7 + sw, 0, 0.05);
      S('thR', -0.35 + sw, 0, -0.05);
      S('knL', 1.3);
      S('knR', 0.7);
      S('spine', 0.1);
      S('neck', -0.3);
      break;
    }
    case 'climb': {
      const s = Math.sin(st.phase);
      S('shL', -2.5 + s * 0.5, 0, 0.5);
      S('shR', -2.5 - s * 0.5, 0, -0.5);
      S('elL', -0.9 - s * 0.3);
      S('elR', -0.9 + s * 0.3);
      S('thL', -1.1 - s * 0.4, 0, 0.5);
      S('thR', -1.1 + s * 0.4, 0, -0.5);
      S('knL', 1.8);
      S('knR', 1.8);
      S('anL', 0.4);
      S('anR', 0.4);
      S('spine', 0.25);
      S('neck', -0.5);
      p.hipsY = -0.15;
      break;
    }
    case 'land': {
      // "superhero landing"
      S('spine', 0.5);
      S('chest', 0.15);
      S('neck', -0.6);
      S('thL', -1.5, 0, 0.15);
      S('knL', 1.5);
      S('thR', 0.15, 0, -0.1);
      S('knR', 1.55);
      S('anR', 0.4);
      S('shR', -0.45, 0, -0.1);
      S('elR', -0.1);
      S('shL', 0.6, 0, 0.9);
      S('elL', -0.3);
      p.hipsY = -0.46;
      break;
    }
    case 'attack': {
      const k = Math.sin(Math.PI * Math.min(1, st.attackT));
      if (style.venom) {
        S('spine', 0.25 - 0.45 * k);
        S('chest', -0.25 * k);
        S('neck', -0.25 - 0.4 * k);
        S('shL', -0.8, 0, 0.6 + 0.9 * k);
        S('shR', -0.8, 0, -0.6 - 0.9 * k);
        S('elL', -1.2 + 0.6 * k);
        S('elR', -1.2 + 0.6 * k);
        S('thL', -0.35, 0, 0.3);
        S('thR', -0.35, 0, -0.3);
        S('knL', 0.8);
        S('knR', 0.8);
        S('anL', -0.45);
        S('anR', -0.45);
        p.hipsY = -0.16;
      } else if (st.attackKind === 2) {
        S('thR', -1.7 * k, 0, -0.1);
        S('knR', 0.2);
        S('anR', 0.3);
        S('spine', -0.25 * k);
        S('thL', 0.1);
        S('knL', 0.25);
        S('shL', -0.3, 0, 1.0);
        S('shR', -0.3, 0, -1.0);
        S('elL', -0.6);
        S('elR', -0.6);
      } else {
        const R = st.attackKind === 0;
        const sign = R ? -1 : 1;
        S(R ? 'shR' : 'shL', -1.55 * k, 0, 0.1 * sign);
        S(R ? 'elR' : 'elL', -1.6 * (1 - k) - 0.1);
        S(R ? 'shL' : 'shR', -0.5, 0, -0.3 * sign);
        S(R ? 'elL' : 'elR', -1.8);
        S('chest', 0.1, 0.6 * k * sign);
        S('hips', 0, 0.2 * k * sign);
        S('thL', -0.4, 0, 0.1);
        S('knL', 0.5);
        S('thR', 0.2, 0, -0.1);
        S('knR', 0.3);
        p.hipsY = -0.08;
      }
      break;
    }
    default: {
      // idle
      S('spine', 0.05 + h * 0.3 + br);
      S('chest', 0.02 + h * 0.25 - br);
      S('neck', -h * 0.5);
      S('shL', 0.05, 0, 0.12 + h * 0.35 + br);
      S('shR', 0.05, 0, -0.12 - h * 0.35 - br);
      S('elL', -0.2 - h * 0.5);
      S('elR', -0.2 - h * 0.5);
      S('thL', -0.05 - h * 0.35, 0, 0.06 + h * 0.1);
      S('thR', -0.05 - h * 0.35, 0, -0.06 - h * 0.1);
      S('knL', 0.1 + h * 0.6);
      S('knR', 0.1 + h * 0.6);
      S('anL', -0.05 - h * 0.25);
      S('anR', -0.05 - h * 0.25);
      p.hipsY = -h * 0.12;
    }
  }

  // web shot overrides the right arm in any state
  if (st.shootT > 0) {
    S('shR', -1.55, 0, 0.05);
    S('elR', 0);
    S('handR', 0, 0, 0.3);
  }
  return p;
}
