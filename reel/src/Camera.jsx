import { AbsoluteFill, Easing, useCurrentFrame } from 'remotion';

const EASE = {
  smooth: Easing.inOut(Easing.cubic),
  // fast whip with a soft landing
  snap: Easing.bezier(0.8, 0, 0.12, 1),
};
const FIELDS = ['x', 'y', 's', 'r', 'rx', 'ry'];
export const WIDE = { x: 540, y: 960, s: 1, r: 0, rx: 0, ry: 0 };

/**
 * Camera keyframes: [{ f, x, y, s, r, rx, ry, ease }] — (x, y) is the canvas point
 * brought to the screen centre, s zoom, r roll, rx/ry 3D tilt. `ease` shapes the move
 * that arrives at that key.
 */
export const evalCam = (keys, f) => {
  const ks = [...keys].sort((a, b) => a.f - b.f);
  let a = ks[0];
  let b = ks[0];
  for (let i = 0; i < ks.length; i++) {
    if (ks[i].f <= f) a = ks[i];
    if (ks[i].f >= f) { b = ks[i]; break; }
    b = ks[i];
  }
  const span = b.f - a.f;
  const u = span > 0 ? (EASE[b.ease] || EASE.smooth)(Math.min(1, Math.max(0, (f - a.f) / span))) : 1;
  const c = {};
  for (const k of FIELDS) c[k] = (a[k] ?? WIDE[k]) + ((b[k] ?? WIDE[k]) - (a[k] ?? WIDE[k])) * u;
  // handheld drift
  c.x += Math.sin(f / 23) * 5 + Math.sin(f / 7.3) * 1.2;
  c.y += Math.cos(f / 19) * 5 + Math.cos(f / 8.1) * 1.2;
  c.r += Math.sin(f / 31) * 0.4;
  return c;
};

/** Moves its children through the camera; adds motion blur on fast moves. */
export const CameraRig = ({ keys, children }) => {
  const f = useCurrentFrame();
  const c = evalCam(keys, f);
  const p = evalCam(keys, f - 1);
  const speed = Math.hypot((c.x - p.x) * c.s, (c.y - p.y) * c.s) + Math.abs(c.s - p.s) * 900 + Math.abs(c.r - p.r) * 25;
  const blur = Math.min(7, Math.max(0, (speed - 10) * 0.12));
  return (
    <AbsoluteFill style={{ perspective: 1700 }}>
      <AbsoluteFill
        style={{
          transformOrigin: '0 0',
          transform: `translate(540px, 960px) rotateX(${c.rx}deg) rotateY(${c.ry}deg) rotate(${c.r}deg) scale(${c.s}) translate(${-c.x}px, ${-c.y}px)`,
          filter: blur > 0.4 ? `blur(${blur.toFixed(2)}px)` : undefined,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Background follows the camera at a fraction of its motion (parallax). */
export const Parallax = ({ cam, children }) => (
  <AbsoluteFill style={{ overflow: 'hidden', background: '#020105' }}>
    <AbsoluteFill
      style={{
        transform: `translate(${-(cam.x - 540) * 0.12}px, ${-(cam.y - 960) * 0.12}px) scale(${1.16 + (cam.s - 1) * 0.3}) rotate(${cam.r * 0.4}deg)`,
      }}
    >
      {children}
    </AbsoluteFill>
  </AbsoluteFill>
);
