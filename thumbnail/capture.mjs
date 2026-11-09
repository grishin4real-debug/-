// Captures hero frames from the running 3D game for the thumbnail.
// Usage: node capture.mjs [url]
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:5173/';
const out = new URL('./shots/', import.meta.url).pathname;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 760, height: 760 } });
await p.goto(url);
await p.addStyleTag({ content: '#hud{display:none!important}' });
await p.waitForTimeout(3000);
const snap = (name) => p.screenshot({ path: `${out}${name}.png`, timeout: 90000 });

// Spider-Man: superhero landing, low front camera. landT is pinned so the pose holds.
await p.evaluate(() => {
  const g = __game;
  g.setHero('spider', false);
  g.P.pos.set(3, 0, 16);
  g.P.yaw = 0.35;
  g.P.landT = 1e9;
  g.cam.yaw = Math.PI + 0.35;
  g.cam.pitch = -0.12;
  g.cam.zoom = 0.4;
});
await p.waitForTimeout(3500);
await snap('spider_land');

// Venom: tentacle attack, facing the camera
await p.evaluate(() => {
  const g = __game;
  g.P.landT = 0;
  g.setHero('venom', false);
  g.cam.yaw = Math.PI - 0.3;
  g.cam.pitch = -0.08;
  g.cam.zoom = 0.42;
  g.P.yaw = -0.3;
});
await p.waitForTimeout(3500);
// attack() aims along the camera, so briefly point the camera along Venom's facing
await p.evaluate(() => {
  const g = __game;
  g.cam.yaw = -0.3;
  g.attack();
  g.cam.yaw = Math.PI - 0.3;
});
await p.waitForTimeout(200);
await snap('venom_attack');
await b.close();
