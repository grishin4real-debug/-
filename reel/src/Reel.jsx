import { useEffect, useState } from 'react';
import {
  AbsoluteFill, Sequence, Html5Audio, Img, staticFile, useCurrentFrame, useVideoConfig,
  interpolate, spring, delayRender, continueRender, Easing,
} from 'remotion';
import timeline from './timeline.json';
import { Background } from './Background.jsx';
import { KineticTitle, Counter } from './KineticTitle.jsx';
import { ScreenCam, Cursor, Ripple, track } from './ScreenCam.jsx';
import { Narrator } from './Narrator.jsx';
import { Captions } from './Captions.jsx';
import { PixelScene } from './PixelScene.jsx';
import { Confetti, Shake } from './Fx.jsx';
import { NEON, glass, neonText } from './style.js';
import { CameraRig, Parallax, evalCam, WIDE } from './Camera.jsx';

const TITLE_Y = 230;
const MEDIA_TOP = 680;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const TG = timeline.telegram || '';

// per-scene neon palette [accent, aurora 2, aurora 3]; accent tints chrome, rings and grid
const PALETTES = {
  hook: ['#ff2bd6', '#7c3aed', '#22e6ff'],
  plan: ['#22e6ff', '#3b82f6', '#ff2bd6'],
  coupon: ['#a3ff12', '#0d9488', '#22e6ff'],
  zero: ['#ffd166', '#ff2bd6', '#a3ff12'],
  inside: ['#8b5cf6', '#ff2bd6', '#22e6ff'],
  versus: ['#ff2bd6', '#2563eb', '#ff4d4d'],
  tg: ['#22e6ff', '#229ed9', '#8b5cf6'],
};
// narrator placement per scene (captions avoid the narrator's side)
const STAGE = {
  hook: { side: 'left', enter: 'skate' },
  plan: { side: 'right', enter: 'jump' },
  coupon: { side: 'left', enter: 'jump' },
  zero: { side: 'right', enter: 'skate' },
  inside: { side: 'left', enter: 'jump' },
  versus: { side: 'right', enter: 'jump' },
  tg: { side: 'left', enter: 'skate', point: true },
};

/** Zoom-blur in/out wrapper so every cut feels like a camera move. */
const Shot = ({ dur, children }) => {
  const f = useCurrentFrame();
  const inn = interpolate(f, [0, 10], [1, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const out = interpolate(f, [dur - 8, dur], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const push = interpolate(f, [0, dur], [1, 1.04]);
  const spin = (inn - out) * 4;
  return (
    <AbsoluteFill style={{ transform: `scale(${(1 + inn * 0.3 - out * 0.15) * push}) rotate(${spin}deg)`, filter: `blur(${(inn + out) * 18}px)`, opacity: 1 - out }}>
      {children}
    </AbsoluteFill>
  );
};

const Flash = ({ color = '#fff' }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 2, 9], [0, 0.5, 0], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ background: color, opacity: o, pointerEvents: 'none' }} />;
};

const Boom = ({ at }) => (
  <Sequence from={at} layout="none">
    <Flash />
    <Html5Audio src={staticFile('sfx/boom.wav')} volume={0.9} />
  </Sequence>
);

