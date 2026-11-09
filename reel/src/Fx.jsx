import { useCurrentFrame, useVideoConfig, interpolate, random } from 'remotion';

/** Deterministic confetti burst starting at `at` (frames). */
export const Confetti = ({ at, x = 540, y = 900, n = 70, power = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame - at) / fps;
  if (t < 0 || t > 2.2) return null;
  const cols = ['#FFE14D', '#FF3D71', '#22C55E', '#38BDF8', '#A855F7', '#fff'];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Array.from({ length: n }, (_, i) => {
        const a = random(`a${i}`) * Math.PI * 2;
        const v = (600 + random(`v${i}`) * 1100) * power;
        const px = x + Math.cos(a) * v * t;
        const py = y + Math.sin(a) * v * t * 0.8 + 1400 * t * t;
        const w = 14 + random(`w${i}`) * 18;
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: px, top: py, width: w, height: w * 0.45, background: cols[i % cols.length], borderRadius: 3,
              transform: `rotate(${t * 900 * (random(`r${i}`) - 0.5)}deg) rotateX(${t * 700}deg)`,
              opacity: interpolate(t, [1.6, 2.2], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          />
        );
      })}
    </div>
  );
};

/** Camera shake wrapper for impacts. */
export const Shake = ({ at = [], children }) => {
  const frame = useCurrentFrame();
  let amp = 0;
  for (const a of at) {
    const d = frame - a;
    if (d >= 0 && d < 14) amp = Math.max(amp, (1 - d / 14) * 26);
  }
  const x = Math.sin(frame * 2.3) * amp;
  const y = Math.cos(frame * 3.1) * amp;
  return <div style={{ position: 'absolute', inset: 0, transform: `translate(${x}px, ${y}px) rotate(${x * 0.05}deg)` }}>{children}</div>;
};
