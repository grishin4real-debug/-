import { useCurrentFrame, spring, useVideoConfig } from 'remotion';

/**
 * Original yellow cartoon narrator (Springfield-style palette, own design).
 * mouth: per-frame openness array (0..1) aligned to the voice track.
 */
export const Narrator = ({ mouth, voiceFrom, lookX = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vi = frame - voiceFrom;
  const m = vi >= 0 && vi < mouth.length ? mouth[vi] : 0;
  const pop = spring({ frame, fps, config: { damping: 9, stiffness: 140 } });
  const talk = vi >= 0 && vi < mouth.length;
  const bob = Math.sin(frame / 6) * (talk ? 6 : 2) + m * 8;
  const blink = frame % 95 > 90 ? 0.1 : 1;
  const arm = talk ? Math.sin(frame / 7) * 14 - 10 : -4;
  const brow = m * 7;
  const SK = '#FFD90F';
  const OL = '#1b1b1b';

  return (
    <svg
      width="400" height="470" viewBox="0 0 400 470"
      style={{ position: 'absolute', left: -10, bottom: -20, transform: `translateY(${(1 - pop) * 400 + bob}px)`, overflow: 'visible' }}
    >
      {/* body: red hoodie */}
      <path d="M70 470 C70 360 110 320 200 320 C290 320 330 360 330 470 Z" fill="#D7263D" stroke={OL} strokeWidth="5" />
      <path d="M150 330 Q200 372 250 330" fill="none" stroke={OL} strokeWidth="5" />
      {/* tiny spider logo */}
      <g transform="translate(200 410)" stroke="#fff" strokeWidth="4" strokeLinecap="round">
        <ellipse rx="9" ry="14" fill="#fff" stroke="none" />
        <path d="M-6 -6 L-28 -22 M6 -6 L28 -22 M-7 2 L-30 2 M7 2 L30 2 M-6 8 L-26 26 M6 8 L26 26" fill="none" />
      </g>
      {/* waving arm */}
      <g transform={`rotate(${arm} 300 360)`}>
        <path d="M300 360 Q370 330 372 260" fill="none" stroke="#D7263D" strokeWidth="38" strokeLinecap="round" />
        <path d="M300 360 Q370 330 372 260" fill="none" stroke={OL} strokeWidth="46" strokeLinecap="round" opacity="0" />
        <circle cx="372" cy="246" r="24" fill={SK} stroke={OL} strokeWidth="5" />
        <path d="M360 226 L358 208 M374 222 L376 204 M386 230 L394 216" stroke={OL} strokeWidth="5" strokeLinecap="round" />
      </g>
      {/* neck + head */}
      <rect x="168" y="270" width="64" height="70" fill={SK} stroke={OL} strokeWidth="5" />
      <g transform={`rotate(${Math.sin(frame / 14) * 3} 200 200)`}>
        <path d="M110 300 L110 130 Q110 50 200 50 Q290 50 290 130 L290 300 Q200 320 110 300 Z" fill={SK} stroke={OL} strokeWidth="5" />
        {/* hair spikes (own style, swept) */}
        <path d="M118 92 L130 40 L150 78 L172 26 L190 70 L214 22 L230 70 L258 34 L262 84 L286 66 L284 108 Q200 70 118 92 Z" fill="#2B2B2B" stroke={OL} strokeWidth="5" strokeLinejoin="round" />
        {/* ear */}
        <path d="M110 190 Q86 186 88 214 Q92 238 112 232" fill={SK} stroke={OL} strokeWidth="5" />
        {/* brows */}
        <path d={`M150 ${128 - brow} Q178 ${116 - brow} 200 ${128 - brow}`} stroke={OL} strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d={`M214 ${128 - brow} Q240 ${116 - brow} 262 ${128 - brow}`} stroke={OL} strokeWidth="7" fill="none" strokeLinecap="round" />
        {/* big eyes */}
        {[175, 238].map((cx) => (
          <g key={cx}>
            <ellipse cx={cx} cy="170" rx="34" ry={34 * blink} fill="#fff" stroke={OL} strokeWidth="5" />
            {blink > 0.5 && <circle cx={cx + 9 * lookX} cy="172" r="7" fill={OL} />}
          </g>
        ))}
        {/* nose */}
        <path d="M206 196 Q238 200 236 220 Q234 236 206 232" fill={SK} stroke={OL} strokeWidth="5" />
        {/* mouth */}
        <g transform="translate(206 262)">
          <ellipse rx={40 + m * 6} ry={5 + m * 30} fill="#5A0F1A" stroke={OL} strokeWidth="5" />
          {m > 0.25 && <ellipse cy={m * 18} rx={20} ry={m * 10} fill="#E86A7A" />}
          {m > 0.15 && <rect x={-26} y={-5 - m * 26} width="52" height={Math.min(10, m * 14)} rx="3" fill="#fff" />}
        </g>
      </g>
    </svg>
  );
};
