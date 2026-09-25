import { normalizeHex } from '../core/color.js';

/** Einbettung auf Partner-Webseiten: URL-Parameter lesen und iFrame-Code erzeugen. */

const PARTNER_ID = /^[A-Za-z0-9-]{3,40}$/;
const SIZE = /^\d{2,4}(px|%)$/;
const MIN_HEIGHT_PX = 640;

export const isValidPartnerId = (value) => typeof value === 'string' && PARTNER_ID.test(value);

/** Liest ?embed=1&partner=…&accent=… aus der aktuellen URL (ungültige Werte werden verworfen). */
export function parseEmbedParams(search) {
  const params = new URLSearchParams(typeof search === 'string' ? search : '');
  const partner = params.get('partner');
  return {
    embed: params.get('embed') === '1',
    partner: isValidPartnerId(partner) ? partner : null,
    accent: normalizeHex(params.get('accent')),
  };
}

export function validateEmbedOptions({ partner, accent, width, height }) {
  const errors = {};
  if (!isValidPartnerId(partner)) errors.partner = '3–40 Zeichen: Buchstaben, Ziffern und Bindestrich.';
  if (!normalizeHex(accent)) errors.accent = 'Bitte eine Hex-Farbe wie #9D3E1A angeben.';
  if (!SIZE.test(width)) errors.width = 'z. B. 100% oder 1200px';
  if (!/^\d{3,4}px$/.test(height) || Number.parseInt(height, 10) < MIN_HEIGHT_PX) {
    errors.height = `Mindestens ${MIN_HEIGHT_PX}px, z. B. 780px`;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/** Basis-URL der aktuellen Seite ohne Query und Hash. */
export function currentBaseUrl(location = globalThis.location) {
  if (!location) return '';
  return `${location.origin}${location.pathname}`;
}

export function buildEmbedUrl({ baseUrl, partner, accent, configHash = '' }) {
  const url = new URL(baseUrl);
  url.search = '';
  url.searchParams.set('embed', '1');
  if (isValidPartnerId(partner)) url.searchParams.set('partner', partner);
  const hex = normalizeHex(accent);
  if (hex) url.searchParams.set('accent', hex.slice(1).toUpperCase());
  url.hash = configHash;
  return url.toString();
}

const escapeAttribute = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Fertiger iFrame-Code – alle Werte werden validiert bzw. attributsicher maskiert. */
export function buildEmbedSnippet({ url, width, height, title = 'CITODOMUS 3D-Hauskonfigurator' }) {
  const safeWidth = SIZE.test(width) ? width : '100%';
  const safeHeight = /^\d{3,4}px$/.test(height) ? height : '780px';
  return (
    `<iframe src="${escapeAttribute(url)}" title="${escapeAttribute(title)}" ` +
    `width="${safeWidth}" height="${safeHeight}" loading="lazy" allow="fullscreen; clipboard-write" ` +
    `style="border:0;border-radius:16px;box-shadow:0 12px 32px -4px rgba(43,47,51,.12);max-width:100%;"></iframe>`
  );
}
