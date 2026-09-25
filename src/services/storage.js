import { reconcile } from '../core/config.js';

/** Gespeicherte Konfiguration im localStorage – robust gegen gesperrten oder vollen Speicher. */
const STORAGE_KEY = 'citodomus.konfigurator.v1';

export function safeStorage() {
  try {
    const storage = globalThis.localStorage;
    const probe = '__citodomus_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function saveConfiguration(config, storage = safeStorage(), now = new Date()) {
  if (!storage) return { ok: false, error: 'Speichern ist in diesem Browser nicht möglich (privater Modus?).' };
  try {
    const savedAt = now.toISOString();
    storage.setItem(STORAGE_KEY, JSON.stringify({ config, savedAt }));
    return { ok: true, savedAt };
  } catch {
    return { ok: false, error: 'Der Browser-Speicher ist voll oder gesperrt.' };
  }
}

export function loadSavedConfiguration(storage = safeStorage()) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.config !== 'object') return null;
    return { config: reconcile(parsed.config).config, savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : null };
  } catch {
    return null;
  }
}

export function clearSavedConfiguration(storage = safeStorage()) {
  try {
    storage?.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
