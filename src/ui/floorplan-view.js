import { html, nothing, svg } from 'lit-html';
import { formatArea, formatMeters } from '../core/format.js';

/** 2D-Grundriss als technische Zeichnung (SVG, Maßeinheit Meter). */

const FILL = {
  living: '#fbe2d6',
  master: '#f4f1ec',
  child: '#f4f1ec',
  office: '#f1efe9',
  bath: '#dfe6ec',
  shower: '#dfe6ec',
  wc: '#dfe6ec',
  utility: '#e9e6e0',
  hall: '#ece9e3',
  landing: '#ece9e3',
};
const INK = '#2b2f33';
const ACCENT = '#d96b43';

function roomLabel(room, t) {
  const cx = t + room.u + room.w / 2;
  const cy = t + room.v + room.h / 2;
  const nameSize = Math.min(0.36, Math.max(0.2, (room.w - 0.3) / (room.name.length * 0.58)));
  return svg`<g class="pointer-events-none">
    <text x=${cx} y=${cy - 0.08} text-anchor="middle" font-size=${nameSize} font-weight="700" fill=${INK}>${room.name}</text>
    <text x=${cx} y=${cy + nameSize + 0.08} text-anchor="middle" font-size=${Math.min(0.3, nameSize * 0.9)} font-weight="600" fill="#56423c">${formatArea(room.area, 1)}</text>
  </g>`;
}

/** Fenster/Tür als Aussparung im Wandband. */
function openingMark(o, plan, t) {
  const { L, S } = plan;
  const half = o.width / 2;
  const alongU = o.edge === 'vS' || o.edge === 'v0';
  const x = alongU ? t + o.u - half : o.edge === 'u0' ? 0 : t + L;
  const y = alongU ? (o.edge === 'v0' ? 0 : t + S) : t + o.v - half;
  const w = alongU ? o.width : t;
  const h = alongU ? t : o.width;
  const glass = alongU
    ? svg`<line x1=${x} y1=${y + t / 2} x2=${x + w} y2=${y + t / 2} stroke=${INK} stroke-width="0.03" />`
    : svg`<line x1=${x + t / 2} y1=${y} x2=${x + t / 2} y2=${y + h} stroke=${INK} stroke-width="0.03" />`;
  if (o.kind === 'door') {
    // Türanschlag nach innen (u = L → nach links)
    const hingeY = y;
    const r = o.width;
    return svg`<g>
      <rect x=${x} y=${y} width=${w} height=${h} fill="#fff" />
      <path d="M ${x} ${hingeY} L ${x - r} ${hingeY} A ${r} ${r} 0 0 0 ${x} ${hingeY + r}" fill="none" stroke=${ACCENT} stroke-width="0.04" />
    </g>`;
  }
  return svg`<g><rect x=${x} y=${y} width=${w} height=${h} fill="#fff" stroke=${INK} stroke-width="0.02" />${glass}</g>`;
}

function stairs(s, t) {
  const steps = Math.floor(s.w / 0.26);
  return svg`<g>
    <rect x=${t + s.u} y=${t + s.v} width=${s.w} height=${s.h} fill="#fff" stroke=${INK} stroke-width="0.03" />
    ${Array.from({ length: steps }, (_, i) => {
      const x = t + s.u + ((i + 1) * s.w) / (steps + 1);
      return svg`<line x1=${x} y1=${t + s.v} x2=${x} y2=${t + s.v + s.h} stroke=${INK} stroke-width="0.015" />`;
    })}
    <path d="M ${t + s.u + 0.2} ${t + s.v + s.h / 2} H ${t + s.u + s.w - 0.25}" stroke=${ACCENT} stroke-width="0.04" />
    <path d="M ${t + s.u + s.w - 0.45} ${t + s.v + s.h / 2 - 0.16} L ${t + s.u + s.w - 0.22} ${t + s.v + s.h / 2} L ${t + s.u + s.w - 0.45} ${t + s.v + s.h / 2 + 0.16}" fill="none" stroke=${ACCENT} stroke-width="0.04" />
  </g>`;
}

function dimension({ x1, y1, x2, y2, label, vertical = false }) {
  const tick = 0.14;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return svg`<g stroke="#8a726a" stroke-width="0.025" fill="#8a726a">
    <line x1=${x1} y1=${y1} x2=${x2} y2=${y2} />
    <line x1=${x1 - (vertical ? tick : 0)} y1=${y1 - (vertical ? 0 : tick)} x2=${x1 + (vertical ? tick : 0)} y2=${y1 + (vertical ? 0 : tick)} />
    <line x1=${x2 - (vertical ? tick : 0)} y1=${y2 - (vertical ? 0 : tick)} x2=${x2 + (vertical ? tick : 0)} y2=${y2 + (vertical ? 0 : tick)} />
    <text x=${mx} y=${my - 0.14} text-anchor="middle" font-size="0.3" font-weight="600" stroke="none"
      transform=${vertical ? `rotate(-90 ${mx} ${my})` : ''}>${label}</text>
  </g>`;
}

