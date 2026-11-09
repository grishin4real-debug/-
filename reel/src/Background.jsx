import { AbsoluteFill, useCurrentFrame, interpolate, random } from 'remotion';

const mix = (a, b, t) => {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
};

/** Glossy chrome sphere (SVG) with environment-style reflection band. */
const ChromeOrb = ({ id, x, y, r, blur = 0, tint = '#22e6ff', f, speed = 1, phase = 0 }) => {
  const dx = Math.sin(f / (90 / speed) + phase) * 40;
  const dy = Math.cos(f / (110 / speed) + phase) * 60;
  return (
    <svg
      width={r * 2 + 80} height={r * 2 + 80} viewBox={`${-r - 40} ${-r - 40} ${r * 2 + 80} ${r * 2 + 80}`}
      style={{ position: 'absolute', left: x - r - 40 + dx, top: y - r - 40 + dy, filter: `blur(${blur}px) drop-shadow(0 30px 40px rgba(0,0,0,.55))` }}
    >
      <defs>
        <radialGradient id={`o${id}`} cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.16" stopColor="#dfe7f2" />
          <stop offset="0.42" stopColor="#7d8aa0" />
          <stop offset="0.66" stopColor="#141a26" />
          <stop offset="0.86" stopColor="#3a4559" />
          <stop offset="1" stopColor="#aab9cf" />
        </radialGradient>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tint} stopOpacity="0" />
          <stop offset="0.5" stopColor={tint} stopOpacity="0.75" />
          <stop offset="1" stopColor={tint} stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle r={r} fill={`url(#o${id})`} />
      {/* horizon reflection band picks up the neon tint */}
      <ellipse cy={r * 0.38} rx={r * 0.9} ry={r * 0.16} fill={`url(#b${id})`} style={{ mixBlendMode: 'screen' }} />
      <ellipse cx={-r * 0.34} cy={-r * 0.42} rx={r * 0.22} ry={r * 0.12} fill="#fff" opacity="0.9" transform={`rotate(-30 ${-r * 0.34} ${-r * 0.42})`} />
    </svg>
  );
};

/** Chrome torus seen in perspective, slowly tumbling. */
const ChromeRing = ({ x, y, r, f, tint }) => (
  <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, perspective: 1400 }}>
    <svg
      width={r * 2} height={r * 2} viewBox="-110 -110 220 220"
      style={{ transform: `rotateX(${62 + Math.sin(f / 60) * 10}deg) rotateZ(${f * 0.6}deg)`, filter: 'drop-shadow(0 30px 30px rgba(0,0,0,.6))' }}
    >
      <defs>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.25" stopColor="#8d99ad" />
          <stop offset="0.5" stopColor="#151b27" />
          <stop offset="0.7" stopColor={tint} />
          <stop offset="0.85" stopColor="#e7eef8" />
          <stop offset="1" stopColor="#5d6a80" />
        </linearGradient>
      </defs>
      <circle r="88" fill="none" stroke="url(#ring)" strokeWidth="26" />
      <circle r="88" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="2" strokeDasharray="40 500" strokeDashoffset={-f * 4} />
    </svg>
  </div>
);

/**
 * Persistent backdrop: deep gradient, drifting aurora silk, neon halo arcs,
 * floating chrome objects with depth-of-field, bokeh dust, light sweep, grain.
 */
