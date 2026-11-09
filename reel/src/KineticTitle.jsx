import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing, random } from 'remotion';
import { NEON, chromeFill, chromeShadow, neonText } from './style.js';

// Alternating size multipliers so neighbouring letters differ in scale.
const SIZE = [1, 1.16, 0.9, 1.08, 0.95, 1.12];

const parse = (word) => {
  const hl = word.startsWith('*') && word.endsWith('*');
  return { text: hl ? word.slice(1, -1) : word, hl };
};

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

/**
 * Per-letter kinetic title.
 * fx: 'slice' — halves slide in from opposite sides and fuse
 *     'drop'  — letters fall in with squash & stretch
 *     'zoom'  — letters fly in from the camera, blurred
 *     'glitch'— RGB-split jitter that settles
 *     'wave'  — rise from below on a sine wave
 * Every letter keeps a subtle idle wobble. Plain words are liquid chrome with a neon rim;
 * highlighted words (*word*) are neon tubes that flicker on.
 * Exit always slices letters apart.
 */
export const KineticTitle = ({ lines, dur, delay = 0, size = 190, gap = 0.04, exitAt, y = 0, fx = 'slice', stagger = 1.7, color = 'chrome', neon = NEON.pink, charW = 1.08 }) => {
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
        const fs = Math.min(size, 900 / (chars * charW));
        return (
          <div key={li} style={{ display: 'flex', gap: fs * 0.32, alignItems: 'flex-end', lineHeight: 0.92 }}>
            {words.map((w, wi) => (
              // one filter per word instead of per letter: much cheaper to rasterise
              <div key={wi} style={{ display: 'flex', filter: w.hl ? 'drop-shadow(0 18px 24px rgba(0,0,0,.55))' : chromeShadow(neon) }}>
                {[...w.text].map((ch, ci) => {
                  const i = idx++;
                  const local = frame - i * stagger;
                  const soft = spring({ frame: local, fps, config: { damping: 12, stiffness: 170, mass: 0.7 } });
                  const bouncy = spring({ frame: local, fps, config: { damping: 7, stiffness: 200, mass: 0.6 } });
                  const out = interpolate(frame - exitStart - i * 0.6, [0, 9], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
                  const mult = SIZE[i % SIZE.length];
                  const settled = Math.min(1, Math.max(0, local / 20));
                  // idle life after entry
                  const wob = Math.sin((frame + i * 9) / 11) * 4 * settled;
                  const tilt = Math.sin((frame + i * 13) / 17) * 3 * settled;

                  let tx = 0, ty = 0, rot = 0, sc = 1, sx = 1, sy = 1, blur = 0, op = 1, cut = 0, split = 0;
                  if (fx === 'slice') {
                    ty = (1 - soft) * 140; rot = (1 - soft) * (i % 2 ? -22 : 22); sc = Math.max(0, soft); cut = (1 - soft) * 90; op = Math.min(1, soft * 2);
                  } else if (fx === 'drop') {
                    ty = (1 - bouncy) * -700;
                    const impact = interpolate(local, [8, 11, 18], [0, 1, 0], clamp);
                    sx = 1 + impact * 0.35; sy = 1 - impact * 0.3; op = local > 0 ? 1 : 0;
                  } else if (fx === 'zoom') {
                    sc = interpolate(soft, [0, 1], [7, 1]); blur = (1 - soft) * 24; op = Math.min(1, soft * 1.5);
                    rot = (1 - soft) * (random(`r${i}`) - 0.5) * 80;
                  } else if (fx === 'glitch') {
                    const g = interpolate(local, [0, 16], [1, 0], clamp);
                    tx = (random(`gx${i}${Math.floor(frame / 2)}`) - 0.5) * 70 * g;
                    split = 14 * g + 2 * settled * (Math.floor(frame / 3 + i) % 9 === 0 ? 1 : 0);
                    op = local > 0 ? 1 : 0; sc = 0.6 + 0.4 * soft;
                  } else if (fx === 'wave') {
                    ty = (1 - soft) * 260 + Math.sin(local / 3) * 30 * (1 - soft); op = Math.min(1, soft * 2); sc = 0.5 + 0.5 * soft;
                  }
                  cut += out * 120;

                  // neon tubes flicker on before settling
                  const flick = w.hl && local < 14 ? (random(`f${i}${Math.floor(local)}`) > 0.45 ? 1 : 0.25) : 1;
                  const hum = 0.92 + Math.sin(frame / 3 + i) * 0.08;
                  const sweep = ((frame * 2.4 - i * 7) % 240) - 60;
                  const fill = w.hl ? neonText(neon, hum) : color === 'chrome' ? chromeFill(sweep) : { color };
                  const base = { fontFamily: 'Dela', fontSize: fs * mult, whiteSpace: 'pre', ...fill };
                  const half = (top) => (
                    <span
                      style={{
                        ...base, position: top ? 'relative' : 'absolute', left: 0, top: 0, display: 'block',
                        // halves overshoot the glyph box so diacritics (Й, Ё) and descenders are not clipped
                        clipPath: top ? 'polygon(-30% -60%,130% -60%,130% 52%,-30% 58%)' : 'polygon(-30% 58%,130% 52%,130% 160%,-30% 160%)',
                        transform: `translateX(${(top ? -1 : 1) * cut}px) translateY(${(top ? -1 : 1) * out * 14}px)`,
                      }}
                    >
                      {ch}
                    </span>
                  );
                  const ghost = (c, dx) => (
                    <span style={{ ...base, color: c, backgroundImage: 'none', WebkitTextStroke: 0, textShadow: 'none', position: 'absolute', left: dx, top: 0, mixBlendMode: 'screen', opacity: 0.85 }}>{ch}</span>
                  );
                  return (
                    <span
                      key={ci}
                      style={{
                        position: 'relative', display: 'inline-block', filter: blur > 0.3 ? `blur(${blur}px)` : 'none',
                        transform: `translate(${tx}px, ${ty + wob}px) rotate(${rot + tilt}deg) scale(${sc}) scaleX(${sx}) scaleY(${sy})`,
                        opacity: op * (1 - out) * flick, transformOrigin: '50% 90%',
                      }}
                    >
                      {split > 0.5 && ghost(NEON.pink, -split)}
                      {split > 0.5 && ghost(NEON.cyan, split)}
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

/** Rolling number counter (slot-machine digits), chrome or neon. */
export const Counter = ({ from, to, start, len, size = 300, prefix = '', neon = NEON.pink, tube = false }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [start, start + len], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const v = Math.round(from + (to - from) * t);
  const done = frame >= start + len;
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - start - len, fps, config: { damping: 6, stiffness: 260 } });
  const sweep = ((frame * 2.4) % 240) - 60;
  return (
    <div
      style={{
        fontFamily: 'Dela', fontSize: size, lineHeight: 1, ...(tube ? neonText(neon, 1.2) : chromeFill(sweep)),
        transform: `scale(${done ? 1 + (1 - pop) * 0.6 : 1}) rotate(${done ? (1 - pop) * -8 : Math.sin(frame) * 2}deg)`,
        filter: tube ? 'drop-shadow(0 20px 30px rgba(0,0,0,.5))' : chromeShadow(neon),
      }}
    >
      {prefix}{v}
    </div>
  );
};
