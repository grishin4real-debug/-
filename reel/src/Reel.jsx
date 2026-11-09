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

const TITLE_Y = 230;
const MEDIA_TOP = 680;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const TG = timeline.telegram || '';

// per-scene backdrop colours [blob1, blob2, blob3]
const PALETTES = {
  hook: ['#ff2a4d', '#facc15', '#6d28d9'],
  plan: ['#1d4ed8', '#ff2a4d', '#0ea5e9'],
  coupon: ['#16a34a', '#facc15', '#0d9488'],
  zero: ['#facc15', '#ea580c', '#16a34a'],
  inside: ['#7c3aed', '#db2777', '#2563eb'],
  versus: ['#e11d48', '#2563eb', '#111827'],
  tg: ['#0ea5e9', '#229ED9', '#6d28d9'],
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
  const o = interpolate(f, [0, 2, 8], [0, 0.85, 0], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ background: color, opacity: o, pointerEvents: 'none' }} />;
};

const Boom = ({ at }) => (
  <Sequence from={at} layout="none">
    <Flash />
    <Html5Audio src={staticFile('sfx/boom.wav')} volume={0.9} />
  </Sequence>
);

/** Glossy "ticket" card with a price that rolls down to 0. */
const PriceTicket = ({ at, y, from = 20, label = 'PLUS · 3 МЕСЯЦА' }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inn = spring({ frame: f - at, fps, config: { damping: 11, stiffness: 120 } });
  const float = Math.sin(f / 18) * 14;
  const shine = ((f - at) * 22) % 1600 - 400;
  return (
    <div
      style={{
        position: 'absolute', left: 140, top: y, width: 800, height: 520, borderRadius: 56,
        background: 'linear-gradient(140deg, #FFE14D 0%, #FFB020 55%, #FF6A00 100%)',
        boxShadow: '0 14px 0 #9A3412, 0 50px 120px rgba(0,0,0,.55), inset 0 0 0 6px rgba(255,255,255,.45)',
        transform: `perspective(1400px) translateY(${(1 - inn) * 900 + float}px) rotateX(${(1 - inn) * 50 + Math.sin(f / 25) * 6}deg) rotateY(${Math.sin(f / 31) * 10}deg) rotate(${(1 - inn) * -20 - 3}deg)`,
        overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{ position: 'absolute', top: -200, bottom: -200, left: shine, width: 160, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.7), transparent)', transform: 'rotate(20deg)' }} />
      {/* ticket notches */}
      <div style={{ position: 'absolute', left: -50, top: 210, width: 100, height: 100, borderRadius: '50%', background: '#0b0b12' }} />
      <div style={{ position: 'absolute', right: -50, top: 210, width: 100, height: 100, borderRadius: '50%', background: '#0b0b12' }} />
      <div style={{ fontFamily: 'Unbounded', fontWeight: 800, fontSize: 52, color: '#3B1203', letterSpacing: 2 }}>{label}</div>
      <Counter from={from} to={0} start={at + 14} len={34} size={300} prefix="$" color="#1A0A00" />
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

const Plan = () => (
  <ScreenCam
    src="clips/plan.mp4" top={MEDIA_TOP}
    cam={[
      { t: 0, x: 677, y: 420, s: 1.12 }, { t: 1.6, x: 677, y: 440, s: 1.25 },
      { t: 3.2, x: 677, y: 470, s: 2.1 }, { t: 5, x: 677, y: 560, s: 2.6 }, { t: 7.5, x: 677, y: 560, s: 2.6 },
    ]}
    cursor={[{ t: 0, x: 980, y: 660 }, { t: 1.2, x: 761, y: 590 }, { t: 3.8, x: 610, y: 600 }, { t: 5.3, x: 664, y: 582 }, { t: 9, x: 690, y: 640 }]}
    clicks={[{ t: 5.6, x: 664, y: 582 }]}
  />
);

const Coupon = ({ dur }) => {
  const at = Math.round(dur - 95);
  return (
    <Shake at={[at]}>
      <ScreenCam
        src="clips/coupon.mp4" top={MEDIA_TOP}
        cam={[
          { t: 0, x: 430, y: 430, s: 1.4 }, { t: 1.2, x: 430, y: 440, s: 2.1 }, { t: 6, x: 435, y: 450, s: 2.2 },
          { t: 8.6, x: 420, y: 360, s: 1.6 }, { t: 10.2, x: 340, y: 300, s: 2.2 }, { t: 12, x: 330, y: 240, s: 2.6 },
        ]}
        cursor={[{ t: 0, x: 440, y: 440 }, { t: 6, x: 560, y: 450 }, { t: 8, x: 560, y: 450 }, { t: 12, x: 560, y: 480 }]}
        clicks={[{ t: 0.4, x: 440, y: 432 }]}
      />
      <Sequence from={at} layout="none">
        <div style={{ position: 'absolute', inset: 0, transform: 'rotate(-6deg)' }}>
          <KineticTitle lines={[['*−100%*']]} dur={95} size={230} y={MEDIA_TOP + 520} fx="glitch" stagger={1.2} />
        </div>
      </Sequence>
      <Boom at={at} />
      <Confetti at={at + 2} y={MEDIA_TOP + 640} n={50} />
    </Shake>
  );
};

const Zero = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const strike = interpolate(f, [26, 40], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const old = spring({ frame: f - 6, fps, config: { damping: 12 } });
  const months = ['МЕС 1', 'МЕС 2', 'МЕС 3'];
  return (
    <Shake at={[72]}>
      <KineticTitle lines={[['ЦЕНА']]} dur={dur} size={170} y={TITLE_Y} fx="glitch" />
      {/* old price with drawn strike-through */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: MEDIA_TOP - 10, display: 'flex', justifyContent: 'center', transform: `scale(${old}) rotate(-4deg)` }}>
        <div style={{ position: 'relative', fontFamily: 'Unbounded', fontWeight: 900, fontSize: 150, color: 'rgba(255,255,255,.75)' }}>
          $20<span style={{ fontSize: 60 }}>/мес</span>
          <div style={{ position: 'absolute', left: -20, top: '52%', height: 22, width: `${strike * 112}%`, background: '#FF3D71', borderRadius: 11, transform: 'rotate(-8deg)', boxShadow: '0 6px 20px rgba(255,61,113,.7)' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: MEDIA_TOP + 190, display: 'flex', justifyContent: 'center' }}>
        <Counter from={20} to={0} start={44} len={28} size={420} prefix="$" color="#FFE14D" />
      </div>
      {/* three month stamps */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: MEDIA_TOP + 680, display: 'flex', justifyContent: 'center', gap: 34 }}>
        {months.map((m, i) => {
          const p = spring({ frame: f - 90 - i * 8, fps, config: { damping: 8, stiffness: 180 } });
          return (
            <div key={m} style={{ width: 260, height: 150, borderRadius: 30, background: '#fff', color: '#111', fontFamily: 'Unbounded', fontWeight: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: `scale(${p}) rotate(${(1 - p) * 40 + (i - 1) * 5}deg)`, boxShadow: '0 10px 0 #16A34A, 0 30px 50px rgba(0,0,0,.4)' }}>
              <div style={{ fontSize: 30, opacity: 0.6 }}>{m}</div>
              <div style={{ fontSize: 62, color: '#16A34A' }}>$0</div>
            </div>
          );
        })}
      </div>
      <Boom at={72} />
      <Confetti at={72} y={MEDIA_TOP + 400} n={90} power={1.2} />
      {months.map((_, i) => (
        <Sequence key={i} from={90 + i * 8} durationInFrames={10} layout="none"><Html5Audio src={staticFile('sfx/tick.wav')} /></Sequence>
      ))}
    </Shake>
  );
};

const Inside = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cards = [
    ['ИГРЫ', '#FF3D71', '#7C3AED'], ['САЙТЫ', '#38BDF8', '#2563EB'],
    ['ВИДЕО', '#FACC15', '#EA580C'], ['ДИЗАЙН', '#22C55E', '#0D9488'],
  ];
  const meta = Math.round(dur - 120);
  return (
    <>
      <KineticTitle lines={[['ЧТО'], ['*ВНУТРИ?*']]} dur={dur} size={170} y={TITLE_Y} fx="wave" />
      <div style={{ position: 'absolute', left: 70, right: 70, top: MEDIA_TOP + 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36 }}>
        {cards.map(([t, a, b], i) => {
          // cards fly in, then collapse away when the "this reel" punchline lands
          const p = spring({ frame: f - 20 - i * 9, fps, config: { damping: 10, stiffness: 130 } })
            - spring({ frame: f - meta + i * 2, fps, config: { damping: 14, stiffness: 160 } });
          const hover = Math.sin((f + i * 20) / 14) * 10;
          return (
            <div
              key={t}
              style={{
                height: 300, borderRadius: 44, background: `linear-gradient(140deg, ${a}, ${b})`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Unbounded', fontWeight: 900, fontSize: 72, color: '#fff', textShadow: '0 6px 0 rgba(0,0,0,.25)',
                transform: `perspective(1000px) rotateY(${(1 - p) * 120}deg) translateY(${hover}px) rotate(${(i % 2 ? 1 : -1) * 2}deg)`,
                opacity: p > 0.02 ? 1 : 0,
                boxShadow: '0 30px 70px rgba(0,0,0,.5), inset 0 0 0 4px rgba(255,255,255,.3)',
              }}
            >
              {t}
            </div>
          );
        })}
      </div>
      <Sequence from={meta} layout="none">
        <div style={{ position: 'absolute', inset: 0, transform: 'rotate(-4deg)' }}>
          <KineticTitle lines={[['ЭТОТ', 'РОЛИК'], ['*ТОЖЕ*', 'ОН!']]} dur={120} size={150} y={MEDIA_TOP + 180} fx="drop" stagger={1.6} />
        </div>
        <Html5Audio src={staticFile('sfx/ding.wav')} volume={0.7} />
      </Sequence>
    </>
  );
};

