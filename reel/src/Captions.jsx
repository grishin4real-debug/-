import { useCurrentFrame, useVideoConfig, spring } from 'remotion';

/**
 * Karaoke captions: words are spread over the voice length proportionally to their size;
 * shows a 3-word window and pops the active word.
 */
export const Captions = ({ say, voiceFrom, frames }) => {
  const frame = useCurrentFrame() - voiceFrom;
  const { fps } = useVideoConfig();
  if (frame < 0 || frame > frames + 10) return null;
  const words = say.replace(/—/g, '').split(/\s+/).filter(Boolean);
  const weights = words.map((w) => w.length + 2);
  const sum = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const starts = weights.map((w) => { const s = (acc / sum) * frames; acc += w; return s; });
  let cur = starts.findIndex((s, i) => frame >= s && (i === words.length - 1 || frame < starts[i + 1]));
  if (cur < 0) cur = words.length - 1;
  const chunkStart = Math.floor(cur / 3) * 3;
  const chunk = words.slice(chunkStart, chunkStart + 3);

  return (
    <div style={{ position: 'absolute', left: 330, right: 40, top: 1540, display: 'flex', flexWrap: 'wrap', gap: '6px 30px', justifyContent: 'center' }}>
      {chunk.map((w, k) => {
        const i = chunkStart + k;
        const p = spring({ frame: frame - starts[i], fps, config: { damping: 10, stiffness: 220 } });
        const active = i === cur;
        return (
          <span
            key={i}
            style={{
              fontFamily: 'Unbounded', fontWeight: 800, fontSize: 52, textTransform: 'uppercase',
              color: active ? '#FFE14D' : '#fff',
              opacity: frame >= starts[i] ? 1 : 0.0,
              transform: `scale(${active ? 1 + 0.18 * p : 1}) translateY(${(1 - Math.min(1, p)) * 20}px)`,
              textShadow: '0 4px 0 rgba(0,0,0,.6), 0 12px 30px rgba(0,0,0,.7)',
              display: 'inline-block',
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};
