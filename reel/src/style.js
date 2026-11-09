// Shared look: liquid chrome + neon.
export const NEON = { pink: '#ff2bd6', cyan: '#22e6ff', violet: '#8b5cf6', lime: '#a3ff12', gold: '#ffd166' };

export const CHROME_GRAD =
  'linear-gradient(180deg, #ffffff 0%, #e4ebf5 20%, #a3afc0 42%, #2b3342 50%, #465265 57%, #b9c5d6 76%, #f5f9ff 91%, #c6d0dc 100%)';

/** Chrome text fill with a travelling specular sweep. `sweep` is a 0..100+ percentage. */
export const chromeFill = (sweep) => ({
  backgroundImage: `linear-gradient(105deg, transparent ${sweep - 9}%, rgba(255,255,255,.95) ${sweep}%, transparent ${sweep + 9}%), ${CHROME_GRAD}`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextStroke: '1.5px rgba(255,255,255,.55)',
});

export const chromeShadow = (neon) =>
  `drop-shadow(0 2px 0 #ffffff) drop-shadow(0 6px 0 #161b27) drop-shadow(0 0 10px ${neon}b0) drop-shadow(0 0 30px ${neon}70) drop-shadow(0 22px 26px rgba(0,0,0,.6))`;

/** Neon-tube text: white-hot core, coloured tube and bloom. */
export const neonText = (c, power = 1) => ({
  color: '#fff7fe',
  WebkitTextStroke: `2px ${c}`,
  textShadow: `0 0 2px #fff, 0 0 ${8 * power}px ${c}, 0 0 ${18 * power}px ${c}, 0 0 ${42 * power}px ${c}, 0 0 ${90 * power}px ${c}`,
});

/** Glass card surface with a chrome rim and neon edge glow. */
export const glass = (neon, radius = 40) => ({
  borderRadius: radius,
  background: 'linear-gradient(150deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,.05) 45%, rgba(255,255,255,.02) 100%)',
  border: '2px solid rgba(255,255,255,.28)',
  boxShadow: `inset 0 1px 0 rgba(255,255,255,.6), inset 0 -20px 40px rgba(0,0,0,.25), 0 0 0 1px rgba(0,0,0,.4), 0 0 30px ${neon}55, 0 40px 90px rgba(0,0,0,.55)`,
});