/** Glass ticket with a chrome rim; price rolls down to 0. */
const PriceTicket = ({ at, y, from = 20, label = 'PLUS · 3 МЕСЯЦА', neon = NEON.pink }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inn = spring({ frame: f - at, fps, config: { damping: 11, stiffness: 120 } });
  const float = Math.sin(f / 18) * 14;
  const shine = ((f - at) * 22) % 1600 - 400;
  return (
    <div
      style={{
        position: 'absolute', left: 140, top: y, width: 800, height: 520, ...glass(neon, 56),
        transform: `perspective(1400px) translateY(${(1 - inn) * 900 + float}px) rotateX(${(1 - inn) * 50 + Math.sin(f / 25) * 6}deg) rotateY(${Math.sin(f / 31) * 10}deg) rotate(${(1 - inn) * -20 - 3}deg)`,
        overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{ position: 'absolute', top: -200, bottom: -200, left: shine, width: 160, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent)', transform: 'rotate(20deg)' }} />
      {/* perforation line */}
      <div style={{ position: 'absolute', left: 60, right: 60, top: 150, borderTop: '3px dashed rgba(255,255,255,.25)' }} />
      <div style={{ position: 'absolute', top: 56, fontFamily: 'Unbounded', fontWeight: 800, fontSize: 46, letterSpacing: 4, ...neonText(NEON.cyan, 0.7) }}>{label}</div>
      <div style={{ marginTop: 110 }}>
        <Counter from={from} to={0} start={at + 14} len={34} size={300} prefix="$" neon={neon} />
      </div>
    </div>
  );
};

// ----- scene bodies -----
const Hook = ({ dur }) => (
  <Shake at={[64]}>
    <KineticTitle lines={[['*БЕСПЛАТНО*']]} dur={dur} size={190} y={TITLE_Y} fx="zoom" stagger={2.2} />
    <Sequence from={22} layout="none">
      <KineticTitle lines={[['НА', '3', 'МЕСЯЦА']]} dur={dur - 22} size={120} y={TITLE_Y + 230} fx="drop" stagger={2.5} />
    </Sequence>
    <PriceTicket at={14} y={MEDIA_TOP + 60} />
    <Boom at={64} />
    <Confetti at={64} y={MEDIA_TOP + 320} />
  </Shake>
);

const Plan = ({ dur }) => (
  <ScreenCam
    src="clips/plan.mp4" top={MEDIA_TOP} neon={NEON.cyan} dur={dur} fit={6.6}
    cam={[
      { t: 0, x: 677, y: 420, s: 1.12 }, { t: 1.6, x: 677, y: 440, s: 1.25 },
      { t: 3.2, x: 677, y: 470, s: 2.1 }, { t: 5, x: 677, y: 560, s: 2.6 }, { t: 7.5, x: 677, y: 560, s: 2.6 },
    ]}
    cursor={[{ t: 0, x: 980, y: 660 }, { t: 1.2, x: 761, y: 590 }, { t: 3.8, x: 610, y: 600 }, { t: 5.3, x: 664, y: 582 }, { t: 9, x: 690, y: 640 }]}
    clicks={[{ t: 5.6, x: 664, y: 582 }]}
  />
);

const Coupon = ({ dur, cue }) => {
  const at = cue('минус', 0, dur - 50);
  return (
    <Shake at={[at]}>
      <ScreenCam
        src="clips/coupon.mp4" top={MEDIA_TOP} neon={NEON.lime} dur={dur} fit={11.5}
        cam={[
          { t: 0, x: 430, y: 430, s: 1.4 }, { t: 1.2, x: 430, y: 440, s: 2.1 }, { t: 6, x: 435, y: 450, s: 2.2 },
          { t: 8.6, x: 420, y: 360, s: 1.6 }, { t: 10.2, x: 340, y: 300, s: 2.2 }, { t: 12, x: 330, y: 240, s: 2.6 },
        ]}
        cursor={[{ t: 0, x: 440, y: 440 }, { t: 6, x: 560, y: 450 }, { t: 8, x: 560, y: 450 }, { t: 12, x: 560, y: 480 }]}
        clicks={[{ t: 0.4, x: 440, y: 432 }]}
      />
      <Sequence from={at} layout="none">
        <div style={{ position: 'absolute', inset: 0, transform: 'rotate(-6deg)' }}>
          <KineticTitle lines={[['*−100%*']]} dur={dur - at} size={230} y={MEDIA_TOP + 520} fx="glitch" stagger={1.2} />
        </div>
      </Sequence>
      <Boom at={at} />
      <Confetti at={at + 2} y={MEDIA_TOP + 640} n={50} />
    </Shake>
  );
};

/** Shared timing for the price scene so the body and the camera agree. Keeps beats ≥10 frames apart. */
const zeroBeats = (cue) => {
  const start = cue('стало', 0, 30);
  const hit = Math.max(start + 10, cue('ноль', 0, start + 20));
  const pops = [];
  ['первый', 'второй', 'третий'].forEach((w, i) => {
    pops.push(Math.max(cue(w, 0, hit + 12 * (i + 1)), (i ? pops[i - 1] : hit) + 12));
  });
  return { start, hit, pops };
};

const Zero = ({ dur, cue }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // beats follow the narration: "Стало" → counter, "ноль" → boom, "первый/второй/третий" → month cards
  const { start, hit, pops } = zeroBeats(cue);
  const strike = interpolate(f, [start - 14, start], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const old = spring({ frame: f - 2, fps, config: { damping: 12 } });
  const months = ['МЕС 1', 'МЕС 2', 'МЕС 3'];
  return (
    <Shake at={[hit]}>
      <KineticTitle lines={[['ЦЕНА']]} dur={dur} size={170} y={TITLE_Y} fx="glitch" />
      {/* old price with drawn strike-through */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: MEDIA_TOP - 70, display: 'flex', justifyContent: 'center', transform: `scale(${old}) rotate(-4deg)` }}>
        <div style={{ position: 'relative', fontFamily: 'Dela', fontSize: 150, color: 'rgba(220,228,240,.55)', textShadow: '0 4px 14px rgba(0,0,0,.6)' }}>
          $20<span style={{ fontSize: 60 }}>/мес</span>
          <div style={{ position: 'absolute', left: -20, top: '52%', height: 16, width: `${strike * 112}%`, borderRadius: 8, transform: 'rotate(-8deg)', background: '#fff', boxShadow: `0 0 8px ${NEON.pink}, 0 0 22px ${NEON.pink}, 0 0 50px ${NEON.pink}` }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: MEDIA_TOP + 110, display: 'flex', justifyContent: 'center' }}>
        <Counter from={20} to={0} start={start} len={hit - start} size={370} prefix="$" neon={NEON.gold} />
      </div>
      {/* three month stamps */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: MEDIA_TOP + 510, display: 'flex', justifyContent: 'center', gap: 34 }}>
        {months.map((m, i) => {
          const p = spring({ frame: f - pops[i], fps, config: { damping: 8, stiffness: 180 } });
          return (
            <div key={m} style={{ width: 260, height: 150, ...glass(NEON.lime, 30), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: `scale(${p}) rotate(${(1 - p) * 40 + (i - 1) * 5}deg)` }}>
              <div style={{ fontFamily: 'Unbounded', fontWeight: 700, fontSize: 28, color: 'rgba(255,255,255,.75)', letterSpacing: 3 }}>{m}</div>
              <div style={{ fontFamily: 'Dela', fontSize: 64, ...neonText(NEON.lime, 0.8) }}>$0</div>
            </div>
          );
        })}
      </div>
      <Boom at={hit} />
      <Confetti at={hit} y={MEDIA_TOP + 400} n={90} power={1.2} />
      {pops.map((p, i) => (
        <Sequence key={i} from={p} durationInFrames={10} layout="none"><Html5Audio src={staticFile('sfx/tick.wav')} /></Sequence>
      ))}
    </Shake>
  );
};

