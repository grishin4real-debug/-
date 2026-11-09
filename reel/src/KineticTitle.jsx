import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion';

// Alternating size multipliers so neighbouring letters differ in scale.
const SIZE = [1, 1.16, 0.9, 1.08, 0.95, 1.12];

const parse = (word) => {
  const hl = word.startsWith('*') && word.endsWith('*');
  return { text: hl ? word.slice(1, -1) : word, hl };
};

/**
 * Letter-by-letter title. Each glyph is two halves (top/bottom) that slide in
 * from opposite sides and fuse; on exit they slice apart again.
 */
export const KineticTitle = ({ lines, dur, delay = 0, size = 190, gap = 0.04, exitAt, y = 0 }) => {
  const frame = useCurrentFrame() - delay;
  const { fps } = useVideoConfig();
  const exitStart = exitAt ?? dur - 12;
  let idx = 0;

  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * gap }}>
      {lines.map((line, li) => {
        const words = line.map(parse);
        const chars = words.reduce((n, w) => n + w.text.length, 0) + words.length - 1;
        // Unbounded caps are ~1em wide; leave room for the largest size multiplier
        const fs = Math.min(size, 900 / (chars * 1.08));
        return (
          <div key={li} style={{ display: 'flex', gap: fs * 0.32, alignItems: 'flex-end', lineHeight: 0.92 }}>
            {words.map((w, wi) => (
              <div key={wi} style={{ display: 'flex' }}>
                {[...w.text].map((ch, ci) => {
                  const i = idx++;
                  const d = i * 1.7;
                  const s = spring({ frame: frame - d, fps, config: { damping: 12, stiffness: 170, mass: 0.7 } });
                  const out = interpolate(frame - exitStart - i * 0.6, [0, 9], [0, 1], {
                    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic),
                  });
                  const mult = SIZE[i % SIZE.length];
                  const cut = (1 - s) * 90 + out * 120; // horizontal slice offset
                  const rot = (1 - s) * (i % 2 ? -22 : 22);
                  const base = {
                    fontFamily: 'Unbounded', fontWeight: 900, fontSize: fs * mult,
                    color: w.hl ? '#FFE14D' : '#fff', whiteSpace: 'pre',
                    textShadow: w.hl
                      ? '0 5px 0 #E8590C, 0 10px 0 #9A2B05, 0 24px 40px rgba(0,0,0,.55)'
                      : '0 6px 0 rgba(0,0,0,.28), 0 22px 44px rgba(0,0,0,.55)',
                  };
                  const half = (top) => (
                    <span
                      style={{
                        ...base,
                        position: top ? 'relative' : 'absolute',
                        left: 0, top: 0,
                        display: 'block',
                        clipPath: top ? 'polygon(0 0,100% 0,100% 52%,0 58%)' : 'polygon(0 58%,100% 52%,100% 100%,0 100%)',
                        transform: `translateX(${(top ? -1 : 1) * cut}px) translateY(${(top ? -1 : 1) * out * 14}px)`,
                      }}
                    >
                      {ch}
                    </span>
                  );
                  return (
                    <span
                      key={ci}
                      style={{
                        position: 'relative', display: 'inline-block',
                        transform: `translateY(${(1 - s) * 140}px) rotate(${rot}deg) scale(${Math.max(0, s)})`,
                        opacity: Math.min(1, s * 2) * (1 - out),
                        transformOrigin: '50% 80%',
                      }}
                    >
                      {half(true)}
                      {half(false)}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
