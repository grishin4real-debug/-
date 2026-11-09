import { OffthreadVideo, Sequence, Html5Audio, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from 'remotion';

const SRC_W = 1280;
const SRC_H = 720;

/** Piecewise ease-in-out interpolation over keyframes [{t, ...fields}]. */
export const track = (keys, t, field) => {
  if (t <= keys[0].t) return keys[0][field];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b.t) {
      const u = Easing.inOut(Easing.cubic)((t - a.t) / (b.t - a.t));
      return a[field] + (b[field] - a[field]) * u;
    }
  }
  return keys[keys.length - 1][field];
};

export const Cursor = ({ x, y, press }) => (
  <svg
    width="78" height="78" viewBox="0 0 24 24"
    style={{ position: 'absolute', left: x - 8, top: y - 5, transform: `scale(${1 - press * 0.22})`, transformOrigin: '8px 5px', filter: 'drop-shadow(0 8px 14px rgba(0,0,0,.45))' }}
  >
    <path d="M5 3l14 8.2-6.1 1.4 3.6 6.6-2.6 1.4-3.6-6.6L5.7 18z" fill="#fff" stroke="#000" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

export const Ripple = ({ x, y, age }) => {
  if (age < 0 || age > 18) return null;
  const k = age / 18;
  return (
    <div
      style={{
        position: 'absolute', left: x - 70, top: y - 70, width: 140, height: 140, borderRadius: '50%',
        border: `${8 * (1 - k) + 2}px solid #FFE14D`, transform: `scale(${0.2 + k * 1.2})`, opacity: 1 - k,
        boxShadow: '0 0 30px rgba(255,225,77,.7)',
      }}
    />
  );
};

/**
 * Screen recording in a floating window with a virtual camera.
 * cam: [{t, x, y, s}] — focus point in source px and absolute scale.
 * cursor: [{t, x, y}] in source px; clicks: [{t, x, y}].
 */
export const ScreenCam = ({ src, cam, cursor, clicks = [], top = 640, w = 1000, h = 800, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = Math.max(0, (frame - delay) / fps);

  const s = track(cam, t, 's');
  let tx = w / 2 - track(cam, t, 'x') * s;
  let ty = h / 2 - track(cam, t, 'y') * s;
  tx = Math.min(0, Math.max(w - SRC_W * s, tx));
  ty = Math.min(0, Math.max(h - SRC_H * s, ty));

  const enter = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } });
  const tiltX = Math.sin(frame / 40) * 3 + (1 - enter) * 30;
  const tiltY = Math.cos(frame / 55) * 4;

  const toScreen = (x, y) => [x * s + tx, y * s + ty];
  let cur = null;
  if (cursor) {
    const [cx, cy] = toScreen(track(cursor, t, 'x'), track(cursor, t, 'y'));
    const press = clicks.reduce((p, c) => {
      const d = (t - c.t) * fps;
      return d >= -3 && d <= 6 ? Math.max(p, 1 - Math.abs(d) / 6) : p;
    }, 0);
    cur = <Cursor x={cx} y={cy} press={press} />;
  }

  return (
    <div style={{ position: 'absolute', left: (1080 - w) / 2, top, width: w, height: h, perspective: 1600 }}>
      <div
        style={{
          position: 'absolute', inset: 0,
          transform: `translateY(${(1 - enter) * 500}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${0.85 + enter * 0.15})`,
          opacity: enter,
        }}
      >
        {/* glow */}
        <div style={{ position: 'absolute', inset: -30, borderRadius: 70, background: 'radial-gradient(closest-side, rgba(255,60,90,.35), transparent)', filter: 'blur(30px)' }} />
        <div
          style={{
            position: 'absolute', inset: 0, borderRadius: 44, overflow: 'hidden', background: '#fff',
            boxShadow: '0 50px 120px rgba(0,0,0,.6), 0 0 0 2px rgba(255,255,255,.18), inset 0 0 0 1px rgba(255,255,255,.4)',
          }}
        >
          <div style={{ position: 'absolute', left: tx, top: ty, width: SRC_W, height: SRC_H, transform: `scale(${s})`, transformOrigin: '0 0' }}>
            <OffthreadVideo src={staticFile(src)} muted style={{ width: SRC_W, height: SRC_H }} />
          </div>
          {clicks.map((c, i) => {
            const [x, y] = toScreen(c.x, c.y);
            return <Ripple key={i} x={x} y={y} age={(t - c.t) * fps} />;
          })}
          {cur}
        </div>
      </div>
      {clicks.map((c, i) => (
        <Sequence key={i} from={Math.round(delay + c.t * fps)} durationInFrames={10} layout="none">
          <Html5Audio src={staticFile('sfx/click.wav')} volume={0.5} />
        </Sequence>
      ))}
    </div>
  );
};
