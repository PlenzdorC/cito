import * as THREE from 'three';

/**
 * Prozedurale Canvas-Texturen (keine externen Bilddateien nötig).
 * Alle Texturen sind deterministisch (Seed) und werden einmalig erzeugt und zwischengespeichert.
 * Die Wiederholung (repeat) ist so gewählt, dass Weltkoordinaten in Metern passen.
 */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map();
let maxAnisotropy = 4;

export function configureTextures(renderer) {
  maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
}

function makeTexture(key, size, draw, { repeat = [1, 1], color = true } = {}) {
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = size[0];
  canvas.height = size[1];
  const ctx = canvas.getContext('2d');
  draw(ctx, size[0], size[1]);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = maxAnisotropy;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, texture);
  return texture;
}

function speckle(ctx, w, h, rnd, count, alpha, light = false) {
  for (let i = 0; i < count; i++) {
    const v = light ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${rnd() * alpha})`;
    ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
  }
}

/** Heller, feiner Scheibenputz (wird per Materialfarbe eingefärbt), Kachel 1,5 m. */
export const plasterTexture = () =>
  makeTexture('plaster', [512, 512], (ctx, w, h) => {
    const rnd = mulberry32(11);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, rnd, 26000, 0.07);
    speckle(ctx, w, h, rnd, 9000, 0.5, true);
  }, { repeat: [1 / 1.5, 1 / 1.5] });

/** Vertikale Holzlamellen (Rhombusschalung), 8 Bretter à 15 cm je Kachel. */
export const woodCladdingTexture = () =>
  makeTexture('wood-cladding', [512, 512], (ctx, w, h) => {
    const rnd = mulberry32(23);
    const boards = 8;
    const bw = w / boards;
    for (let i = 0; i < boards; i++) {
      const shade = 225 + Math.floor(rnd() * 30);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(i * bw, 0, bw, h);
      for (let g = 0; g < 40; g++) {
        const x = i * bw + rnd() * bw;
        ctx.strokeStyle = `rgba(0,0,0,${0.03 + rnd() * 0.07})`;
        ctx.lineWidth = 0.6 + rnd() * 1.2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + rnd() * 6 - 3, h * 0.3, x + rnd() * 6 - 3, h * 0.7, x + rnd() * 4 - 2, h);
        ctx.stroke();
      }
      // Fuge zwischen den Brettern
      ctx.fillStyle = 'rgba(20,14,10,0.75)';
      ctx.fillRect(i * bw + bw - 4, 0, 4, h);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(i * bw, 0, 2, h);
    }
  }, { repeat: [1 / 1.2, 1 / 1.2] });

/** Klinkerriemchen im Läuferverband (24 × 7,1 cm + Fuge), farbig je Klinkerton. */
export function brickTexture(hex) {
  return makeTexture(`brick-${hex}`, [512, 512], (ctx, w, h) => {
    const rnd = mulberry32(37);
    const base = new THREE.Color(hex);
    ctx.fillStyle = '#cfc8bd';
    ctx.fillRect(0, 0, w, h);
    const rows = 12;
    const cols = 4;
    const rh = h / rows;
    const cw = w / cols;
    const joint = 5;
    for (let r = 0; r < rows; r++) {
      const offset = r % 2 === 0 ? 0 : cw / 2;
      for (let c = -1; c < cols + 1; c++) {
        const x = c * cw + offset;
        const tint = base.clone().offsetHSL((rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.08, (rnd() - 0.5) * 0.12);
        ctx.fillStyle = `#${tint.getHexString()}`;
        ctx.fillRect(x + joint / 2, r * rh + joint / 2, cw - joint, rh - joint);
      }
    }
    speckle(ctx, w, h, rnd, 14000, 0.12);
  }, { repeat: [1 / 1.0, 1 / 0.9] });
}

/** Stehfalzdach in Anthrazit, Falzabstand 50 cm. */
export const roofSeamTexture = () =>
  makeTexture('roof-seam', [256, 256], (ctx, w, h) => {
    const rnd = mulberry32(5);
    ctx.fillStyle = '#4a4f55';
    ctx.fillRect(0, 0, w, h);
    speckle(ctx, w, h, rnd, 3000, 0.08);
    for (let i = 0; i < 4; i++) {
      const x = (i * w) / 4;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(x, 0, 3, h);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x + 3, 0, 2, h);
    }
  }, { repeat: [0.5, 0.5] });

/** Abgesenkte Raffstore-Lamellen (horizontale Streifen). */
export const lamellaTexture = () =>
  makeTexture('lamella', [64, 64], (ctx, w, h) => {
    ctx.fillStyle = '#3a3e42';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(0, y, w, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, y + 6, w, 2);
    }
  }, { repeat: [1, 1] });

/** Full-Black-Solarmodul mit angedeuteten Zellen (Textur deckt genau ein Modul ab). */
export function pvTexture(cellsU, cellsV) {
  return makeTexture(`pv-${cellsU}x${cellsV}`, [256, 256], (ctx, w, h) => {
    ctx.fillStyle = '#0c1118';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(70,90,120,0.35)';
    ctx.lineWidth = 1.2;
    for (let i = 1; i < cellsU; i++) {
      ctx.beginPath();
      ctx.moveTo((i * w) / cellsU, 0);
      ctx.lineTo((i * w) / cellsU, h);
      ctx.stroke();
    }
    for (let j = 1; j < cellsV; j++) {
      ctx.beginPath();
      ctx.moveTo(0, (j * h) / cellsV);
      ctx.lineTo(w, (j * h) / cellsV);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, w, h);
  });
}

