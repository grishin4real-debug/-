import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { NEON } from './style.js';

/** Karaoke captions on a glass strip; the active word lights up as a neon tube. */
export const Captions = ({ words, wordStarts, voiceFrom, frames, side = 'left', neon = NEON.cyan }) => {
  const frame = useCurrentFrame() - voiceFrom;
  const { fps } = useVideoConfig();
  if (frame < 0 || frame > frames + 10) return null;
  let cur = wordStarts.findIndex((s, i) => frame >= s && (i === words.length - 1 || frame < wordStarts[i + 1]));
  if (cur < 0) cur = frame < wordStarts[0] ? 0 : words.length - 1;
  const chunkStart = Math.floor(cur / 3) * 3;
  const chunk = words.slice(chunkStart, chunkStart + 3);
  const chunkIn = spring({ frame: frame - wordStarts[chunkStart], fps, config: { damping: 14, stiffness: 200 } });

  return (
    <div
      style={{
        position: 'absolute', left: side === 'left' ? 360 : 40, right: side === 'left' ? 40 : 360, top: 1540,
        display: 'flex', flexWrap: 'wrap', gap: '4px 30px', justifyContent: 'center', alignItems: 'center',
        padding: '20px 22px', borderRadius: 34,
        background: 'linear-gradient(150deg, rgba(255,255,255,.13), rgba(255,255,255,.03))',
        border: '1.5px solid rgba(255,255,255,.22)',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.5), 0 0 24px ${neon}40, 0 24px 50px rgba(0,0,0,.45)`,
        transform: `translateY(${(1 - chunkIn) * 30}px) scale(${0.94 + chunkIn * 0.06})`,
      }}
    >
      {chunk.map((w, k) => {
        const i = chunkStart + k;
        const p = spring({ frame: frame - wordStarts[i], fps, config: { damping: 9, stiffness: 240 } });
        const active = i === cur;
        const shown = frame >= wordStarts[i];
        return (
          <span
            key={i}
            style={{
              fontFamily: 'Unbounded', fontWeight: 800, fontSize: 50, textTransform: 'uppercase', letterSpacing: 1,
              color: active ? '#fff' : 'rgba(255,255,255,.85)',
              opacity: shown ? 1 : 0.25,
              transform: `scale(${active ? 1 + 0.08 * p : 1}) translateY(${(1 - Math.min(1, p)) * 18}px)`,
              textShadow: active
                ? `0 0 4px #fff, 0 0 14px ${neon}, 0 0 34px ${neon}`
                : '0 3px 10px rgba(0,0,0,.6)',
              display: 'inline-block',
            }}
          >
            {w.replace(/[.,!?]/g, '')}
          </span>
        );
      })}
    </div>
  );
};
