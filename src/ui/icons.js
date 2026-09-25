import { html, svg } from 'lit-html';
import { ICON_PATHS } from './icon-paths.js';

/**
 * Material-Symbol als Inline-SVG (Pfade werden per scripts/build-icons.mjs erzeugt).
 * Namen immer als String-Literal übergeben, damit das Build-Skript sie findet.
 * @param {string} name
 * @param {{ size?: number, className?: string, label?: string }} [options]
 */
export function icon(name, { size = 20, className = '', label = '' } = {}) {
  const paths = ICON_PATHS[name] ?? ICON_PATHS.help ?? [];
  return html`<svg
    class="icon ${className}"
    width=${size}
    height=${size}
    viewBox="0 -960 960 960"
    role=${label ? 'img' : 'presentation'}
    aria-hidden=${label ? 'false' : 'true'}
    focusable="false"
  >
    ${label ? svg`<title>${label}</title>` : null}${paths.map((d) => svg`<path d=${d}></path>`)}
  </svg>`;
}
