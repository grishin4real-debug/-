// Renders preview stills: node scripts/stills.mjs <frame> [<frame> ...] -> out/still_<frame>.png
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.jsx') });
const composition = await selectComposition({ serveUrl, id: 'Reel' });
for (const f of process.argv.slice(2).map(Number)) {
  await renderStill({ serveUrl, composition, frame: f, output: path.join(root, `out/still_${f}.png`), scale: 0.5 });
  console.log('still', f);
}
