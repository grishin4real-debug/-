import { useCurrentFrame, useVideoConfig, spring, random } from 'remotion';

// Original mascot "Neo": cyber-kid with chrome headphones and a neon hoodie.
const OL = '#1b1530';
const SKIN = '#FFC9A3';
const SKIN_SH = '#EE9E78';
const HOOD = '#2A2456';
const HOOD_SH = '#18143A';
const CYAN = '#22e6ff';
const PINK = '#ff2bd6';

const deg = (a) => (a * Math.PI) / 180;

/** Two-segment sleeve + mitten hand. dir: +1 front arm, -1 back arm. */
const Arm = ({ sx, sy, a1, a2, dir, point, shade }) => {
  const ex = sx + Math.sin(deg(a1)) * 70 * dir;
  const ey = sy + Math.cos(deg(a1)) * 70;
  const a = a1 + a2;
  const hx = ex + Math.sin(deg(a)) * 62 * dir;
  const hy = ey + Math.cos(deg(a)) * 62;
  const d = `M${sx} ${sy} Q${ex} ${ey} ${hx} ${hy}`;
  return (
    <g>
      <path d={d} stroke={OL} strokeWidth="50" fill="none" strokeLinecap="round" />
      <path d={d} stroke={shade ? HOOD_SH : HOOD} strokeWidth="40" fill="none" strokeLinecap="round" />
      {/* neon cuff */}
      <circle cx={hx} cy={hy} r="19" fill="none" stroke={CYAN} strokeWidth="5" />
      <g transform={`translate(${hx} ${hy}) rotate(${-a * dir}) scale(${dir} 1)`}>
        {point ? (
          <>
            <path d="M2 10 L4 58" stroke={OL} strokeWidth="18" strokeLinecap="round" />
            <path d="M2 10 L4 58" stroke={SKIN} strokeWidth="9" strokeLinecap="round" />
            <ellipse cy="16" rx="18" ry="16" fill={SKIN} stroke={OL} strokeWidth="5" />
          </>
        ) : (
          <>
            <ellipse cy="20" rx="19" ry="21" fill={SKIN} stroke={OL} strokeWidth="5" />
            <path d="M16 10 Q30 14 24 28" fill={SKIN} stroke={OL} strokeWidth="5" strokeLinecap="round" />
            <path d="M-8 32 L-8 38 M2 34 L2 40" stroke={SKIN_SH} strokeWidth="3" strokeLinecap="round" />
          </>
        )}
      </g>
    </g>
  );
};

/** Visemes: rest grin, closed, open a / wide e / round o. */
const Mouth = ({ m, v }) => {
  if (m < 0.08) {
    return (
      <g>
        <path d="M-24 -2 Q0 18 26 -4" fill="#7a1530" stroke={OL} strokeWidth="5" strokeLinejoin="round" />
        <path d="M-18 1 Q0 7 20 0" fill="#fff" />
      </g>
    );
  }
  if (m < 0.2) return <path d="M-16 0 Q0 6 16 0" fill="none" stroke={OL} strokeWidth="6" strokeLinecap="round" />;
  const w = v === 'e' ? 30 : v === 'o' ? 15 : 24;
  const h = (v === 'e' ? 16 : 28) * m + 8;
  return (
    <g>
      <path d={`M${-w} 0 Q0 -6 ${w} 0 Q${w * 0.9} ${h} 0 ${h + 3} Q${-w * 0.9} ${h} ${-w} 0 Z`} fill="#5c0f26" stroke={OL} strokeWidth="5" strokeLinejoin="round" />
      {v !== 'o' && <path d={`M${-w + 6} 0 Q0 -4 ${w - 6} 0 L${w - 8} 7 Q0 4 ${-w + 8} 7 Z`} fill="#fff" />}
      {m > 0.35 && <ellipse cy={h - 3} rx={w * 0.5} ry={h * 0.22} fill="#ff6b8a" />}
    </g>
  );
};

/**
 * Lip-synced mascot. side: 'left' | 'right'; enter: 'skate' | 'jump'; point: aim at the title.
 */
