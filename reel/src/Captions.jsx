import { useCurrentFrame, useVideoConfig, spring } from 'remotion';

/** Karaoke captions driven by per-word start frames from voice.py. */
export const Captions = ({ words, wordStarts, voiceFrom, frames, side = 'left' }) => {
  const frame = useCurrentFrame() - voiceFrom;
  const { fps } = useVideoConfig();
  if (frame < 0 || frame > frames + 10) return null;
  let cur = wordStarts.findIndex((s, i) => frame >= s && (i === words.length - 1 || frame < wordStarts[i + 1]));
  if (cur < 0) cur = frame < wordStarts[0] ? 0 : words.length - 1;
  const chunkStart = Math.floor(cur / 3) * 3;
  const chunk = words.slice(chunkStart, chunkStart + 3);

  return (
    <div style={{ position: 'absolute', left: side === 'left' ? 380 : 40, right: side === 'left' ? 40 : 380, top: 1530, display: 'flex', flexWrap: 'wrap', gap: '6px 26px', justifyContent: 'center' }}>
      {chunk.map((w, k) => {
        const i = chunkStart + k;
        const p = spring({ frame: frame - wordStarts[i], fps, config: { damping: 9, stiffness: 240 } });
        const active = i === cur;
        const shown = frame >= wordStarts[i];
        return (
          <span
            key={i}
            style={{
              fontFamily: 'Unbounded', fontWeight: 900, fontSize: 58, textTransform: 'uppercase',
              color: active ? '#111' : '#fff',
              background: active ? '#FFE14D' : 'transparent',
              padding: '2px 14px 6px', borderRadius: 14,
              opacity: shown ? 1 : 0,
              transform: `scale(${active ? 1 + 0.12 * p : 1}) rotate(${active ? (1 - p) * -6 : 0}deg) translateY(${(1 - Math.min(1, p)) * 26}px)`,
              textShadow: active ? 'none' : '0 4px 0 rgba(0,0,0,.6), 0 12px 30px rgba(0,0,0,.7)',
              boxShadow: active ? '0 8px 0 #C2410C, 0 16px 30px rgba(0,0,0,.4)' : 'none',
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
