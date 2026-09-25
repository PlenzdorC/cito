/** Farb-Hilfsfunktionen für das Partner-Theming (Akzentfarbe per URL-Parameter). */

const HEX = /^#?([0-9a-f]{6})$/i;

export function parseHex(input) {
  const match = typeof input === 'string' ? input.trim().match(HEX) : null;
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export const toHex = ({ r, g, b }) =>
  `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;

export function normalizeHex(input) {
  const rgb = parseHex(input);
  return rgb ? toHex(rgb) : null;
}

const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export function relativeLuminance(hex) {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a, b) {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** Lineare Mischung zweier Farben (t = 0 → a, t = 1 → b). */
export function mix(a, b, t) {
  const x = parseHex(a);
  const y = parseHex(b);
  return toHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
}

/** Dunkelt eine Farbe schrittweise ab, bis weiße Schrift darauf WCAG-AA erfüllt. */
export function ensureContrast(hex, against = '#ffffff', minimum = 4.5) {
  let color = normalizeHex(hex);
  for (let i = 0; i < 20 && contrastRatio(color, against) < minimum; i++) {
    color = mix(color, '#000000', 0.08);
  }
  return color;
}

/**
 * Leitet aus einer Partner-Akzentfarbe die Primärfarben des Designsystems ab.
 * Gibt null zurück, wenn die Eingabe keine gültige Hex-Farbe ist.
 */
export function accentPalette(input) {
  const base = normalizeHex(input);
  if (!base) return null;
  const primary = ensureContrast(base);
  return {
    accent: base,
    primary,
    primaryContainer: ensureContrast(mix(primary, '#ffffff', 0.12), '#ffffff', 4.5),
    primaryFixed: mix(base, '#ffffff', 0.82),
    onPrimaryFixed: mix(primary, '#000000', 0.55),
  };
}