export const Narrator = ({ mouth, voiceFrom, side = 'left', enter = 'jump', point = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vi = frame - voiceFrom;
  const talk = vi >= 0 && vi < mouth.length;
  const at = (k) => (k >= 0 && k < mouth.length ? mouth[k] : 0);
  const m = at(vi);
  const accent = Math.max(0, m - (at(vi - 2) + at(vi - 3) + at(vi - 4)) / 3);
  const energy = (at(vi) + at(vi - 1) + at(vi - 2) + at(vi - 3) + at(vi - 4)) / 5;
  let syl = 0;
  for (let k = 1; k <= vi && k < mouth.length; k++) if (mouth[k] > 0.35 && mouth[k - 1] <= 0.35) syl++;
  const v = ['a', 'e', 'a', 'o', 'e'][Math.floor(random(`v${syl}`) * 5)];

  const inn = spring({ frame, fps, config: { damping: enter === 'skate' ? 15 : 9, stiffness: 130 } });
  const dir = side === 'left' ? 1 : -1;
  const enterX = enter === 'skate' ? (1 - inn) * -760 * dir : 0;
  const enterY = enter === 'jump' ? (1 - inn) * 650 : 0;

  const hop = Math.abs(Math.sin(frame / 4.5)) * (talk ? 9 : 3) + accent * 60;
  const squash = 1 + accent * 0.14;
  const lean = Math.sin(frame / 10) * 3 + energy * 5;
  const headRot = Math.sin((frame - 3) / 8) * 4 + accent * 10;
  const blink = (frame + 13) % 64 < 3;
  const look = Math.sin(frame / 21) * 5 + (point ? 6 : 0);
  const brow = energy * 10 + accent * 12;
  const glow = 0.6 + Math.sin(frame / 5) * 0.4;

  const beat = Math.sin(frame / 5) * 0.5 + 0.5;
  let fa1, fa2, ba1, ba2;
  if (point) { fa1 = 122 + Math.sin(frame / 6) * 6; fa2 = 34; ba1 = 30 + energy * 25; ba2 = 50; }
  else if (talk) { fa1 = 45 + energy * 70 + beat * 16; fa2 = 65 - energy * 30; ba1 = 28 + energy * 40 + (1 - beat) * 14; ba2 = 50; }
  else { fa1 = 22 + Math.sin(frame / 15) * 4; fa2 = 20; ba1 = 20; ba2 = 20; }
  // fist-pump on big hits: raised outward so it never covers the face
  if (accent > 0.35 && !point) { fa1 = 125; fa2 = 30; }

  return (
    <svg
      width="440" height="660" viewBox="-20 -40 440 660"
      style={{
        position: 'absolute', [side]: -30, bottom: -36, overflow: 'visible',
        transform: `translate(${enterX}px, ${enterY - hop}px) scaleX(${dir}) rotate(${lean}deg) scale(${2 - squash}, ${squash})`,
        transformOrigin: '50% 100%',
        filter: 'drop-shadow(0 0 16px rgba(34,230,255,.35)) drop-shadow(0 20px 30px rgba(0,0,0,.5))',
      }}
    >
      <defs>
        <radialGradient id="nSkin" cx=".42" cy=".36" r=".72">
          <stop offset="0" stopColor="#FFE3CC" /><stop offset=".65" stopColor={SKIN} /><stop offset="1" stopColor={SKIN_SH} />
        </radialGradient>
        <linearGradient id="nHair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6a4bff" /><stop offset="1" stopColor="#2b1a6e" />
        </linearGradient>
        <linearGradient id="nHood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3275" /><stop offset="1" stopColor={HOOD_SH} />
        </linearGradient>
        <linearGradient id="nChrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".35" stopColor="#9aa6ba" /><stop offset=".55" stopColor="#1f2533" />
          <stop offset=".75" stopColor="#c9d3e2" /><stop offset="1" stopColor="#6b778c" />
        </linearGradient>
        <radialGradient id="nIris" cx=".4" cy=".35" r=".7">
          <stop offset="0" stopColor="#7cf3ff" /><stop offset=".6" stopColor="#1fa5d6" /><stop offset="1" stopColor="#0b4a78" />
        </radialGradient>
      </defs>

      {enter === 'skate' && (
        <g transform={`rotate(${(1 - inn) * -12} 200 600)`}>
          <rect x="70" y="586" width="270" height="18" rx="9" fill="#111" stroke={CYAN} strokeWidth="4" />
          {[110, 300].map((cx) => <circle key={cx} cx={cx} cy="612" r="12" fill={PINK} stroke={OL} strokeWidth="4" />)}
        </g>
      )}

      {/* back arm */}
      <Arm sx={140} sy={372} a1={ba1} a2={ba2} dir={-1} shade />

      {/* legs + sneakers */}
      {[[170, 164], [230, 236]].map(([x0, x1], i) => (
        <g key={i}>
          <path d={`M${x0} 480 L${x1} 556`} stroke={OL} strokeWidth="44" strokeLinecap="round" />
          <path d={`M${x0} 480 L${x1} 556`} stroke="#1d1a33" strokeWidth="34" strokeLinecap="round" />
          <path d={`M${x1 - 30} 552 Q${x1 - 30} 538 ${x1 - 10} 538 L${x1 + 22} 540 Q${x1 + 48} 548 ${x1 + 46} 568 L${x1 - 30} 568 Z`} fill="#fbfbff" stroke={OL} strokeWidth="5" strokeLinejoin="round" />
          <path d={`M${x1 - 30} 572 L${x1 + 46} 572`} stroke={PINK} strokeWidth="7" strokeLinecap="round" />
          <path d={`M${x1 - 6} 546 L${x1 + 14} 554`} stroke={CYAN} strokeWidth="4" strokeLinecap="round" />
        </g>
      ))}

      {/* hoodie */}
      <path d="M118 360 C140 330 260 330 282 360 L300 480 C258 498 142 498 100 480 Z" fill="url(#nHood)" stroke={OL} strokeWidth="5" strokeLinejoin="round" />
      <path d="M152 462 Q200 474 248 462" fill="none" stroke={OL} strokeWidth="4" opacity=".6" />
      <path d="M176 418 L160 446 L174 446 L166 470 L196 432 L182 432 L192 418 Z" transform="translate(16 -12)" fill={PINK} stroke={OL} strokeWidth="3.5" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 ${6 * glow}px ${PINK})` }} />
      {/* drawstrings */}
      <path d="M184 356 L180 404 M216 356 L220 404" stroke={CYAN} strokeWidth="5" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${CYAN})` }} />
      <circle cx="180" cy="408" r="5" fill={CYAN} /><circle cx="220" cy="408" r="5" fill={CYAN} />
      {/* hood collar */}
      <path d="M134 348 C150 376 250 376 266 348 C252 330 148 330 134 348 Z" fill="#3a3275" stroke={OL} strokeWidth="5" />

      {/* head (lags behind body for follow-through) */}
      <g transform={`translate(0 ${-accent * 8}) rotate(${headRot} 200 330)`}>
        <rect x="180" y="300" width="40" height="38" rx="10" fill={SKIN_SH} stroke={OL} strokeWidth="5" />
        {/* face */}
        <path d="M86 196 C86 118 136 82 200 82 C264 82 314 118 314 196 C314 268 266 318 200 318 C134 318 86 268 86 196 Z" fill="url(#nSkin)" stroke={OL} strokeWidth="5" />
        {/* blush */}
        <ellipse cx="128" cy="252" rx="22" ry="12" fill="#ff7aa8" opacity=".35" />
        <ellipse cx="272" cy="252" rx="22" ry="12" fill="#ff7aa8" opacity=".35" />
        {/* hair: soft swoop with a neon streak */}
        <path
          d="M80 196 C70 112 126 60 204 60 C282 60 334 108 320 198 C312 168 300 150 284 140 C288 156 286 170 278 180 C262 150 230 134 196 134 C200 148 196 160 186 168 C172 150 146 142 120 150 C110 162 98 178 80 196 Z"
          fill="url(#nHair)" stroke={OL} strokeWidth="5" strokeLinejoin="round"
        />
        <path d="M150 84 C190 70 250 78 284 108" fill="none" stroke={CYAN} strokeWidth="7" strokeLinecap="round" opacity={0.7 + glow * 0.3} style={{ filter: `drop-shadow(0 0 6px ${CYAN})` }} />
        <path d="M118 104 C130 92 146 86 160 84" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".5" />
        {/* eyebrows */}
        <path d={`M138 ${172 - brow} Q158 ${164 - brow} 176 ${170 - brow * 0.6}`} stroke={OL} strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d={`M224 ${170 - brow * 0.6} Q242 ${164 - brow} 262 ${172 - brow}`} stroke={OL} strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* eyes: separate ovals, big glossy irises */}
        {[158, 242].map((cx) => (
          <g key={cx}>
            {blink ? (
              <path d={`M${cx - 24} 208 Q${cx} 220 ${cx + 24} 208`} fill="none" stroke={OL} strokeWidth="6" strokeLinecap="round" />
            ) : (
              <>
                <ellipse cx={cx} cy="208" rx="26" ry="31" fill="#fff" stroke={OL} strokeWidth="5" />
                <circle cx={cx + look} cy="212" r="17" fill="url(#nIris)" />
                <circle cx={cx + look} cy="213" r="8" fill={OL} />
                <circle cx={cx + look - 6} cy="205" r="5.5" fill="#fff" />
                <circle cx={cx + look + 5} cy="219" r="2.5" fill="#fff" />
                <path d={`M${cx - 27} 200 Q${cx} 172 ${cx + 27} 200`} fill="none" stroke={OL} strokeWidth="6" strokeLinecap="round" />
              </>
            )}
          </g>
        ))}
        {/* nose */}
        <path d="M200 236 Q208 248 198 252" fill="none" stroke={SKIN_SH} strokeWidth="5" strokeLinecap="round" />
        {/* mouth */}
        <g transform="translate(200 276)"><Mouth m={m} v={v} /></g>

        {/* chrome headphones */}
        <path d="M78 196 C70 70 330 70 322 196" fill="none" stroke={OL} strokeWidth="22" strokeLinecap="round" />
        <path d="M78 196 C70 70 330 70 322 196" fill="none" stroke="url(#nChrome)" strokeWidth="13" strokeLinecap="round" />
        {[[60, -1], [340, 1]].map(([x, s]) => (
          <g key={x}>
            <rect x={x - 26} y="168" width="52" height="82" rx="24" fill="url(#nChrome)" stroke={OL} strokeWidth="5" />
            <rect x={x - 14} y="182" width="28" height="54" rx="14" fill="#141225" stroke={s > 0 ? PINK : CYAN} strokeWidth="5" style={{ filter: `drop-shadow(0 0 ${8 * glow}px ${s > 0 ? PINK : CYAN})` }} />
          </g>
        ))}
      </g>

      {/* front arm */}
      <Arm sx={260} sy={372} a1={fa1} a2={fa2} dir={1} point={point} />
    </svg>
  );
};