const Inside = ({ dur, cue }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cards = [
    ['ИГРЫ', NEON.pink], ['САЙТЫ', NEON.cyan],
    ['ВИДЕО', NEON.gold], ['ДИЗАЙН', NEON.lime],
  ];
  const meta = cue('этот', 0, dur - 60);
  // each card lands just before its word is spoken (the camera visits it on that word)
  const appear = [cue('игры', 0, 26) - 8, cue('сайты', 0, 35) - 8, cue('видео', 0, 53) - 8, cue('дизайн', 0, 44) - 8];
  return (
    <>
      <KineticTitle lines={[['ЧТО'], ['*ВНУТРИ?*']]} dur={dur} size={170} y={TITLE_Y} fx="wave" neon={NEON.violet} />
      <div style={{ position: 'absolute', left: 70, right: 70, top: MEDIA_TOP + 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36 }}>
        {cards.map(([t, c], i) => {
          // cards fly in, then collapse away when the "this reel" punchline lands
          const p = spring({ frame: f - appear[i], fps, config: { damping: 10, stiffness: 130 } })
            - spring({ frame: f - meta + i * 2, fps, config: { damping: 14, stiffness: 160 } });
          const hover = Math.sin((f + i * 20) / 14) * 10;
          const shine = ((f * 6 + i * 90) % 900) - 300;
          return (
            <div
              key={t}
              style={{
                height: 300, ...glass(c, 44), position: 'relative', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: `perspective(1000px) rotateY(${(1 - p) * 120}deg) translateY(${hover}px) rotate(${(i % 2 ? 1 : -1) * 2}deg)`,
                opacity: p > 0.02 ? 1 : 0,
              }}
            >
              <div style={{ position: 'absolute', top: -100, bottom: -100, left: shine, width: 90, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent)', transform: 'rotate(18deg)' }} />
              <div style={{ fontFamily: 'Dela', fontSize: 66, ...neonText(c, 0.85) }}>{t}</div>
            </div>
          );
        })}
      </div>
      <Sequence from={meta} layout="none">
        <div style={{ position: 'absolute', inset: 0, transform: 'rotate(-4deg)' }}>
          <KineticTitle lines={[['ЭТОТ', 'РОЛИК'], ['*ТОЖЕ*', 'ОН!']]} dur={dur - meta} size={150} y={MEDIA_TOP + 180} fx="drop" stagger={1.6} />
        </div>
        <Html5Audio src={staticFile('sfx/ding.wav')} volume={0.7} />
      </Sequence>
    </>
  );
};

const Versus = ({ dur, cue }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame: f - 6, fps, config: { damping: 14 } });
  const reveal = cue('а', 0, 70);
  const b = spring({ frame: f - reveal, fps, config: { damping: 14 } });
  const kb = interpolate(f, [reveal, dur], [1.1, 1.25]);
  const venom = interpolate(f, [reveal + 70, reveal + 82], [0, 1], clamp);
  const panel = { position: 'absolute', left: 40, width: 1000, height: 400, borderRadius: 40, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.6), 0 0 0 3px rgba(255,255,255,.18)' };
  return (
    <Shake at={[reveal]}>
      <KineticTitle lines={[['ОДИН'], ['*ЗАПРОС*']]} dur={dur} size={170} y={TITLE_Y} fx="slice" />
      <div style={{ ...panel, top: MEDIA_TOP, transform: `translateX(${(1 - a) * -1200}px) rotate(-2deg)`, filter: `saturate(${f > reveal ? 0.35 : 1})` }}>
        <PixelScene width={1000} height={400} />
      </div>
      <div style={{ ...panel, top: MEDIA_TOP + 420, transform: `translateX(${(1 - b) * 1200}px) rotate(2deg)` }}>
        <Img src={staticFile('img/spider_land.png')} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 72%', transform: `scale(${kb})`, transformOrigin: '50% 72%' }} />
        <Img src={staticFile('img/venom_attack.png')} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 62%', opacity: venom, transform: `scale(${kb})`, transformOrigin: '50% 62%' }} />
      </div>
      <Sequence from={10} layout="none">
        <div style={{ position: 'absolute', inset: 0, transform: 'translateX(330px)' }}>
          <KineticTitle lines={[['*2D*']]} dur={dur - 10} size={130} y={MEDIA_TOP + 20} fx="glitch" />
        </div>
      </Sequence>
      <Sequence from={reveal} layout="none">
        <div style={{ position: 'absolute', inset: 0, transform: 'translateX(-330px)' }}>
          <KineticTitle lines={[['*3D*']]} dur={dur - reveal} size={130} y={MEDIA_TOP + 440} fx="zoom" />
        </div>
      </Sequence>
      <Boom at={reveal} />
    </Shake>
  );
};

