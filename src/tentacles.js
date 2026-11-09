import * as THREE from 'three';

const easeOut = (x) => 1 - (1 - x) ** 3;
const easeIn = (x) => x * x;
const tmpQ = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

/** Symbiote tendrils sprouting from the back; can lash out at world-space targets. */
export class Tentacles {
  constructor(scene, material, { count = 6, segs = 16, radius = 0.075 } = {}) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.radius = radius;
    this.segs = segs;
    this.idleLen = 0.9;
    this.extend = 0;
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true);
    const sph = new THREE.SphereGeometry(1, 12, 8);
    this.list = [];
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? 1 : -1;
      const row = Math.floor(i / 2);
      const base = new THREE.Vector3(side * (0.08 + row * 0.04), 0.26 - row * 0.12, -0.13);
      const dir = new THREE.Vector3(side * (0.85 - row * 0.15), 0.6 - row * 0.45, -0.7).normalize();
      const segMeshes = [];
      const joints = [];
      for (let s = 0; s < segs; s++) {
        const m = new THREE.Mesh(cyl, material);
        m.castShadow = true;
        const j = new THREE.Mesh(sph, material);
        this.group.add(m, j);
        segMeshes.push(m);
        joints.push(j);
      }
      this.list.push({ base, dir, segMeshes, joints, phase: i * 1.7, strike: null });
    }
    this.pts = Array.from({ length: segs + 1 }, () => new THREE.Vector3());
    this._v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  }

  /** Lash a free tendril at target; onReach fires at full extension. */
  strike(target, { dur = 0.4, onReach = null, prefer = -1 } = {}) {
    let tt = prefer >= 0 && !this.list[prefer].strike ? this.list[prefer] : this.list.find((x) => !x.strike);
    if (!tt) tt = this.list[Math.floor(Math.random() * this.list.length)];
    tt.strike = { target: target.clone(), t: 0, dur, onReach, fired: false };
  }

  update(chest, t, dt, visible, scale) {
    this.group.visible = visible;
    if (!visible) return;
    chest.updateWorldMatrix(true, false);
    chest.getWorldQuaternion(tmpQ);
    const [P0, D, end, C, tmp] = this._v;
    const N = this.segs;
    for (const tt of this.list) {
      P0.copy(tt.base).applyMatrix4(chest.matrixWorld);
      D.copy(tt.dir).applyQuaternion(tmpQ);
      const len = this.idleLen * scale;
      end.copy(P0).addScaledVector(D, len);
      end.x += Math.sin(t * 2.3 + tt.phase) * 0.3 * len;
      end.y += Math.cos(t * 1.7 + tt.phase * 1.3) * 0.3 * len;
      end.z += Math.sin(t * 1.9 + tt.phase * 0.7) * 0.3 * len;
      if (tt.strike) {
        const s = tt.strike;
        s.t += dt / s.dur;
        const e = s.t < 0.5 ? easeOut(s.t * 2) : 1 - easeIn((s.t - 0.5) * 2);
        end.lerp(s.target, Math.max(0, e));
        if (!s.fired && s.t >= 0.5) {
          s.fired = true;
          s.onReach?.();
        }
        if (s.t >= 1) tt.strike = null;
      }
      const dist = end.distanceTo(P0);
      C.copy(P0).addScaledVector(D, dist * 0.5);
      C.y += Math.sin(t * 3 + tt.phase) * dist * 0.15;
      tmp.crossVectors(D, UP).normalize();
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const a = (1 - u) * (1 - u);
        const b = 2 * u * (1 - u);
        const c = u * u;
        const p = this.pts[i];
        p.set(a * P0.x + b * C.x + c * end.x, a * P0.y + b * C.y + c * end.y, a * P0.z + b * C.z + c * end.z);
        p.addScaledVector(tmp, Math.sin(u * Math.PI) * Math.sin(t * 8 + u * 10 + tt.phase) * 0.06 * scale);
      }
      for (let i = 0; i < N; i++) {
        const a = this.pts[i];
        const b = this.pts[i + 1];
        const r = this.radius * scale * (1 - (i / N) * 0.8);
        const m = tt.segMeshes[i];
        m.position.addVectors(a, b).multiplyScalar(0.5);
        const d = tmp.subVectors(b, a);
        const l = d.length() || 1e-4;
        m.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / l));
        m.scale.set(r, l, r);
        const j = tt.joints[i];
        j.position.copy(a);
        j.scale.setScalar(r);
      }
      tmp.crossVectors(D, UP).normalize();
    }
  }
}
