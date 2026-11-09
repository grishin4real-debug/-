import * as THREE from 'three';
import { buildRig, headDecal, eyeOutline, HEAD } from './rig.js';
import { makeCanvas, toTexture, drawSpider } from './textures.js';

export function createVenom() {
  const goo = (map) =>
    new THREE.MeshPhysicalMaterial({
      map: map || null,
      color: map ? 0xffffff : 0x050507,
      roughness: 0.35,
      metalness: 0.0,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      sheen: 0.25,
      sheenColor: new THREE.Color(0x223366),
    });
  const black = goo();

  // Symbiote chest: veins + huge wrap-around white spider
  const [c, g] = makeCanvas(1024, 512);
  g.fillStyle = '#050507';
  g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = '#161a2c';
  g.lineWidth = 3;
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 512;
    g.beginPath();
    g.moveTo(x, y);
    g.bezierCurveTo(x + 40, y + 60, x - 40, y + 120, x + 10, y + 180);
    g.stroke();
  }
  drawSpider(g, 512, 230, 150, '#f0f0f0', { sx: 0.67, venom: true });
  const chest = goo(toTexture(c));

  const { root, J } = buildRig(
    {
      pelvis: black, abs: black, chest, neck: black, head: black,
      shoulder: black, upperArm: black, forearm: black, hand: black,
      thigh: black, shin: black, foot: black,
    },
    { w: 1.28, chest: 1.38, depth: 1.18, shoulder: 1.4, arm: 1.5, hand: 1.45, leg: 1.32, neck: 1.6, head: 1.2, scale: 1.22 },
  );

  // Trapezius bulge
  const trap = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), black);
  trap.scale.set(0.24, 0.1, 0.14);
  trap.position.set(0, 0.3, -0.04);
  trap.castShadow = true;
  J.chest.add(trap);

  // Eyes: large, jagged, sweeping up and out
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: 0xdde6ff, emissiveIntensity: 0.35, roughness: 0.3, side: THREE.DoubleSide,
  });
  for (const mirror of [false, true]) {
    J.head.add(headDecal(eyeOutline({ cx: 0.058, cy: 0.135, rx: 0.058, ry: 0.032, tilt: 0.55, point: 0.7, jag: 0.25, mirror }), eyeMat, 0.005));
  }

  // Mouth: dark interior, two rows of fangs, tongue
  const mouth = new THREE.Group();
  J.head.add(mouth);
  const gumMat = new THREE.MeshStandardMaterial({ color: 0x3a0610, roughness: 0.6 });
  const toothMat = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.35 });
  const interior = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), gumMat);
  interior.position.set(0, 0.045, 0.105);
  interior.scale.set(0.095, 0.03, 0.035);
  mouth.add(interior);

  const surfZ = (x, y) => HEAD.c * Math.sqrt(Math.max(0, 1 - (x / HEAD.a) ** 2 - ((y - HEAD.cy) / HEAD.b) ** 2));
  const toothGeo = new THREE.ConeGeometry(0.011, 0.04, 6);
  const upper = new THREE.Group();
  const lower = new THREE.Group();
  mouth.add(upper, lower);
  const N = 12;
  for (let i = 0; i < N; i++) {
    const x = -0.088 + (0.176 * i) / (N - 1);
    const len = 1 - Math.abs(x) * 4;
    const tu = new THREE.Mesh(toothGeo, toothMat);
    tu.position.set(x, 0.048, surfZ(x, 0.06) - 0.006);
    tu.rotation.x = Math.PI;
    tu.scale.y = 0.7 + len * 0.6;
    upper.add(tu);
    const tl = new THREE.Mesh(toothGeo, toothMat);
    tl.position.set(x + 0.007, 0.04, surfZ(x, 0.03) - 0.006);
    tl.scale.y = 0.6 + len * 0.5;
    lower.add(tl);
  }

  const tongue = [];
  const tongueMat = new THREE.MeshStandardMaterial({ color: 0xb0204a, roughness: 0.4 });
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), tongueMat);
    const r = 0.022 - i * 0.0016;
    s.scale.set(r * 1.4, r * 0.7, r);
    mouth.add(s);
    tongue.push(s);
  }

  // Claws
  const clawGeo = new THREE.ConeGeometry(0.009, 0.06, 5);
  const clawMat = new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.3 });
  for (const S of ['L', 'R']) {
    for (let i = 0; i < 4; i++) {
      const cl = new THREE.Mesh(clawGeo, clawMat);
      cl.position.set(-0.03 + i * 0.02, -0.12, 0.015);
      cl.rotation.x = Math.PI;
      J['hand' + S].add(cl);
    }
  }

  let open = 0;
  return {
    name: 'Веном',
    id: 'venom',
    root,
    J,
    style: { hunch: 1, venom: true },
    stats: { walk: 5.5, run: 12, jump: 13, height: 2.4, camDist: 7.5, ropeRadius: 0.04 },
    ropeMaterial: goo(),
    gooMaterial: black,
    update(t, dt, st) {
      const target = st.mode === 'attack' ? 1 : st.mode === 'run' && st.run ? 0.55 : 0.18 + Math.sin(t * 1.3) * 0.08;
      open += (target - open) * (1 - Math.exp(-dt * 10));
      lower.position.y = -open * 0.05;
      upper.position.y = open * 0.012;
      interior.scale.y = 0.03 + open * 0.03;
      interior.position.y = 0.045 - open * 0.02;
      // tongue lolls out and down, whipping when the mouth opens
      for (let i = 0; i < tongue.length; i++) {
        const u = i / (tongue.length - 1);
        const out = 0.3 + open * 0.9;
        tongue[i].position.set(
          Math.sin(t * 5 + u * 4) * 0.02 * u * (0.5 + open),
          0.035 - open * 0.03 - u * u * 0.12 * out,
          0.1 + u * 0.08 * out,
        );
      }
    },
  };
}
