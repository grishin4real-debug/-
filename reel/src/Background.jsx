import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

const mix = (a, b, t) => {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
};

/** Persistent animated backdrop: drifting colour blobs, moving perspective grid, grain, vignette. */
export const Background = ({ palettes, bounds }) => {
  const f = useCurrentFrame();
  // pick palette by scene, crossfading over 15 frames at each boundary
  let k = 0;
  while (k < bounds.length - 1 && f >= bounds[k + 1]) k++;
  const t = k < bounds.length - 1 ? interpolate(f, [bounds[k + 1] - 15, bounds[k + 1]], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const pal = palettes[k].map((c, i) => mix(c, palettes[Math.min(k + 1, palettes.length - 1)][i], t));

  const blob = (i, c, x, y, r) => {
    const dx = Math.sin(f / 70 + i * 2.1) * 140;
    const dy = Math.cos(f / 85 + i * 1.3) * 180;
    return (
      <div
        key={i}
        style={{
          position: 'absolute', left: x + dx - r, top: y + dy - r, width: r * 2, height: r * 2, borderRadius: '50%',
          background: `radial-gradient(circle, ${c} 0%, transparent 68%)`, opacity: 0.85,
        }}
      />
    );
  };

  return (
    <AbsoluteFill style={{ background: '#06060B', overflow: 'hidden' }}>
      {blob(0, pal[0], 180, 380, 620)}
      {blob(1, pal[1], 950, 900, 700)}
      {blob(2, pal[2], 300, 1600, 650)}

      {/* perspective floor grid */}
      <div style={{ position: 'absolute', left: -600, right: -600, bottom: -200, height: 1100, perspective: 700, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute', inset: 0,
            transform: 'rotateX(72deg)', transformOrigin: '50% 100%',
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.13) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,.13) 2px, transparent 2px)',
            backgroundSize: '120px 120px',
            backgroundPosition: `0 ${(f * 4) % 120}px`,
            maskImage: 'linear-gradient(to top, black 10%, transparent 85%)',
            WebkitMaskImage: 'linear-gradient(to top, black 10%, transparent 85%)',
          }}
        />
      </div>

      {/* giant outlined marquee word for depth */}
      <div
        style={{
          position: 'absolute', top: 1180, left: 0, whiteSpace: 'nowrap',
          fontFamily: 'Unbounded', fontWeight: 900, fontSize: 330, letterSpacing: -6,
          color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,.07)',
          transform: `translateX(${-((f * 3) % 2200)}px)`,
        }}
      >
        HOPLITE HOPLITE HOPLITE HOPLITE
      </div>

      {/* grain */}
      <svg width="1080" height="1920" style={{ position: 'absolute', inset: 0, opacity: 0.09, mixBlendMode: 'overlay' }}>
        <filter id="n">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(f / 2)} />
        </filter>
        <rect width="100%" height="100%" filter="url(#n)" />
      </svg>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,.75) 100%)' }} />
    </AbsoluteFill>
  );
};
