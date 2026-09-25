/**
 * Anfrageformular: Validierung, Payload und Versand.
 * Ohne konfigurierten Endpunkt (VITE_LEAD_ENDPOINT) läuft der Versand im Demo-Modus.
 */

export const PLOT_OPTIONS = Object.freeze([
  { id: 'ja', label: 'Grundstück vorhanden' },
  { id: 'suche', label: 'Auf der Suche' },
  { id: 'nein', label: 'Noch offen' },
]);

export const CONSULTATION_OPTIONS = Object.freeze([
  { id: 'video', label: 'Video-Call (3D-Tour)' },
  { id: 'musterhaus', label: 'Musterhaus-Besuch' },
]);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+()\d\s/-]{6,24}$/;
const REQUEST_TIMEOUT_MS = 10000;

export const emptyLeadForm = () => ({
  name: '',
  phone: '',
  email: '',
  location: '',
  plot: 'suche',
  consultation: 'video',
  message: '',
  consent: false,
  website: '',
});

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '');

/** Prüft das Formular und liefert Fehlermeldungen je Feld. */
export function validateLead(form) {
  const errors = {};
  const name = trimmed(form.name);
  if (name.length < 2) errors.name = 'Bitte gib deinen Vor- und Nachnamen an.';
  else if (name.length > 80) errors.name = 'Der Name darf höchstens 80 Zeichen lang sein.';

  const phone = trimmed(form.phone);
  const digits = phone.replace(/\D/g, '').length;
  if (!phone) errors.phone = 'Bitte gib eine Telefonnummer an, damit wir dich erreichen.';
  else if (!PHONE.test(phone) || digits < 6) errors.phone = 'Bitte prüfe die Telefonnummer (nur Ziffern, +, -, / und Leerzeichen).';

  const email = trimmed(form.email);
  if (!email) errors.email = 'Bitte gib deine E-Mail-Adresse an.';
  else if (!EMAIL.test(email) || email.length > 120) errors.email = 'Bitte gib eine gültige E-Mail-Adresse an.';

  if (trimmed(form.location).length > 60) errors.location = 'Bitte kürze die Ortsangabe auf 60 Zeichen.';
  if (trimmed(form.message).length > 1000) errors.message = 'Die Nachricht darf höchstens 1.000 Zeichen lang sein.';
  if (!PLOT_OPTIONS.some((o) => o.id === form.plot)) errors.plot = 'Bitte wähle eine Option.';
  if (!CONSULTATION_OPTIONS.some((o) => o.id === form.consultation)) errors.consultation = 'Bitte wähle eine Beratungsart.';
  if (form.consent !== true) errors.consent = 'Bitte stimme der Verarbeitung deiner Daten zur Bearbeitung der Anfrage zu.';

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Honeypot-Feld: Menschen sehen es nicht, Bots füllen es aus. */
export const isLikelyBot = (form) => trimmed(form.website).length > 0;

export function buildLeadPayload({ form, config, breakdown, configId, partner, monthlyRate, now = new Date() }) {
  return {
    configId,
    createdAt: now.toISOString(),
    partner: partner ?? null,
    contact: {
      name: trimmed(form.name),
      phone: trimmed(form.phone),
      email: trimmed(form.email),
      location: trimmed(form.location),
      plot: form.plot,
      consultation: form.consultation,
      message: trimmed(form.message),
    },
    configuration: config,
    price: {
      basePrice: breakdown.basePrice,
      upgrades: breakdown.upgradesTotal,
      total: breakdown.total,
      monthlyRate,
      items: breakdown.items.map(({ id, label, amount }) => ({ id, label, amount })),
    },
  };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sendet die Anfrage. Wirft bei Netzwerk- oder Serverfehlern eine verständliche Fehlermeldung.
 * @returns {Promise<{ ok: true, demo: boolean, reference: string }>}
 */
export async function submitLead(payload, { endpoint = import.meta.env.VITE_LEAD_ENDPOINT, fetchImpl = globalThis.fetch, demoDelay = 700 } = {}) {
  if (!endpoint) {
    await wait(demoDelay);
    return { ok: true, demo: true, reference: payload.configId };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Die Anfrage konnte nicht gesendet werden (Status ${response.status}). Bitte versuche es erneut.`);
    }
    const data = await response.json().catch(() => ({}));
    return { ok: true, demo: false, reference: typeof data.reference === 'string' ? data.reference : payload.configId };
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Der Server antwortet nicht. Bitte prüfe deine Verbindung und versuche es erneut.');
    if (error instanceof TypeError) throw new Error('Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
