import * as THREE from 'three';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

export function toTexture(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

// Spider-Man suit webbing: meridians plus scalloped rings that sag away from the top edge.
export function webPattern(g, w, h, base, line, cols = 16, rows = 12) {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = line;
  g.lineWidth = Math.max(1.6, w / 320);
  const cw = w / cols;
  const rh = h / rows;
  for (let i = 0; i <= cols; i++) {
    g.beginPath();
    g.moveTo(i * cw, 0);
    g.lineTo(i * cw, h);
    g.stroke();
  }
  for (let j = 1; j < rows; j++) {
    const y = j * rh;
    g.beginPath();
    for (let i = 0; i < cols; i++) {
      g.moveTo(i * cw, y);
      g.quadraticCurveTo(i * cw + cw / 2, y + rh * 0.35, (i + 1) * cw, y);
    }
    g.stroke();
  }
}

export function webTexture(base, line, cols, rows, size = 512) {
  const [c, g] = makeCanvas(size, size);
  webPattern(g, size, size, base, line, cols, rows);
  return toTexture(c);
}

// Spider emblem. sx compensates for non-uniform UV stretch on the torso.
// venom = true draws the long wrap-around legs of the symbiote logo.
export function drawSpider(g, cx, cy, size, color, { sx = 1, venom = false } = {}) {
  g.save();
  g.translate(cx, cy);
  g.scale(sx, 1);
  g.fillStyle = color;
  g.strokeStyle = color;
  g.lineCap = 'round';
  g.lineJoin = 'round';

  if (venom) {
    // body
    g.beginPath();
    g.ellipse(0, -size * 0.05, size * 0.16, size * 0.3, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(0, size * 0.32, size * 0.1, size * 0.2, 0, 0, Math.PI * 2);
    g.fill();
    const legs = [
      // upper legs sweep over the shoulders, lower legs wrap around the waist
      [[0.1, -0.2], [0.7, -0.55], [1.5, -0.9], [2.4, -1.0]],
      [[0.12, -0.05], [0.9, -0.2], [1.8, -0.25], [2.8, -0.15]],
      [[0.12, 0.08], [0.9, 0.25], [1.8, 0.45], [2.7, 0.7]],
      [[0.1, 0.2], [0.6, 0.6], [1.2, 1.0], [1.8, 1.4]],
    ];
    for (const s of [1, -1]) {
      for (const leg of legs) {
        for (let i = 0; i < leg.length - 1; i++) {
          g.lineWidth = size * (0.13 - i * 0.035);
          g.beginPath();
          g.moveTo(leg[i][0] * size * s, leg[i][1] * size);
          g.lineTo(leg[i + 1][0] * size * s, leg[i + 1][1] * size);
          g.stroke();
        }
      }
    }
  } else {
    g.beginPath();
    g.ellipse(0, -size * 0.12, size * 0.1, size * 0.15, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(0, size * 0.2, size * 0.08, size * 0.2, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(0, -size * 0.33, size * 0.06, size * 0.07, 0, 0, Math.PI * 2);
    g.fill();
    const legs = [
      [[0.08, -0.2], [0.4, -0.5], [0.45, -0.95]],
      [[0.1, -0.13], [0.55, -0.3], [0.75, -0.62]],
      [[0.1, -0.05], [0.55, 0.12], [0.75, 0.48]],
      [[0.08, 0.02], [0.4, 0.38], [0.45, 0.9]],
    ];
    g.lineWidth = size * 0.05;
    for (const s of [1, -1]) {
      for (const leg of legs) {
        g.beginPath();
        g.moveTo(leg[0][0] * size * s, leg[0][1] * size);
        for (let i = 1; i < leg.length; i++) g.lineTo(leg[i][0] * size * s, leg[i][1] * size);
        g.stroke();
      }
    }
  }
  g.restore();
}