export const Background = ({ palettes, bounds }) => {
  const f = useCurrentFrame();
  let k = 0;
  while (k < bounds.length - 1 && f >= bounds[k + 1]) k++;
  const t = k < bounds.length - 1 ? interpolate(f, [bounds[k + 1] - 15, bounds[k + 1]], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const pal = palettes[k].map((c, i) => mix(c, palettes[Math.min(k + 1, palettes.length - 1)][i], t));
  // neon accent colour as hex for SVG
  const accent = palettes[k][0];

  const aurora = (i, c, x, y, w, h, rot) => (
    <div
      key={i}
      style={{
        position: 'absolute', left: x + Math.sin(f / 80 + i) * 120, top: y + Math.cos(f / 95 + i * 2) * 140, width: w, height: h,
        borderRadius: '50%', background: `radial-gradient(ellipse at center, ${c} 0%, transparent 70%)`,
        transform: `rotate(${rot + Math.sin(f / 120 + i) * 20}deg)`, opacity: 0.5,
      }}
    />
  );

  const sweep = ((f * 9) % 2600) - 700;

  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 35%, #15102b 0%, #07060f 55%, #020105 100%)', overflow: 'hidden' }}>
      {aurora(0, pal[0], -300, -100, 1300, 700, -20)}
      {aurora(1, pal[1], 200, 700, 1200, 800, 25)}
      {aurora(2, pal[2], -200, 1300, 1400, 700, -10)}

      {/* neon halo arcs behind the title area */}
      <svg width="1080" height="1920" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g fill="none" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${accent})` }}>
          <circle cx="540" cy="420" r="430" stroke={pal[0]} strokeWidth="4" strokeDasharray="700 2000" strokeDashoffset={-f * 6} opacity="0.85" />
          <circle cx="540" cy="420" r="470" stroke={pal[1]} strokeWidth="3" strokeDasharray="300 2600" strokeDashoffset={f * 8} opacity="0.75" />
          <path d={`M -50 ${1650 + Math.sin(f / 30) * 20} Q 540 ${1500 + Math.cos(f / 40) * 30} 1130 ${1680 + Math.sin(f / 35) * 20}`} stroke={pal[2]} strokeWidth="3" opacity="0.7" />
        </g>
      </svg>

      {/* neon floor grid */}
      <div style={{ position: 'absolute', left: -700, right: -700, bottom: -260, height: 900, perspective: 600, overflow: 'hidden', opacity: 0.55 }}>
        <div
          style={{
            position: 'absolute', inset: 0, transform: 'rotateX(74deg)', transformOrigin: '50% 100%',
            backgroundImage: `linear-gradient(${pal[0]} 2px, transparent 2px), linear-gradient(90deg, ${pal[0]} 2px, transparent 2px)`,
            backgroundSize: '140px 140px', backgroundPosition: `0 ${(f * 5) % 140}px`,
            maskImage: 'linear-gradient(to top, black 5%, transparent 75%)', WebkitMaskImage: 'linear-gradient(to top, black 5%, transparent 75%)',

          }}
        />
      </div>

      {/* chrome objects: far (blurred) → near (sharp) */}
      <ChromeOrb id="a" x={930} y={250} r={70} blur={3} tint={accent} f={f} speed={0.8} />
      <ChromeOrb id="b" x={120} y={1130} r={95} blur={6} tint={accent} f={f} phase={2} />
      <ChromeRing x={960} y={1420} r={170} f={f} tint={accent} />
      <ChromeOrb id="c" x={80} y={520} r={44} tint={accent} f={f} speed={1.4} phase={4} />

      {/* bokeh dust */}
      {Array.from({ length: 34 }, (_, i) => {
        const sp = 0.4 + random(`s${i}`) * 1.2;
        const y = (random(`y${i}`) * 2200 - f * sp * 2) % 2200;
        const yy = y < -100 ? y + 2200 : y;
        const sz = 4 + random(`z${i}`) * 16;
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: random(`x${i}`) * 1080 + Math.sin(f / 40 + i) * 20, top: yy, width: sz, height: sz, borderRadius: '50%',
              background: `radial-gradient(circle, ${i % 3 ? '#fff' : pal[i % 2]} 0%, transparent 70%)`, opacity: 0.2 + random(`o${i}`) * 0.4,

            }}
          />
        );
      })}

      {/* diagonal light sweep */}
      <div style={{ position: 'absolute', top: -400, left: sweep, width: 260, height: 2800, transform: 'rotate(24deg)', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.07), transparent)' }} />

      <svg width="1080" height="1920" style={{ position: 'absolute', inset: 0, opacity: 0.08, mixBlendMode: 'overlay' }}>
        <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(f / 2)} /></filter>
        <rect width="100%" height="100%" filter="url(#n)" />
      </svg>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 50%, rgba(0,0,0,.7) 100%)' }} />
    </AbsoluteFill>
  );
};