const Versus = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame: f - 6, fps, config: { damping: 14 } });
  const reveal = 70;
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

const Tg = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame: f - 8, fps, config: { damping: 7, stiffness: 140 } });
  const clickAt = 150;
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
  const cur = [{ t: 0, x: 1200, y: 1700 }, { t: 3.2, x: 1200, y: 1700 }, { t: 4.8, x: 600, y: MEDIA_TOP + 590 }, { t: 7, x: 640, y: MEDIA_TOP + 620 }];
  const press = Math.max(0, 1 - Math.abs(f - clickAt) / 6);

  return (
    <Shake at={[clickAt]}>
      <KineticTitle lines={[['*ПОДПИШИСЬ*']]} dur={dur} size={150} y={TITLE_Y - 20} fx="drop" stagger={2} />
      <Sequence from={14} layout="none">
        <KineticTitle lines={[['НА', 'МОЙ', 'ТЕЛЕГРАМ']]} dur={dur - 14} size={84} y={TITLE_Y + 170} fx="wave" stagger={1.4} />
      </Sequence>
      <svg width="1080" height="1920" style={{ position: 'absolute', inset: 0 }}>
        <polyline points={trail.map((p) => p.join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="6" strokeDasharray="14 14" strokeLinecap="round" />
      </svg>
      {f >= 20 && f <= 84 && (
        <div style={{ position: 'absolute', left: px - 50, top: py - 50, transform: `rotate(${f * 8}deg)` }}>
          <svg width="100" height="100" viewBox="0 0 24 24"><path d="M2 11 L22 3 L18 21 L11 15 L8 20 L8 14 L18 6 L6 13 Z" fill="#fff" /></svg>
        </div>
      )}
      <div style={{ position: 'absolute', left: 540 - 170, top: MEDIA_TOP, transform: `scale(${logo}) rotate(${(1 - logo) * -180 + Math.sin(f / 12) * 6}deg)`, filter: 'drop-shadow(0 30px 60px rgba(34,158,217,.7))' }}>
        <TgLogo size={340} />
      </div>
      {TG && (
        <Sequence from={50} layout="none">
          <KineticTitle lines={[[TG]]} dur={dur - 50} size={92} y={MEDIA_TOP + 370} fx="slice" stagger={1.3} color="#fff" charW={0.8} />
        </Sequence>
      )}
      <div
        style={{
          position: 'absolute', left: 140, width: 800, top: MEDIA_TOP + 520, height: 160, borderRadius: 80,
          background: clicked ? 'linear-gradient(90deg,#22C55E,#16A34A)' : 'linear-gradient(90deg,#2AABEE,#1E88D9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
          fontFamily: 'Unbounded', fontWeight: 900, fontSize: 64, color: '#fff',
          transform: `scale(${btn * pulse})`,
          boxShadow: `0 12px 0 ${clicked ? '#14532D' : '#0B4F7A'}, 0 0 ${glow}px ${clicked ? 'rgba(34,197,94,.8)' : 'rgba(42,171,238,.9)'}`,
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
      <Sequence from={clickAt + 30} layout="none">
        <KineticTitle lines={[['ССЫЛКА', 'В', '*ОПИСАНИИ*']]} dur={dur - clickAt - 30} size={74} y={MEDIA_TOP + 730} fx="zoom" stagger={1.2} />
      </Sequence>
    </Shake>
  );
};

const BODIES = { hook: Hook, plan: Plan, coupon: Coupon, zero: Zero, inside: Inside, versus: Versus, tg: Tg };

const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const ff = new FontFace('Unbounded', `url(${staticFile('fonts/Unbounded.ttf')})`, { weight: '200 900' });
    ff.load().then((f) => { document.fonts.add(f); continueRender(handle); });
  }, [handle]);
};

export const Reel = () => {
  useFonts();
  let from = 0;
  const placed = timeline.scenes.map((s) => {
    const p = { ...s, from };
    from += s.frames;
    return p;
  });
  return (
    <AbsoluteFill>
      <Background palettes={placed.map((s) => PALETTES[s.id])} bounds={placed.map((s) => s.from)} />
      {placed.map((s) => {
        const Body = BODIES[s.id];
        const stage = STAGE[s.id];
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.frames} name={s.id}>
            <Shot dur={s.frames}>
              {s.title?.length > 0 && s.id !== 'versus' && <KineticTitle lines={s.title} dur={s.frames} size={170} y={TITLE_Y} fx={s.id === 'plan' ? 'drop' : 'zoom'} />}
              <Body dur={s.frames} />
            </Shot>
            {s.id !== 'tg' && <Captions words={s.words} wordStarts={s.wordStarts} voiceFrom={s.voiceFrom} frames={s.mouth.length} side={stage.side} />}
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
