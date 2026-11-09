import * as THREE from 'three';
import { buildRig, headDecal, eyeOutline } from './rig.js';
import { makeCanvas, toTexture, webPattern, webTexture, drawSpider } from './textures.js';

export function createSpiderMan() {
  const RED = '#c8102e';
  const BLUE = '#1d3c9e';
  const LINE = '#2a0508';

  const suit = (map, color) =>
    new THREE.MeshStandardMaterial({ map, color: map ? 0xffffff : color, roughness: 0.55, metalness: 0.05 });

  const redWeb = suit(webTexture(RED, LINE, 14, 10));
  const blue = suit(null, BLUE);

  // Chest: canvas is 2:1; torso circumference/height ~ 2.45, so squeeze the emblem horizontally.
  const [cc, cg] = makeCanvas(1024, 512);
  webPattern(cg, 1024, 512, RED, LINE, 28, 10);
  drawSpider(cg, 512, 190, 150, '#0b0b0b', { sx: 0.82 });
  // back emblem (u = 0 / 1 ends up on the back)
  drawSpider(cg, 0, 210, 200, '#b30d26', { sx: 0.82 });
  drawSpider(cg, 1024, 210, 200, '#b30d26', { sx: 0.82 });
  const chest = suit(toTexture(cc));

  // Abs: red front panel, blue sides
  const [ac, ag] = makeCanvas(512, 256);
  ag.fillStyle = BLUE;
  ag.fillRect(0, 0, 512, 256);
  const [pc, pg] = makeCanvas(200, 256);
  webPattern(pg, 200, 256, RED, LINE, 6, 5);
  ag.drawImage(pc, 156, 0);
  const abs = suit(toTexture(ac));

  const head = suit(webTexture(RED, LINE, 24, 12));
  const glove = suit(webTexture(RED, LINE, 10, 6));

  const { root, J } = buildRig(
    {
      pelvis: blue, abs, chest, neck: redWeb, head,
      shoulder: redWeb, upperArm: blue, forearm: glove, hand: glove,
      thigh: blue, shin: redWeb, foot: redWeb,
    },
    { w: 1, chest: 1, depth: 1, shoulder: 1, arm: 1, hand: 1, leg: 1, neck: 1, head: 1, scale: 0.97 },
  );

  // Big white lenses with thick black frames
  const black = new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.DoubleSide });
  const white = new THREE.MeshStandardMaterial({
    color: 0xf4f6ff, roughness: 0.2, emissive: 0x9aa4c8, emissiveIntensity: 0.25, side: THREE.DoubleSide,
  });
  for (const mirror of [false, true]) {
    const base = { cx: 0.05, cy: 0.122, tilt: 0.42, point: 0.45, mirror };
    J.head.add(headDecal(eyeOutline({ ...base, rx: 0.05, ry: 0.034 }), black, 0.004));
    J.head.add(headDecal(eyeOutline({ ...base, rx: 0.04, ry: 0.025 }), white, 0.007));
  }

  // Web-shooter nubs on the wrists
  for (const S of ['L', 'R']) {
    const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.3 }));
    nub.position.set(0, 0.0, 0.04);
    nub.rotation.x = Math.PI / 2;
    J['hand' + S].add(nub);
  }

  return {
    name: 'Человек-паук',
    id: 'spider',
    root,
    J,
    style: { hunch: 0, venom: false },
    stats: { walk: 6, run: 13, jump: 12, height: 1.9, camDist: 6, ropeRadius: 0.016 },
    ropeMaterial: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, emissive: 0x777777, roughness: 0.6 }),
    update() {},
  };
}