export function floorplanSvg({ plan, geo, openings, level }) {
  const floor = plan.floors[Math.min(level, plan.floors.length - 1)];
  const t = geo.wallThickness;
  const Lo = plan.L + 2 * t;
  const So = plan.S + 2 * t;
  const pad = 1.3;
  const northRotation = geo.orientation === 'ew' ? 0 : -90;
  return html`<svg
    class="h-full w-full"
    viewBox="${-pad} ${-pad} ${Lo + 2 * pad} ${So + 2 * pad + 0.4}"
    role="img"
    aria-label="Grundriss ${floor.label}, ${formatArea(geo.netAreaPerFloor, 1)} Wohnfläche"
    font-family="inherit"
  >
    <rect x=${-pad} y=${-pad} width=${Lo + 2 * pad} height=${So + 2 * pad + 0.4} fill="transparent" />
    ${floor.rooms.map(
      (r) => svg`<rect x=${t + r.u} y=${t + r.v} width=${r.w} height=${r.h} fill=${FILL[r.kind] ?? '#f4f1ec'} stroke=${INK} stroke-width="0.1" />`,
    )}
    <path d="M0 0 H${Lo} V${So} H0 Z M${t} ${t} V${t + plan.S} H${t + plan.L} V${t} Z" fill=${INK} fill-rule="evenodd" />
    ${openings.filter((o) => o.floor === floor.level).map((o) => openingMark(o, plan, t))}
    ${floor.stairs ? stairs(floor.stairs, t) : nothing}
    ${floor.rooms.map((r) => roomLabel(r, t))}
    ${dimension({ x1: 0, y1: -0.55, x2: Lo, y2: -0.55, label: formatMeters(Lo) })}
    ${dimension({ x1: -0.55, y1: 0, x2: -0.55, y2: So, label: formatMeters(So), vertical: true })}
    <text x=${Lo / 2} y=${So + 0.75} text-anchor="middle" font-size="0.3" font-weight="700" letter-spacing="0.08" fill="#136948">GARTEN · TERRASSE</text>
    <g transform="translate(${Lo + 0.6} ${-0.6}) rotate(${northRotation})">
      <circle r="0.36" fill="#fff" stroke=${INK} stroke-width="0.03" />
      <path d="M0 -0.26 L0.13 0.14 L0 0.06 L-0.13 0.14 Z" fill=${ACCENT} />
      <text y="-0.44" text-anchor="middle" font-size="0.24" font-weight="800" fill=${INK} transform=${`rotate(${-northRotation} 0 -0.52)`}>N</text>
    </g>
  </svg>`;
}

/** Grundriss-Ebene im Viewport inklusive Geschoss-Umschalter. */
export function floorplanLayer(state, derived, actions) {
  const { plan, geo, openings } = derived;
  const level = Math.min(state.planLevel, plan.floors.length - 1);
  const floor = plan.floors[level];
  return html`<div class="fade-in absolute inset-0 flex flex-col pt-12 lg:pt-14">
    <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 pr-16 lg:px-4 lg:pr-20">
      <div class="flex flex-col">
        <span class="text-label-tech font-bold tracking-wider text-primary uppercase">Grundriss 2D · ${floor.label}</span>
        <span class="text-body-sm text-on-surface-variant tabular-nums"
          >${formatArea(geo.netAreaPerFloor, 1)} Wohnfläche · Außenmaß ${formatMeters(geo.outer.long)} × ${formatMeters(geo.outer.short)}</span
        >
      </div>
      ${plan.floors.length > 1
        ? html`<div class="flex rounded-full bg-surface-container p-1" role="group" aria-label="Geschoss">
            ${plan.floors.map(
              (f, i) => html`<button
                type="button"
                aria-pressed=${i === level ? 'true' : 'false'}
                aria-label=${f.label}
                class="rounded-full px-3 py-1 text-label-strong ${i === level ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}"
                @click=${() => actions.setPlanLevel(i)}
              >
                ${f.id}
              </button>`,
            )}
          </div>`
        : nothing}
    </div>
    <div class="min-h-0 flex-1 px-3 pb-16 lg:px-6">${floorplanSvg({ plan, geo, openings, level })}</div>
  </div>`;
}
