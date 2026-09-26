import { encodeConfig } from '../core/serialize.js';
import { buildReturnUrl, returnHost } from '../services/return-url.js';

/**
 * Ziel des Zurück-Links zur aufrufenden Seite – immer mit dem aktuellen Stand der Konfiguration
 * und nach erfolgreicher Anfrage mit deren Vorgangsnummer. Ohne ?return=… gibt es kein Ziel (null).
 * @returns {{ host: string, href: string } | null}
 */
export function returnTarget(state, derived) {
  if (!state.returnTo) return null;
  const { lead } = state;
  return {
    host: returnHost(state.returnTo),
    href: buildReturnUrl(state.returnTo, {
      config: encodeConfig(state.config),
      configId: derived.configId,
      total: derived.breakdown.total,
      lead: lead.status === 'success' ? lead.reference : null,
    }),
  };
}