const TgLogo = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 240 240">
    <defs>
      <linearGradient id="tgg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2AABEE" /><stop offset="1" stopColor="#229ED9" /></linearGradient>
    </defs>
    <circle cx="120" cy="120" r="120" fill="url(#tgg)" />
    <path d="M54 118 L172 72 Q182 69 180 80 L160 172 Q157 182 147 177 L116 154 L100 170 Q96 174 95 167 L97 142 L154 90 Q158 86 152 88 L82 132 L55 124 Q46 121 54 118 Z" fill="#fff" />
  </svg>
);

const Tg = ({ dur, cue }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame: f - 8, fps, config: { damping: 7, stiffness: 140 } });
  const clickAt = cue('подписывайся', 0, 120);
  const linkAt = cue('ссылка', 0, clickAt + 30);
  const c = clickAt / fps;
  const clicked = f >= clickAt;
  const btn = spring({ frame: f - 40, fps, config: { damping: 9, stiffness: 160 } });
  const btnPop = spring({ frame: f - clickAt, fps, config: { damping: 5, stiffness: 300 } });
  const pulse = clicked ? 1 + (1 - btnPop) * -0.18 : 1 + Math.sin(f / 5) * 0.04;
  const glow = 30 + Math.sin(f / 5) * 20;
  // paper plane loops around the logo leaving a dashed trail
  const planeAt = (k) => {
    const u = (k - 20) / 60;
    return [540 + Math.cos(u * Math.PI * 2.2) * 420 * (1 - u * 0.2), MEDIA_TOP + 170 + Math.sin(u * Math.PI * 2.2) * 190 - u * 100];
  };
  const trail = [];
  for (let k = Math.max(20, f - 40); k <= Math.min(f, 80); k += 2) trail.push(planeAt(k));
  const [px, py] = planeAt(Math.min(f, 80));
  const cur = [{ t: 0, x: 1200, y: 1700 }, { t: Math.max(0.1, c - 1.1), x: 1200, y: 1700 }, { t: c - 0.08, x: 600, y: MEDIA_TOP + 590 }, { t: c + 2, x: 640, y: MEDIA_TOP + 620 }];
  const press = Math.max(0, 1 - Math.abs(f - clickAt) / 6);

  return (
    <Shake at={[clickAt]}>
      <KineticTitle lines={[['*ПОДПИШИСЬ*']]} dur={dur} size={150} y={TITLE_Y - 20} fx="drop" stagger={2} neon={NEON.cyan} />
      <Sequence from={14} layout="none">
        <KineticTitle lines={[['НА', 'МОЙ', 'ТЕЛЕГРАМ']]} dur={dur - 14} size={84} y={TITLE_Y + 170} fx="wave" stagger={1.4} neon={NEON.cyan} />
      </Sequence>
      <svg width="1080" height="1920" style={{ position: 'absolute', inset: 0 }}>
        <polyline points={trail.map((p) => p.join(',')).join(' ')} fill="none" stroke={NEON.cyan} strokeWidth="6" strokeDasharray="14 14" style={{ filter: `drop-shadow(0 0 8px ${NEON.cyan})` }} strokeLinecap="round" />
      </svg>
      {f >= 20 && f <= 84 && (
        <div style={{ position: 'absolute', left: px - 50, top: py - 50, transform: `rotate(${f * 8}deg)` }}>
          <svg width="100" height="100" viewBox="0 0 24 24"><path d="M2 11 L22 3 L18 21 L11 15 L8 20 L8 14 L18 6 L6 13 Z" fill="#fff" /></svg>
        </div>
      )}
      <div style={{ position: 'absolute', left: 540 - 170, top: MEDIA_TOP, transform: `scale(${logo}) rotate(${(1 - logo) * -180 + Math.sin(f / 12) * 6}deg)`, filter: `drop-shadow(0 0 30px ${NEON.cyan}) drop-shadow(0 30px 60px rgba(34,158,217,.7))` }}>
        <TgLogo size={340} />
      </div>
      {TG && (
        <Sequence from={50} layout="none">
          <KineticTitle lines={[[`*${TG}*`]]} dur={dur - 50} size={92} y={MEDIA_TOP + 370} fx="slice" stagger={1.3} neon={NEON.cyan} charW={0.95} />
        </Sequence>
      )}
      <div
        style={{
          position: 'absolute', left: 140, width: 800, top: MEDIA_TOP + 520, height: 160, borderRadius: 80,
          background: clicked ? 'linear-gradient(180deg,#5dff9a,#16a34a 55%,#0b6b2c)' : 'linear-gradient(180deg,#7fd8ff,#229ed9 50%,#0b5a8c)', border: '3px solid rgba(255,255,255,.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
          fontFamily: 'Unbounded', fontWeight: 900, fontSize: 64, color: '#fff',
          transform: `scale(${btn * pulse})`,
          boxShadow: `inset 0 3px 0 rgba(255,255,255,.7), inset 0 -10px 20px rgba(0,0,0,.25), 0 10px 0 ${clicked ? '#0b4d22' : '#083c5e'}, 0 0 ${glow}px ${clicked ? '#5dff9a' : NEON.cyan}, 0 0 ${glow * 2.5}px ${clicked ? 'rgba(93,255,154,.5)' : 'rgba(34,230,255,.45)'}`, textShadow: '0 3px 0 rgba(0,0,0,.3)',
        }}
      >
        {clicked ? '✓ ТЫ С НАМИ' : 'ПОДПИСАТЬСЯ'}
      </div>
      <Ripple x={600} y={MEDIA_TOP + 600} age={f - clickAt} />
      <Cursor x={track(cur, f / fps, 'x')} y={track(cur, f / fps, 'y')} press={press} />
      <Confetti at={clickAt} y={MEDIA_TOP + 600} n={110} power={1.3} />
      <Sequence from={clickAt} layout="none">
        <Html5Audio src={staticFile('sfx/click.wav')} volume={0.7} />
        <Html5Audio src={staticFile('sfx/ding.wav')} volume={0.8} />
      </Sequence>
      <Sequence from={linkAt} layout="none">
        <div style={{ position: 'absolute', inset: 0, transform: 'translateX(150px)' }}>
          <KineticTitle lines={[['ССЫЛКА', 'В'], ['*ОПИСАНИИ*']]} dur={dur - linkAt} size={64} y={MEDIA_TOP + 720} fx="zoom" stagger={1.2} neon={NEON.cyan} />
        </div>
      </Sequence>
    </Shake>
  );
};

