import { CONFIG_SCHEMA, createDefaultConfig, isValidValue, reconcile } from './config.js';

/**
 * Kompakte, lesbare URL-Kodierung einer Konfiguration (z. B. „m=one&fa=holz&rs=1“).
 * Es werden nur Abweichungen vom Modellstandard gespeichert.
 */
const KEY_CODES = Object.freeze({
  model: 'm',
  area: 'a',
  rooms: 'r',
  floors: 'f',
  accessible: 'bf',
  facade: 'fa',
  plasterColor: 'pc',
  woodTone: 'wt',
  brickTone: 'bt',
  frame: 'fr',
  raffstore: 'rs',
  smartLock: 'sl',
  canopy: 'cn',
  roof: 'ro',
  pv: 'pv',
  batteryPlus: 'bp',
  wallbox: 'wb',
  flooring: 'fl',
  bath: 'ba',
  secondBath: 'sb',
  tallDoors: 'td',
  kitchen: 'ki',
  ventilation: 've',
  smartHome: 'sh',
  stove: 'st',
});

const CODE_KEYS = Object.freeze(Object.fromEntries(Object.entries(KEY_CODES).map(([key, code]) => [code, key])));

const encodeValue = (value) => (typeof value === 'boolean' ? (value ? '1' : '0') : String(value));

function decodeValue(key, raw) {
  const rule = CONFIG_SCHEMA[key];
  if (rule.type === 'bool') return raw === '1' ? true : raw === '0' ? false : undefined;
  if (rule.type === 'int' || typeof rule.values?.[0] === 'number') {
    return /^\d{1,4}$/.test(raw) ? Number(raw) : undefined;
  }
  return raw;
}

/** Konfiguration (+ optional Schritt) → Query-String ohne führendes „#“. */
export function encodeConfig(config, { step } = {}) {
  const defaults = createDefaultConfig(config.model);
  const params = new URLSearchParams();
  params.set(KEY_CODES.model, config.model);
  Object.entries(KEY_CODES).forEach(([key, code]) => {
    if (key === 'model') return;
    if (config[key] !== defaults[key]) params.set(code, encodeValue(config[key]));
  });
  if (step) params.set('s', String(step));
  return params.toString();
}

/**
 * Query-String → geprüfte Konfiguration. Unbekannte oder ungültige Werte werden ignoriert.
 * @returns {{ config: object, step: number|null } | null}
 */
export function decodeConfig(input) {
  if (typeof input !== 'string' || input.length === 0 || input.length > 1000) return null;
  const params = new URLSearchParams(input.replace(/^[#?]/, ''));
  const model = params.get(KEY_CODES.model);
  if (!isValidValue('model', model)) return null;
  const patch = { model };
  params.forEach((raw, code) => {
    const key = CODE_KEYS[code];
    if (!key || key === 'model') return;
    const value = decodeValue(key, raw);
    if (value !== undefined && isValidValue(key, value)) patch[key] = value;
  });
  const stepRaw = Number(params.get('s'));
  const step = Number.isInteger(stepRaw) && stepRaw >= 1 && stepRaw <= 5 ? stepRaw : null;
  return { config: reconcile(patch).config, step };
}

/** FNV-1a (32 Bit) – stabiler Kurz-Hash für Konfigurations-IDs. */
export function hashString(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Deterministische, gut lesbare Konfigurations-ID, z. B. „CTD-2026-4K9QX“. */
export function configId(config, year = new Date().getFullYear()) {
  const canonical = Object.keys(KEY_CODES)
    .map((key) => `${key}:${encodeValue(config[key])}`)
    .join('|');
  const code = hashString(canonical).toString(36).toUpperCase().padStart(5, '0').slice(-5);
  return `CTD-${year}-${code}`;
}
