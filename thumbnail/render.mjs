// Renders thumbnail.html to thumbnail.png (1280x720) and a small preview as it looks in the YouTube feed.
// Usage: node render.mjs ["title"] ["promo"]
import { chromium } from 'playwright';

const dir = new URL('./', import.meta.url).pathname;
const qs = new URLSearchParams();
if (process.argv[2]) qs.set('title', process.argv[2]);
if (process.argv[3]) qs.set('promo', process.argv[3]);

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(`file://${dir}thumbnail.html?${qs}`);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
await p.locator('#thumb').screenshot({ path: `${dir}thumbnail.png` });

// sidebar-sized check (~246px wide)
const img = `data:image/png;base64,${(await import('node:fs')).readFileSync(`${dir}thumbnail.png`).toString('base64')}`;
const s = await b.newPage({ viewport: { width: 450, height: 160 } });
await s.setContent(`<body style="margin:8px;background:#0f0f0f;display:flex;gap:12px">
  <img src="${img}" width="246" style="border-radius:8px">
  <img src="${img}" width="168" style="border-radius:6px;align-self:start"></body>`);
await s.waitForTimeout(300);
await s.screenshot({ path: `${dir}preview-small.png` });
await b.close();
console.log('ok');