/** cue('слово', nth, fallback) → scene frame where that spoken word starts. */
const makeCue = (s) => (word, nth = 0, fallback = 0) => {
  const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  for (let i = 0, c = 0; i < s.words.length; i++) {
    if (norm(s.words[i]) === word && c++ === nth) return Math.round(s.voiceFrom + s.wordStarts[i]);
  }
  return fallback;
};

const BODIES = { hook: Hook, plan: Plan, coupon: Coupon, zero: Zero, inside: Inside, versus: Versus, tg: Tg };

// ----- camera moves: follow each title as it types on, then travel to whatever is being said -----
const k = (f, o = {}) => ({ f, ...WIDE, ...o });
/** Pan left→right across a title line while its letters appear. */
const follow = (y, f0 = 0, len = 20, s = 1.22) => [
  k(f0, { x: 360, y, s, r: -3, rx: 6, ry: -12 }),
  k(f0 + len, { x: 720, y, s: s - 0.04, r: 2, rx: 2, ry: 10 }),
];
const TITLE_C = TITLE_Y + 165; // centre of a two-line scene title

const CAMS = {
  hook: (cue, dur) => [
    ...follow(TITLE_Y + 90, 0, 20, 1.18),
    k(32, { x: 540, y: TITLE_Y + 285, s: 1.22, r: -1, rx: 5 }),
    k(48, { x: 540, y: 900, s: 0.98 }),
    k(60, { x: 540, y: 1000, s: 1.1, r: 2 }),
    k(68, { x: 540, y: 1000, s: 1.32, r: -2, ease: 'snap' }),
    k(dur, { x: 540, y: 960, s: 1.05, ry: 6 }),
  ],
  plan: (cue, dur) => [
    ...follow(TITLE_C, 0, 18, 1.18),
    k(30, { x: 540, y: 960, s: 1 }),
    k(Math.round(dur * 0.6), { x: 540, y: 1060, s: 1.08, rx: 3, ry: -6 }),
    k(dur, { x: 540, y: 1080, s: 1.15, r: 1, ry: 6 }),
  ],
  coupon: (cue, dur) => {
    const at = cue('минус', 0, dur - 50);
    return [
      ...follow(TITLE_C, 0, 18, 1.18),
      k(30, { x: 540, y: 960, s: 1 }),
      k(at - 4, { x: 540, y: 1080, s: 1.08, ry: -6 }),
      k(at + 6, { x: 540, y: 1300, s: 1.28, r: -6, ease: 'snap' }),
      k(dur, { x: 540, y: 1250, s: 1.18, r: -3 }),
    ];
  },
  zero: (cue, dur) => {
    const { start, hit, pops } = zeroBeats(cue);
    return [
      k(0, { x: 540, y: TITLE_Y + 90, s: 1.3, r: -3, ry: -8 }),
      k(Math.max(14, start - 10), { x: 540, y: MEDIA_TOP + 10, s: 1.3, r: 2, rx: 6 }),
      k(start + 4, { x: 540, y: 960, s: 1.1, ease: 'snap' }),
      k(hit + 4, { x: 540, y: MEDIA_TOP + 295, s: 1.32, r: -3, ease: 'snap' }),
      k(pops[0], { x: 300, y: MEDIA_TOP + 560, s: 1.3, r: -2, ease: 'snap' }),
      k(pops[1], { x: 540, y: MEDIA_TOP + 570, s: 1.3, ease: 'snap' }),
      k(pops[2], { x: 780, y: MEDIA_TOP + 560, s: 1.3, r: 2, ease: 'snap' }),
      k(dur, { x: 540, y: 1050, s: 0.98 }),
    ];
  },
  inside: (cue, dur) => {
    const meta = cue('этот', 0, dur - 60);
    const visit = (word, fb, x, y, o) => k(cue(word, 0, fb) + 2, { x, y, s: 1.45, ease: 'snap', ...o });
    return [
      ...follow(TITLE_C, 0, 20, 1.2),
      k(cue('игры', 0, 26) - 8, { x: 540, y: 1000, s: 1 }),
      visit('игры', 26, 300, 860, { r: -3, ry: -10 }),
      visit('сайты', 35, 780, 860, { r: 2, ry: 10 }),
      visit('дизайн', 44, 780, 1190, { r: 3, rx: -8 }),
      visit('видео', 53, 300, 1190, { r: -2, rx: -8 }),
      k(meta - 2, { x: 540, y: 1000, s: 0.95 }),
      k(meta + 14, { x: 540, y: 1010, s: 1.15, r: -4 }),
      k(dur, { x: 540, y: 1010, s: 1.22, r: -2 }),
    ];
  },
  versus: (cue, dur) => {
    const reveal = cue('а', 0, 70);
    return [
      ...follow(TITLE_C, 0, 20, 1.2),
      k(30, { x: 540, y: MEDIA_TOP + 200, s: 1.15, r: -3, ry: -8 }),
      k(reveal - 6, { x: 620, y: MEDIA_TOP + 180, s: 1.25, r: -2 }),
      k(reveal + 8, { x: 540, y: MEDIA_TOP + 620, s: 1.2, r: 3, ease: 'snap' }),
      k(dur, { x: 500, y: MEDIA_TOP + 570, s: 1.32, r: 1, ry: 8 }),
    ];
  },
  tg: (cue, dur) => {
    const clickAt = cue('подписывайся', 0, 120);
    const linkAt = cue('ссылка', 0, clickAt + 30);
    return [
      ...follow(TITLE_Y + 60, 0, 22, 1.25),
      k(30, { x: 540, y: TITLE_Y + 210, s: 1.3, r: 2 }),
      k(48, { x: 540, y: MEDIA_TOP + 180, s: 1.15, r: -2 }),
      k(58, { x: 380, y: MEDIA_TOP + 415, s: 1.3, r: -2, ry: -8 }),
      k(80, { x: 700, y: MEDIA_TOP + 415, s: 1.28, r: 2, ry: 8 }),
      k(clickAt - 10, { x: 560, y: MEDIA_TOP + 500, s: 1.05 }),
      k(clickAt + 4, { x: 600, y: MEDIA_TOP + 600, s: 1.35, r: -3, ease: 'snap' }),
      k(linkAt + 4, { x: 640, y: MEDIA_TOP + 680, s: 1.15 }),
      k(dur, { x: 540, y: 1100, s: 0.95 }),
    ];
  },
};

