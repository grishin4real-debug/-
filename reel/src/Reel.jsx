import { useEffect, useState } from 'react';
import {
  AbsoluteFill, Sequence, Html5Audio, Img, staticFile, useCurrentFrame, useVideoConfig,
  interpolate, spring, delayRender, continueRender, Easing,
} from 'remotion';
import timeline from './timeline.json';
import { Background } from './Background.jsx';
import { KineticTitle } from './KineticTitle.jsx';
import { ScreenCam, Cursor, Ripple, track } from './ScreenCam.jsx';
import { Narrator } from './Narrator.jsx';
import { Captions } from './Captions.jsx';
import { PixelScene } from './PixelScene.jsx';

const TITLE_Y = 250;
const MEDIA_TOP = 700;

// per-scene backdrop colours [blob1, blob2, blob3]
const PALETTES = {
  hook: ['#ff2a4d', '#6d28d9', '#1d4ed8'],
  plan: ['#1d4ed8', '#ff2a4d', '#0ea5e9'],
  coupon: ['#16a34a', '#facc15', '#0d9488'],
  models: ['#7c3aed', '#db2777', '#2563eb'],
  prompt: ['#ea580c', '#be123c', '#7c3aed'],
  versus: ['#e11d48', '#2563eb', '#111827'],
  game: ['#111827', '#e11d48', '#4338ca'],
  cta: ['#ff2a4d', '#facc15', '#6d28d9'],
};

/** Zoom-blur in/out wrapper so every cut feels like a camera move. */
const Shot = ({ dur, children }) => {
  const f = useCurrentFrame();
  const inn = interpolate(f, [0, 10], [1, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const out = interpolate(f, [dur - 8, dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) });
  const push = interpolate(f, [0, dur], [1, 1.04]);
  return (
    <AbsoluteFill style={{ transform: `scale(${(1 + inn * 0.25 - out * 0.12) * push})`, filter: `blur(${(inn + out) * 18}px)`, opacity: 1 - out }}>
      {children}
    </AbsoluteFill>
  );
};

const Floating = ({ src, x, y, w, rot, delay = 0, depth = 1 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 13, stiffness: 110 } });
  return (
    <Img
      src={staticFile(src)}
      style={{
        position: 'absolute', left: x, top: y + Math.sin((f + delay * 3) / 22) * 16 * depth, width: w, aspectRatio: '1',
        objectFit: 'cover', borderRadius: 40,
        transform: `perspective(1200px) rotateY(${rot + Math.sin(f / 30) * 6}deg) rotateZ(${rot / 4}deg) scale(${s})`,
        boxShadow: '0 40px 100px rgba(0,0,0,.6), 0 0 0 3px rgba(255,255,255,.2)',
      }}
    />
  );
};

const Flash = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 2, 8], [0, 0.85, 0], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ background: '#fff', opacity: o, pointerEvents: 'none' }} />;
};

