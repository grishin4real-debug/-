import { useCurrentFrame, useVideoConfig, spring, random } from 'remotion';

const OL = '#1a1625';
const SK = '#FFD90F';
const SK_SH = '#E8B800';
const SHIRT = '#7C3AED';
const SHIRT_SH = '#5B21B6';
const HAIR = '#1c1838';

const deg = (a) => (a * Math.PI) / 180;

/** Two-segment cartoon arm with a 4-finger hand. dir: +1 right arm, -1 left arm. */
const Arm = ({ sx, sy, a1, a2, dir, point, sleeve }) => {
  const L1 = 66;
  const L2 = 60;
  const ex = sx + Math.sin(deg(a1)) * L1 * dir;
  const ey = sy + Math.cos(deg(a1)) * L1;
  const a = a1 + a2;
  const hx = ex + Math.sin(deg(a)) * L2 * dir;
  const hy = ey + Math.cos(deg(a)) * L2;
  const d = `M${sx} ${sy} L${ex} ${ey} L${hx} ${hy}`;
  // hand orientation follows the forearm
  const rot = -a * dir;
  return (
    <g>
      <path d={d} stroke={OL} strokeWidth="33" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} stroke={SK} strokeWidth="23" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* T-shirt sleeve */}
      <g transform={`translate(${sx} ${sy}) rotate(${-a1 * dir})`}>
        <path d={`M${-24} -14 L24 -14 L22 34 Q0 42 -22 34 Z`} fill={sleeve} stroke={OL} strokeWidth="5" strokeLinejoin="round" />
      </g>
      <g transform={`translate(${hx} ${hy}) rotate(${rot}) scale(${dir} 1)`}>
        {point ? (
          <>
            <path d="M-4 6 L-4 52" stroke={OL} strokeWidth="17" strokeLinecap="round" />
            <path d="M-4 6 L-4 52" stroke={SK} strokeWidth="9" strokeLinecap="round" />
            <circle r="17" cy="4" fill={SK} stroke={OL} strokeWidth="5" />
            <path d="M8 -6 Q20 -2 16 10" fill="none" stroke={OL} strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* three fingers + thumb */}
            {[-11, 0, 11].map((fx, i) => (
              <g key={i}>
                <path d={`M${fx} 8 L${fx * 1.25} 28`} stroke={OL} strokeWidth="15" strokeLinecap="round" />
                <path d={`M${fx} 8 L${fx * 1.25} 28`} stroke={SK} strokeWidth="7" strokeLinecap="round" />
              </g>
            ))}
            <circle r="18" cy="4" fill={SK} stroke={OL} strokeWidth="5" />
            <path d="M14 -2 Q28 4 22 18" fill={SK} stroke={OL} strokeWidth="5" strokeLinecap="round" />
          </>
        )}
      </g>
    </g>
  );
};