const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const faces = [
      new FontFace('Unbounded', `url(${staticFile('fonts/Unbounded.ttf')})`, { weight: '200 900' }),
      new FontFace('Dela', `url(${staticFile('fonts/DelaGothicOne.ttf')})`),
    ];
    Promise.all(faces.map((ff) => ff.load())).then((loaded) => {
      loaded.forEach((ff) => document.fonts.add(ff));
      continueRender(handle);
    });
  }, [handle]);
};

export const Reel = () => {
  useFonts();
  const g = useCurrentFrame();
  let from = 0;
  const placed = timeline.scenes.map((s) => {
    const p = { ...s, from };
    from += s.frames;
    return { ...p, cue: makeCue(p), cam: CAMS[p.id](makeCue(p), p.frames) };
  });
  const cur = placed.find((s) => g < s.from + s.frames) || placed[placed.length - 1];
  return (
    <AbsoluteFill>
      <Parallax cam={evalCam(cur.cam, g - cur.from)}>
        <Background palettes={placed.map((s) => PALETTES[s.id])} bounds={placed.map((s) => s.from)} />
      </Parallax>
      {placed.map((s) => {
        const Body = BODIES[s.id];
        const stage = STAGE[s.id];
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.frames} name={s.id}>
            <Shot dur={s.frames}>
              <CameraRig keys={s.cam}>
                {s.title?.length > 0 && s.id !== 'versus' && <KineticTitle lines={s.title} dur={s.frames} size={170} y={TITLE_Y} fx={s.id === 'plan' ? 'drop' : 'zoom'} neon={PALETTES[s.id][0]} />}
                <Body dur={s.frames} cue={s.cue} />
              </CameraRig>
            </Shot>
            {s.id !== 'tg' && <Captions words={s.words} wordStarts={s.wordStarts} voiceFrom={s.voiceFrom} frames={s.mouth.length} side={stage.side} neon={PALETTES[s.id][0]} />}
            <Narrator mouth={s.mouth} voiceFrom={s.voiceFrom} side={stage.side} enter={stage.enter} point={stage.point} />
            <Flash />
            <Html5Audio src={staticFile('sfx/whoosh.wav')} volume={0.5} />
            <Sequence from={s.voiceFrom} layout="none">
              <Html5Audio src={staticFile(s.voice)} />
            </Sequence>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