function organic(key, colors, repeatMeters, seed, dots = 26000) {
  return makeTexture(key, [512, 512], (ctx, w, h) => {
    const rnd = mulberry32(seed);
    ctx.fillStyle = colors[0];
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < dots; i++) {
      ctx.fillStyle = colors[1 + Math.floor(rnd() * (colors.length - 1))];
      ctx.globalAlpha = 0.25 + rnd() * 0.5;
      const s = 1 + rnd() * 3;
      ctx.fillRect(rnd() * w, rnd() * h, s, s);
    }
    ctx.globalAlpha = 1;
  }, { repeat: [1 / repeatMeters, 1 / repeatMeters] });
}

export const grassTexture = () => organic('grass', ['#8fa66b', '#7d9658', '#a3b77c', '#6f8a4d', '#b3c28a'], 3, 7, 40000);
export const sedumTexture = () => organic('sedum', ['#7d8f4e', '#9aa556', '#6b7c43', '#b0a45a', '#8c6e4a'], 1.5, 13, 36000);
export const gravelTexture = () => organic('gravel', ['#bdb6aa', '#a39c90', '#d2cbbf', '#8f887d'], 1, 17, 30000);

/** Großformatige Terrassenplatten 80 × 40 cm. */
export const pavingTexture = () =>
  makeTexture('paving', [512, 512], (ctx, w, h) => {
    const rnd = mulberry32(19);
    ctx.fillStyle = '#b9b2a6';
    ctx.fillRect(0, 0, w, h);
    const cols = 2;
    const rows = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const shade = 196 + Math.floor(rnd() * 20);
        ctx.fillStyle = `rgb(${shade},${shade - 6},${shade - 14})`;
        ctx.fillRect((c * w) / cols + 3, (r * h) / rows + 3, w / cols - 6, h / rows - 6);
      }
    }
    speckle(ctx, w, h, rnd, 12000, 0.1);
  }, { repeat: [1 / 1.6, 1 / 1.6] });

function planks(key, { base, variance, plankW, plankL, repeat, seed, grain }) {
  return makeTexture(key, [1024, 1024], (ctx, w, h) => {
    const rnd = mulberry32(seed);
    const cols = Math.round(w / plankW);
    for (let c = 0; c < cols; c++) {
      let y = -rnd() * plankL;
      while (y < h) {
        const color = new THREE.Color(base).offsetHSL((rnd() - 0.5) * 0.02, (rnd() - 0.5) * 0.06, (rnd() - 0.5) * variance);
        ctx.fillStyle = `#${color.getHexString()}`;
        ctx.fillRect(c * plankW, y, plankW, plankL);
        for (let g = 0; g < grain; g++) {
          const x = c * plankW + rnd() * plankW;
          ctx.strokeStyle = `rgba(60,35,15,${0.04 + rnd() * 0.08})`;
          ctx.lineWidth = 0.6 + rnd() * 1.4;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.bezierCurveTo(x + rnd() * 8 - 4, y + plankL * 0.33, x + rnd() * 8 - 4, y + plankL * 0.66, x, y + plankL);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(40,25,10,0.35)';
        ctx.fillRect(c * plankW, y, plankW, 2);
        y += plankL;
      }
      ctx.fillStyle = 'rgba(40,25,10,0.3)';
      ctx.fillRect(c * plankW, 0, 2, h);
    }
  }, { repeat });
}

/** Bodenbeläge für den Innenraum (Kachel 2 m). */
export function floorTexture(id) {
  if (id === 'parkett') {
    return planks('floor-parkett', { base: '#b58552', variance: 0.1, plankW: 128, plankL: 1024, repeat: [0.5, 0.5], seed: 3, grain: 60 });
  }
  if (id === 'feinstein') {
    return makeTexture('floor-feinstein', [1024, 1024], (ctx, w, h) => {
      const rnd = mulberry32(29);
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          const shade = 168 + Math.floor(rnd() * 14);
          ctx.fillStyle = `rgb(${shade},${shade - 3},${shade - 8})`;
          ctx.fillRect((c * w) / 2, (r * h) / 2, w / 2, h / 2);
        }
      }
      speckle(ctx, w, h, rnd, 60000, 0.12);
      speckle(ctx, w, h, rnd, 20000, 0.25, true);
      ctx.fillStyle = 'rgba(235,232,226,0.9)';
      ctx.fillRect(0, h / 2 - 2, w, 4);
      ctx.fillRect(w / 2 - 2, 0, 4, h);
      ctx.fillRect(0, 0, w, 2);
      ctx.fillRect(0, 0, 2, h);
    }, { repeat: [1 / 2.4, 1 / 1.2] });
  }
  return planks('floor-vinyl', { base: '#d9c09a', variance: 0.06, plankW: 96, plankL: 640, repeat: [0.5, 0.5], seed: 9, grain: 36 });
}

/** Radialer Alpha-Verlauf, damit der Rasen weich in den Himmel übergeht. */
export const groundFadeTexture = () =>
  makeTexture('ground-fade', [256, 256], (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.65, '#ffffff');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }, { color: false });