// ----- scene bodies -----
const Hook = ({ dur }) => (
  <>
    <Floating src="img/venom_attack.png" x={540} y={1020} w={460} rot={-16} delay={20} />
    <Floating src="img/spider_land.png" x={80} y={1080} w={420} rot={14} delay={28} depth={-1} />
    <KineticTitle lines={[['OPUS', '5.5'], ['+', 'GPT', '6.1'], ['*БЕСПЛАТНО*']]} dur={dur} size={200} y={TITLE_Y} />
    <Sequence from={44} layout="none">
      <KineticTitle lines={[['НА', '*3*', 'МЕСЯЦА']]} dur={dur - 44} size={110} y={TITLE_Y + 640} />
    </Sequence>
  </>
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

const Coupon = ({ dur }) => (
  <>
    <ScreenCam
      src="clips/coupon.mp4" top={MEDIA_TOP}
      cam={[
        { t: 0, x: 430, y: 430, s: 1.4 }, { t: 1.2, x: 430, y: 440, s: 2.1 }, { t: 6, x: 435, y: 450, s: 2.2 },
        { t: 8.6, x: 420, y: 360, s: 1.6 }, { t: 10.2, x: 340, y: 300, s: 2.2 }, { t: 12, x: 330, y: 240, s: 2.6 },
      ]}
      cursor={[{ t: 0, x: 440, y: 440 }, { t: 6, x: 560, y: 450 }, { t: 8, x: 560, y: 450 }, { t: 12, x: 560, y: 480 }]}
      clicks={[{ t: 0.4, x: 440, y: 432 }]}
    />
    <Sequence from={Math.round(dur - 78)} layout="none">
      <KineticTitle lines={[['*−100%*']]} dur={78} size={200} y={MEDIA_TOP + 600} />
      <Html5Audio src={staticFile('sfx/boom.wav')} volume={0.8} />
    </Sequence>
  </>
);

const Models = () => (
  <ScreenCam
    src="clips/models.mp4" top={MEDIA_TOP}
    cam={[
      { t: 0, x: 700, y: 360, s: 1.2 }, { t: 2, x: 650, y: 470, s: 1.8 }, { t: 4.2, x: 620, y: 410, s: 2.7 },
      { t: 6.5, x: 620, y: 410, s: 2.7 }, { t: 8.2, x: 640, y: 450, s: 2.8 },
    ]}
    cursor={[{ t: 0, x: 900, y: 600 }, { t: 2, x: 700, y: 560 }, { t: 4.2, x: 640, y: 398 }, { t: 6.5, x: 650, y: 400 }, { t: 8.2, x: 660, y: 455 }]}
    clicks={[{ t: 4.4, x: 640, y: 398 }, { t: 8.4, x: 660, y: 455 }]}
  />
);

const Prompt = () => (
  <ScreenCam
    src="clips/prompt.mp4" top={MEDIA_TOP}
    cam={[{ t: 0, x: 780, y: 420, s: 1.3 }, { t: 2, x: 780, y: 430, s: 1.9 }, { t: 4.5, x: 700, y: 480, s: 2.4 }, { t: 7, x: 820, y: 560, s: 2.4 }]}
    cursor={[{ t: 0, x: 1000, y: 500 }, { t: 3, x: 640, y: 486 }, { t: 5, x: 650, y: 488 }, { t: 7, x: 829, y: 568 }]}
    clicks={[{ t: 3.4, x: 640, y: 486 }, { t: 7.3, x: 829, y: 568 }]}
  />
);

const Versus = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame: f - 6, fps, config: { damping: 14 } });
  const reveal = 75;
  const b = spring({ frame: f - reveal, fps, config: { damping: 14 } });
  const kb = interpolate(f, [reveal, dur], [1.1, 1.25]);
  const venom = interpolate(f, [reveal + 70, reveal + 82], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const panel = { position: 'absolute', left: 40, width: 1000, height: 430, borderRadius: 40, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.6), 0 0 0 3px rgba(255,255,255,.18)' };
  return (
    <>
      <div style={{ ...panel, top: MEDIA_TOP - 40, transform: `translateX(${(1 - a) * -1200}px) rotate(-2deg)`, filter: `saturate(${f > reveal ? 0.35 : 1})`, transition: 'none' }}>
        <PixelScene width={1000} height={430} />
      </div>
      <div style={{ ...panel, top: MEDIA_TOP + 430, transform: `translateX(${(1 - b) * 1200}px) rotate(2deg)` }}>
        <Img src={staticFile('img/spider_land.png')} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 72%', transform: `scale(${kb})`, transformOrigin: '50% 72%' }} />
        <Img src={staticFile('img/venom_attack.png')} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 62%', opacity: venom, transform: `scale(${kb})`, transformOrigin: '50% 62%' }} />
      </div>
      <Sequence from={10} layout="none">
        <div style={{ position: 'absolute', inset: 0, transform: 'translateX(330px)' }}>
          <KineticTitle lines={[['*2D*']]} dur={dur - 10} size={130} y={MEDIA_TOP + 260} />
        </div>
      </Sequence>
      <Sequence from={reveal} layout="none">
        <div style={{ position: 'absolute', inset: 0, transform: 'translateX(330px)' }}>
          <KineticTitle lines={[['*3D*']]} dur={dur - reveal} size={130} y={MEDIA_TOP + 700} />
        </div>
        <Flash />
        <Html5Audio src={staticFile('sfx/boom.wav')} volume={0.9} />
      </Sequence>
    </>
  );
};

const Game = () => (
  <ScreenCam
    src="clips/game.mp4" top={MEDIA_TOP}
    cam={[{ t: 0, x: 677, y: 420, s: 1.5 }, { t: 2.5, x: 677, y: 440, s: 1.9 }, { t: 3.6, x: 677, y: 420, s: 1.5 }, { t: 6.4, x: 677, y: 430, s: 1.9 }]}
  />
);

const Cta = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clickT = 70;
  const cur = [{ t: 0, x: 1150, y: 1500 }, { t: 1.6, x: 640, y: 1290 }, { t: 3, x: 650, y: 1300 }];
  const t = f / fps;
  const press = Math.max(0, 1 - Math.abs(f - clickT) / 6);
  const bounce = spring({ frame: f - clickT, fps, config: { damping: 6, stiffness: 200 } });
  return (
    <>
      <KineticTitle lines={[['*CLOUDFIRST*']]} dur={dur} size={140} y={MEDIA_TOP + 80} delay={18} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1180, transform: `scale(${1 + (f > clickT ? (1 - bounce) * -0.25 + 0.0 : 0)})` }}>
        <KineticTitle lines={[['ПОДПИШИСЬ']]} dur={dur} size={120} delay={34} />
      </div>
      <Ripple x={650} y={1290} age={f - clickT} />
      <Cursor x={track(cur, t, 'x')} y={track(cur, t, 'y')} press={press} />
      <Sequence from={clickT} layout="none"><Html5Audio src={staticFile('sfx/click.wav')} volume={0.6} /></Sequence>
    </>
  );
};

const BODIES = { hook: Hook, plan: Plan, coupon: Coupon, models: Models, prompt: Prompt, versus: Versus, game: Game, cta: Cta };

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
        const showTitle = s.id !== 'hook' && s.id !== 'cta';
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.frames} name={s.id}>
            <Shot dur={s.frames}>
              {showTitle && <KineticTitle lines={s.title} dur={s.frames} size={170} y={TITLE_Y} />}
              {s.id === 'cta' && <KineticTitle lines={s.title} dur={s.frames} size={130} y={TITLE_Y} />}
              <Body dur={s.frames} />
            </Shot>
            <Captions say={s.say} voiceFrom={s.voiceFrom} frames={s.mouth.length} />
            <Narrator mouth={s.mouth} voiceFrom={s.voiceFrom} />
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