/** Mouth shapes: rest smirk, closed "m", open "a", wide "e", round "o". */
const Mouth = ({ m, variant }) => {
  if (m < 0.08) {
    return (
      <g>
        <path d="M-34 0 Q0 14 34 -10" fill="none" stroke={OL} strokeWidth="6" strokeLinecap="round" />
        <path d="M30 -14 Q38 -10 36 -2" fill="none" stroke={OL} strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
  if (m < 0.22) return <ellipse rx="22" ry="7" fill="#4a0c18" stroke={OL} strokeWidth="5" />;
  const w = variant === 'e' ? 44 : variant === 'o' ? 24 : 36;
  const h = (variant === 'e' ? 22 : variant === 'o' ? 40 : 36) * m + 8;
  return (
    <g>
      <path
        d={`M${-w} -4 Q0 -12 ${w} -6 Q${w * 0.8} ${h} 0 ${h + 4} Q${-w * 0.8} ${h} ${-w} -4 Z`}
        fill="#4a0c18" stroke={OL} strokeWidth="5" strokeLinejoin="round"
      />
      {variant !== 'o' && <path d={`M${-w + 8} -3 Q0 -9 ${w - 8} -5 L${w - 10} 5 Q0 2 ${-w + 10} 6 Z`} fill="#fff" />}
      {m > 0.4 && <ellipse cx="4" cy={h - 4} rx={w * 0.45} ry={h * 0.22} fill="#ff6b8a" />}
    </g>
  );
};

/**
 * Original Springfield-style cartoon kid (yellow skin, touching round eyes, snout nose,
 * jutting jaw) — own design, not a copy of an existing character. Lip-synced via `mouth`.
 * side: 'left' | 'right'; enter: 'skate' | 'jump'; point: raise the front arm at the title.
 */
export const Narrator = ({ mouth, voiceFrom, side = 'left', enter = 'jump', point = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vi = frame - voiceFrom;
  const talk = vi >= 0 && vi < mouth.length;
  const at = (k) => (k >= 0 && k < mouth.length ? mouth[k] : 0);
  const m = at(vi);
  // smoothed onset energy drives gestures / bounce
  const accent = Math.max(0, m - (at(vi - 2) + at(vi - 3) + at(vi - 4)) / 3);
  const energy = (at(vi) + at(vi - 1) + at(vi - 2) + at(vi - 3) + at(vi - 4)) / 5;
  // syllable index picks the vowel shape
  let syl = 0;
  for (let k = 1; k <= vi && k < mouth.length; k++) if (mouth[k] > 0.35 && mouth[k - 1] <= 0.35) syl++;
  const variant = ['a', 'e', 'a', 'o', 'e'][Math.floor(random(`v${syl}`) * 5)];

  const inn = spring({ frame, fps, config: { damping: enter === 'skate' ? 15 : 9, stiffness: 120 } });
  const dir = side === 'left' ? 1 : -1;
  const enterX = enter === 'skate' ? (1 - inn) * -760 * dir : 0;
  const enterY = enter === 'jump' ? (1 - inn) * 650 : 0;

  const hop = Math.abs(Math.sin(frame / 4.5)) * (talk ? 10 : 3) + accent * 70;
  const squash = 1 + accent * 0.18 - Math.abs(Math.sin(frame / 4.5)) * 0.02;
  const lean = Math.sin(frame / 10) * 3 + energy * 6;
  // head lags behind the body (follow-through)
  const headRot = Math.sin((frame - 3) / 8) * 4 + accent * 12 - energy * 3;
  const headY = -accent * 10;
  const blink = (frame + 13) % 64 < 3;
  const look = Math.sin(frame / 21) * 5 + (point ? 7 : 0);

  // gestures
  const beat = Math.sin(frame / 5) * 0.5 + 0.5;
  let fa1, fa2, ba1, ba2;
  if (point) {
    fa1 = 150 + Math.sin(frame / 6) * 6; fa2 = -10;
    ba1 = 25 + energy * 25; ba2 = 50;
  } else if (talk) {
    fa1 = 40 + energy * 70 + beat * 18; fa2 = 70 - energy * 30;
    ba1 = 25 + energy * 40 + (1 - beat) * 15; ba2 = 55;
  } else {
    fa1 = 22 + Math.sin(frame / 15) * 4; fa2 = 20;
    ba1 = 20 + Math.cos(frame / 15) * 4; ba2 = 20;
  }
  if (accent > 0.35 && !point) { fa1 = 165; fa2 = 10; } // fist-pump on big hits

  return (
    <svg
      width="430" height="640" viewBox="-15 -20 430 640"
      style={{
        position: 'absolute', [side]: -30, bottom: -36, overflow: 'visible',
        transform: `translate(${enterX}px, ${enterY - hop}px) scaleX(${dir}) rotate(${lean}deg) scale(${2 - squash}, ${squash})`,
        transformOrigin: '50% 100%',
        filter: 'drop-shadow(0 0 18px rgba(139,92,246,.45)) drop-shadow(0 20px 30px rgba(0,0,0,.5))',
      }}
    >
      {enter === 'skate' && (
        <g transform={`rotate(${(1 - inn) * -12} 200 590)`}>
          <rect x="70" y="576" width="270" height="18" rx="9" fill="#111" stroke="#22e6ff" strokeWidth="4" />
          {[110, 300].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="602" r="13" fill="#ff2bd6" stroke={OL} strokeWidth="4" />
              <circle cx={cx} cy="602" r="4" fill="#fff" />
            </g>
          ))}
        </g>
      )}

      {/* back arm */}
      <Arm sx={152} sy={352} a1={ba1} a2={ba2} dir={-1} sleeve={SHIRT_SH} />

      {/* legs, socks, sneakers */}
      {[[176, 168], [232, 240]].map(([x0, x1], i) => (
        <g key={i}>
          <path d={`M${x0} 470 L${x1} 556`} stroke={OL} strokeWidth="34" strokeLinecap="round" />
          <path d={`M${x0} 470 L${x1} 556`} stroke={SK} strokeWidth="24" strokeLinecap="round" />
          <rect x={x1 - 16} y="536" width="32" height="22" fill="#fff" stroke={OL} strokeWidth="5" />
          <path d={`M${x1 - 24} 556 L${x1 + 30} 556 Q${x1 + 46} 562 ${x1 + 40} 576 L${x1 - 26} 576 Q${x1 - 34} 566 ${x1 - 24} 556 Z`} fill="#f5f5f5" stroke={OL} strokeWidth="5" strokeLinejoin="round" />
          <path d={`M${x1 - 26} 570 L${x1 + 42} 570`} stroke="#ff2bd6" strokeWidth="5" />
        </g>
      ))}

      {/* shorts */}
      <path d="M146 430 L262 430 L270 498 L214 498 L206 470 L198 498 L140 498 Z" fill="#26304a" stroke={OL} strokeWidth="5" strokeLinejoin="round" />
      <path d="M148 444 L260 444" stroke="#22e6ff" strokeWidth="4" opacity=".8" />

      {/* T-shirt */}
      <path d="M140 340 Q205 322 268 340 L276 438 Q205 450 132 438 Z" fill={SHIRT} stroke={OL} strokeWidth="5" strokeLinejoin="round" />
      <path d="M140 400 Q205 412 274 400 L276 438 Q205 450 132 438 Z" fill={SHIRT_SH} opacity=".55" />
      <path d="M184 334 Q205 352 228 334" fill="none" stroke={OL} strokeWidth="5" />
      {/* neon lightning print */}
      <path d="M212 362 L190 398 L206 398 L196 426 L228 386 L212 386 L224 362 Z" fill="#22e6ff" stroke={OL} strokeWidth="4" strokeLinejoin="round" />

      {/* neck */}
      <path d="M180 296 L180 340 Q206 348 232 340 L232 296 Z" fill={SK} stroke={OL} strokeWidth="5" />
      <path d="M182 300 Q206 318 230 300 L230 312 Q206 328 182 312 Z" fill={SK_SH} opacity=".7" />

      {/* head */}
      <g transform={`translate(0 ${headY}) rotate(${headRot} 206 310)`}>
        {/* ear */}
        <path d="M138 186 C112 178 104 224 136 228" fill={SK} stroke={OL} strokeWidth="5" />
        <path d="M134 198 C122 198 122 214 134 214" fill="none" stroke={OL} strokeWidth="4" />
        {/* skull */}
        <path d="M138 286 C132 236 128 168 132 122 C136 82 166 66 206 66 C246 66 274 82 278 122 C282 168 280 232 276 270 Z" fill={SK} stroke={OL} strokeWidth="5" strokeLinejoin="round" />
        {/* jutting jaw / snout */}
        <path d="M146 250 C144 300 176 322 214 322 C256 322 282 300 280 254 C270 262 240 266 214 264 C186 262 160 258 146 250 Z" fill={SK} stroke={OL} strokeWidth="5" strokeLinejoin="round" />
        <path d="M150 262 C176 270 250 274 278 262" fill="none" stroke={SK} strokeWidth="8" />
        {/* forehead shade under the hair */}
        <path d="M134 120 C160 104 250 104 278 122 L278 138 C250 122 160 122 133 140 Z" fill={SK_SH} opacity=".6" />
        {/* spiky hair, swept right */}
        <path
          d="M128 132 C118 98 128 72 150 60 L140 22 L178 46 L186 6 L212 40 L234 4 L244 44 L282 22 L270 60 C292 72 294 104 282 132 C252 110 160 110 128 132 Z"
          fill={HAIR} stroke={OL} strokeWidth="5" strokeLinejoin="round"
        />
        <path d="M168 54 L182 30 M214 46 L232 22 M250 56 L268 38" stroke="#8b5cf6" strokeWidth="5" strokeLinecap="round" opacity=".8" />
        {/* eyes: big, round, touching */}
        {[178, 240].map((cx, i) => (
          <g key={cx}>
            <circle cx={cx} cy="176" r="33" fill="#fff" stroke={OL} strokeWidth="5" />
            {blink ? (
              <path d={`M${cx - 33} 176 Q${cx} 186 ${cx + 33} 176`} fill="none" stroke={OL} strokeWidth="5" />
            ) : (
              <>
                <circle cx={cx + look} cy={178 - energy * 3} r="6" fill={OL} />
                {/* cocky half-lid */}
                <path d={`M${cx - 33} ${168 - energy * 8} Q${cx} ${154 - energy * 10} ${cx + 33} ${166 - energy * 8 - i * 2}`} fill="none" stroke={OL} strokeWidth="4" strokeLinecap="round" />
              </>
            )}
          </g>
        ))}
        {/* snout nose */}
        <path d="M232 206 C268 202 276 222 268 232 C260 242 240 240 228 236" fill={SK} stroke={OL} strokeWidth="5" strokeLinecap="round" />
        {/* mouth on the snout */}
        <g transform={`translate(218 284) rotate(${talk ? 0 : -4})`}>
          <Mouth m={m} variant={variant} />
        </g>
      </g>

      {/* front arm */}
      <Arm sx={262} sy={352} a1={fa1} a2={fa2} dir={1} point={point} sleeve={SHIRT} />
    </svg>
  );
};
