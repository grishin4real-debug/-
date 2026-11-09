import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

/**
 * Original hyperactive cartoon kid narrator (yellow-skin TV-cartoon style, own design —
 * not a copy of any existing character). Lip-synced via `mouth` envelope.
 * side: 'left' | 'right'; enter: 'skate' | 'jump'.
 */
export const Narrator = ({ mouth, voiceFrom, side = 'left', enter = 'jump', point = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vi = frame - voiceFrom;
  const talk = vi >= 0 && vi < mouth.length;
  const m = talk ? mouth[vi] : 0;
  const prevM = talk && vi > 2 ? mouth[vi - 3] : 0;
  const accent = Math.max(0, m - prevM); // syllable onsets drive extra bounce

  const inn = spring({ frame, fps, config: { damping: enter === 'skate' ? 14 : 8, stiffness: 120 } });
  const dir = side === 'left' ? 1 : -1;
  const enterX = enter === 'skate' ? (1 - inn) * -700 * dir : 0;
  const enterY = enter === 'jump' ? (1 - inn) * 600 : 0;

  // squash & stretch body bounce
  const hop = Math.abs(Math.sin(frame / 5)) * (talk ? 14 : 4) + accent * 60;
  const squash = 1 + Math.sin(frame / 2.5) * (talk ? 0.025 : 0.01) + accent * 0.25;
  const lean = Math.sin(frame / 9) * (talk ? 5 : 2) + accent * 8 * dir;
  const blink = frame % 70 > 66 ? 0.1 : 1;
  const armA = point ? -125 + Math.sin(frame / 6) * 8 : talk ? -40 + Math.sin(frame / 4) * 35 : -10;
  const armB = talk ? 20 + Math.sin(frame / 5 + 1) * 25 : 10;
  const brow = m * 10 + accent * 20;
  const pupil = Math.sin(frame / 23) * 6;

  const SK = '#FFD90F';
  const OL = '#161616';
  const SHIRT = '#22C55E';

  return (
    <svg
      width="420" height="560" viewBox="-40 -40 420 560"
      style={{
        position: 'absolute', [side]: -20, bottom: -40, overflow: 'visible',
        transform: `translate(${enterX}px, ${enterY - hop}px) scaleX(${dir}) rotate(${lean}deg) scale(${2 - squash}, ${squash})`,
        transformOrigin: '50% 100%',
      }}
    >
      {/* skateboard */}
      {enter === 'skate' && (
        <g transform={`rotate(${(1 - inn) * -10} 170 505)`}>
          <rect x="40" y="492" width="260" height="18" rx="9" fill="#7C3AED" stroke={OL} strokeWidth="5" />
          <circle cx="85" cy="518" r="13" fill="#fff" stroke={OL} strokeWidth="5" />
          <circle cx="255" cy="518" r="13" fill="#fff" stroke={OL} strokeWidth="5" />
        </g>
      )}
      {/* legs */}
      <path d="M130 400 L122 488 M210 400 L218 488" stroke={SK} strokeWidth="30" strokeLinecap="round" />
      <path d="M130 400 L122 488 M210 400 L218 488" stroke={OL} strokeWidth="38" strokeLinecap="round" opacity="0" />
      <rect x="90" y="476" width="62" height="24" rx="12" fill="#fff" stroke={OL} strokeWidth="5" />
      <rect x="190" y="476" width="62" height="24" rx="12" fill="#fff" stroke={OL} strokeWidth="5" />
      {/* shorts */}
      <path d="M100 360 L240 360 L248 430 L178 430 L170 400 L162 430 L92 430 Z" fill="#1F2937" stroke={OL} strokeWidth="5" strokeLinejoin="round" />
      {/* back arm */}
      <g transform={`rotate(${armB} 112 290)`}>
        <path d="M112 290 L70 380" stroke={SHIRT} strokeWidth="34" strokeLinecap="round" />
        <circle cx="66" cy="392" r="19" fill={SK} stroke={OL} strokeWidth="5" />
      </g>
      {/* hoodie torso with striped hem */}
      <path d="M98 270 Q170 250 242 270 L250 372 Q170 384 90 372 Z" fill={SHIRT} stroke={OL} strokeWidth="5" strokeLinejoin="round" />
      <path d="M94 352 Q170 364 246 352" stroke="#FACC15" strokeWidth="9" fill="none" />
      {/* lightning bolt print */}
      <path d="M176 288 L152 326 L170 326 L160 356 L192 314 L174 314 L188 288 Z" fill="#FACC15" stroke={OL} strokeWidth="4" strokeLinejoin="round" />
      {/* front arm (points at the title when point=true) */}
      <g transform={`rotate(${armA} 232 290)`}>
        <path d="M232 290 L262 384" stroke={SHIRT} strokeWidth="34" strokeLinecap="round" />
        <circle cx="266" cy="398" r="20" fill={SK} stroke={OL} strokeWidth="5" />
        {point && <path d="M270 410 L282 450" stroke={SK} strokeWidth="12" strokeLinecap="round" />}
      </g>
      {/* neck */}
      <rect x="150" y="226" width="44" height="46" fill={SK} stroke={OL} strokeWidth="5" />
      {/* head */}
      <g transform={`rotate(${Math.sin(frame / 7) * 4 + accent * 10} 172 200)`}>
        {/* tall rounded head */}
        <path d="M100 240 L104 92 Q106 40 172 40 Q238 40 240 92 L244 240 Q172 262 100 240 Z" fill={SK} stroke={OL} strokeWidth="5" />
        {/* messy tuft hair + backwards cap */}
        <path d="M104 70 Q172 6 240 70 L240 92 Q172 70 104 92 Z" fill="#EF4444" stroke={OL} strokeWidth="5" strokeLinejoin="round" />
        <path d="M100 86 Q60 92 52 108 Q90 110 110 96 Z" fill="#B91C1C" stroke={OL} strokeWidth="5" strokeLinejoin="round" />
        <path d="M150 24 Q160 0 176 18 Q186 -4 200 20" fill="none" stroke={OL} strokeWidth="6" strokeLinecap="round" />
        {/* ear */}
        <path d="M104 160 Q80 156 82 182 Q86 206 106 200" fill={SK} stroke={OL} strokeWidth="5" />
        {/* brows */}
        <path d={`M136 ${108 - brow} L170 ${114 - brow * 0.5}`} stroke={OL} strokeWidth="8" strokeLinecap="round" />
        <path d={`M186 ${114 - brow * 0.5} L222 ${106 - brow}`} stroke={OL} strokeWidth="8" strokeLinecap="round" />
        {/* eyes */}
        {[152, 208].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="140" r={30} fill="#fff" stroke={OL} strokeWidth="5" transform={`translate(0 ${140 * (1 - blink)}) scale(1 ${blink})`} />
            {blink > 0.5 && <circle cx={cx + 8 + pupil} cy="142" r="7" fill={OL} />}
          </g>
        ))}
        {/* freckles */}
        {[[136, 186], [146, 192], [222, 186], [212, 192]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="#D97706" />)}
        {/* nose */}
        <path d="M180 156 Q206 160 204 178 Q202 192 180 188" fill={SK} stroke={OL} strokeWidth="5" />
        {/* mouth: grin when silent, open when talking */}
        <g transform="translate(180 216)">
          {m < 0.08 ? (
            <path d="M-34 -4 Q0 22 34 -8" fill="none" stroke={OL} strokeWidth="6" strokeLinecap="round" />
          ) : (
            <>
              <path d={`M-36 -6 Q0 ${-10} 36 -8 Q${20} ${8 + m * 40} 0 ${10 + m * 40} Q-22 ${8 + m * 40} -36 -6 Z`} fill="#5A0F1A" stroke={OL} strokeWidth="5" strokeLinejoin="round" />
              <path d="M-26 -6 L26 -7 L24 2 L-24 2 Z" fill="#fff" />
              {m > 0.3 && <ellipse cy={6 + m * 32} rx="16" ry={m * 9} fill="#F87171" />}
            </>
          )}
        </g>
      </g>
    </svg>
  );
};
