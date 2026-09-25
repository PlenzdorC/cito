import { html, svg } from 'lit-html';

/** Kleine Ansichtszeichnungen der Dachformen für die Auswahlkarten (Seitenansicht). */

const C = {
  wall: '#efe9df',
  wallShade: '#e2dace',
  line: '#2b2f33',
  roof: '#3b4045',
  pv: '#1b2431',
  pvLine: '#3d4a5e',
  glass: '#9fb4c3',
  green: '#6f9150',
  greenDark: '#56763c',
  ground: '#d9d2c3',
};

const ground = svg`<rect x="6" y="70" width="108" height="3" rx="1.5" fill=${C.ground} />`;

function panelRow(x0, y0, dx, dy, count, width) {
  return Array.from({ length: count }, (_, i) => {
    const x = x0 + i * dx;
    const y = y0 + i * dy;
    return svg`<polygon points="${x},${y} ${x + width},${y + (dy * width) / dx} ${x + width},${y + (dy * width) / dx - 4} ${x},${y - 4}" fill=${C.pv} stroke=${C.pvLine} stroke-width="0.5" />`;
  });
}

const pult = svg`
  ${ground}
  <polygon points="24,70 24,43 96,30 96,70" fill=${C.wall} stroke=${C.line} stroke-width="1.2" />
  <polygon points="16,45 104,29 104,25 16,41" fill=${C.roof} />
  ${panelRow(24, 39.6, 13.2, -2.4, 6, 12)}
  <rect x="34" y="50" width="16" height="20" fill=${C.glass} stroke=${C.line} stroke-width="1" />
  <rect x="60" y="48" width="12" height="11" fill=${C.glass} stroke=${C.line} stroke-width="1" />
  <rect x="80" y="44" width="10" height="11" fill=${C.glass} stroke=${C.line} stroke-width="1" />
`;

const sattel = svg`
  ${ground}
  <polygon points="28,70 28,45 60,25 92,45 92,70" fill=${C.wall} stroke=${C.line} stroke-width="1.2" />
  <polyline points="20,50 60,21 100,50" fill="none" stroke=${C.roof} stroke-width="5" stroke-linejoin="round" />
  ${panelRow(27, 43.5, 9.2, -6.7, 4, 7.6)}
  <rect x="38" y="50" width="12" height="12" fill=${C.glass} stroke=${C.line} stroke-width="1" />
  <rect x="64" y="52" width="10" height="18" fill="#5a3b2a" stroke=${C.line} stroke-width="1" />
  <circle cx="60" cy="37" r="4" fill=${C.glass} stroke=${C.line} stroke-width="1" />
`;

const flach = svg`
  ${ground}
  <rect x="22" y="36" width="76" height="34" fill=${C.wall} stroke=${C.line} stroke-width="1.2" />
  <rect x="20" y="31" width="80" height="6" fill=${C.roof} />
  <rect x="23" y="27.5" width="74" height="4" rx="2" fill=${C.green} />
  <circle cx="30" cy="27" r="2.4" fill=${C.greenDark} />
  <circle cx="86" cy="26.6" r="2.6" fill=${C.greenDark} />
  <polygon points="38,27 52,27 52,21" fill=${C.pv} />
  <polygon points="54,27 68,27 54,21" fill=${C.pv} />
  <polygon points="70,27 84,27 84,21" fill=${C.pv} />
  <rect x="30" y="44" width="24" height="26" fill=${C.glass} stroke=${C.line} stroke-width="1" />
  <line x1="42" y1="44" x2="42" y2="70" stroke=${C.line} stroke-width="1" />
  <rect x="66" y="45" width="12" height="12" fill=${C.glass} stroke=${C.line} stroke-width="1" />
`;

const ART = { pult, sattel, flach };

export function roofArt(type) {
  return html`<svg viewBox="0 0 120 76" class="h-full w-full" role="presentation" aria-hidden="true">${ART[type]}</svg>`;
}
