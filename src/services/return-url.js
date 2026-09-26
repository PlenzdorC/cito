/**
 * Aufruf mit Rücksprung: Eine andere Seite öffnet den Konfigurator mit ?return=<Adresse> und bekommt
 * beim Zurückkehren das Ergebnis als URL-Parameter (config, configId, total, lead) angehängt.
 */

const MAX_URL_LENGTH = 2000;
const WEB_PROTOCOL = /^https?:$/;
const RESULT_PARAMS = Object.freeze(['config', 'configId', 'total', 'lead']);

/** Freigegebene Ursprünge aus VITE_RETURN_ORIGINS (durch Komma oder Leerzeichen getrennt). */
export function parseOriginList(value) {
  if (typeof value !== 'string') return [];
  return value
    .split(/[\s,]+/)
    .map((entry) => {
      try {
        const url = new URL(entry);
        return WEB_PROTOCOL.test(url.protocol) ? url.origin : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

/**
 * Liest ?return=… und liefert die geprüfte, absolute Rücksprungadresse – sonst null.
 * Erlaubt sind nur http(s)-Adressen ohne Zugangsdaten auf dem eigenen oder einem freigegebenen Ursprung
 * (Schutz vor Open Redirect und javascript:-Links).
 */
export function parseReturnUrl(
  search,
  { origin = globalThis.location?.origin, allowedOrigins = parseOriginList(import.meta.env.VITE_RETURN_ORIGINS) } = {},
) {
  const raw = new URLSearchParams(typeof search === 'string' ? search : '').get('return');
  if (!raw || raw.length > MAX_URL_LENGTH) return null;
  let url;
  try {
    url = new URL(raw, origin);
  } catch {
    return null;
  }
  if (!WEB_PROTOCOL.test(url.protocol) || url.username || url.password) return null;
  return url.origin === origin || allowedOrigins.includes(url.origin) ? url.href : null;
}

/** Kurzname des Ziels für die Beschriftung, z. B. „citodomus.de“. */
export const returnHost = (returnUrl) => new URL(returnUrl).hostname.replace(/^www\./, '');

/**
 * Rücksprungadresse mit Ergebnis: Konfiguration (wie im Teilen-Link), Konfigurations-ID, Gesamtpreis und –
 * nach erfolgreicher Anfrage – deren Vorgangsnummer. Eigene Parameter und Anker der Seite bleiben erhalten.
 */
export function buildReturnUrl(returnUrl, { config, configId, total, lead = null }) {
  const url = new URL(returnUrl);
  RESULT_PARAMS.forEach((name) => url.searchParams.delete(name));
  url.searchParams.set('config', config);
  url.searchParams.set('configId', configId);
  url.searchParams.set('total', String(total));
  if (lead) url.searchParams.set('lead', lead);
  return url.href;
}
