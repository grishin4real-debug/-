import { useEffect, useRef } from 'react';
import { useCurrentFrame } from 'remotion';

const SPRITE = [
  '....RRRR....', '...RRRRRR...', '..RWWRRWWR..', '..RWKRRKWR..', '..RRRRRRRR..', '...RRRRRR...',
  '.BBRRKKRRBB.', 'BBRRRKKRRRBB', 'RR.RRKKRR.RR', 'RR.RRRRRR.RR', '...BBBBBB...', '...BB..BB...',
  '..BB....BB..', '..BB....BB..', '.RRR....RRR.', '.RRR....RRR.',
];
const COL = { R: '#e01020', B: '#2038d0', W: '#fff', K: '#000' };

/** Retro 8-bit "old AI" platformer, drawn at 160x200 and upscaled with hard pixels. */
export const PixelScene = ({ width, height }) => {
  const ref = useRef(null);
  const frame = useCurrentFrame();
  useEffect(() => {
    const g = ref.current.getContext('2d');
    const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
    const W = 160;
    const H = 200;
    const scroll = Math.floor(frame / 3) % 24;
    px(0, 0, W, H, '#5c94fc');
    for (const [x, y] of [[10, 30], [90, 18], [60, 50]]) {
      const cx = ((x - frame / 6) % 190 + 190) % 190 - 30;
      px(cx, y + 4, 26, 6, '#fff'); px(cx + 4, y, 16, 4, '#fff');
    }
    const blds = [[0, 90, 30], [32, 70, 26], [60, 100, 28], [92, 80, 24], [118, 96, 42]];
    for (const [x, y, w] of blds) {
      px(x, y, w, 160 - y, '#2e3a73');
      for (let wy = y + 4; wy < 156; wy += 7) for (let wx = x + 3; wx < x + w - 3; wx += 6) px(wx, wy, 3, 4, (wx * 7 + wy * 3) % 5 ? '#1c2450' : '#ffd35a');
    }
    px(0, 160, W, 40, '#c84c0c');
    for (let y = 160; y < 200; y += 8) for (let x = ((y / 8) % 2 ? 0 : -6) - scroll; x < W; x += 12) {
      px(x, y, 11, 1, '#fcbcb0'); px(x, y, 1, 7, '#fcbcb0'); px(x, y + 7, 12, 1, '#000');
    }
    // coin blink
    if (Math.floor(frame / 8) % 2) for (const x of [100, 112, 124]) px(x, 112, 4, 7, '#fcd000');
    // hopping sprite with jerky 2-frame animation
    const hop = Math.abs(Math.sin(frame / 10)) * 26;
    const sx = 30;
    const sy = 112 - Math.floor(hop / 2) * 2;
    SPRITE.forEach((row, y) => [...row].forEach((ch, x) => { if (COL[ch]) px(sx + x * 3, sy + y * 3, 3, 3, COL[ch]); }));
    // enemy blob walking
    const ex = 140 - ((frame * 0.7) % 90);
    px(ex, 150, 12, 8, '#7a3b10'); px(ex + 2, 152, 2, 2, '#fff'); px(ex + 8, 152, 2, 2, '#fff');
  }, [frame]);
  return <canvas ref={ref} width={160} height={200} style={{ width, height, imageRendering: 'pixelated', display: 'block', objectFit: 'cover' }} />;
};
