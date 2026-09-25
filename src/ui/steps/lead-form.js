import { html, nothing } from 'lit-html';
import { CONSULTATION_OPTIONS, PLOT_OPTIONS, emptyLeadForm } from '../../services/lead.js';
import { icon } from '../icons.js';

/** Anfrageformular „Für Bauherren“ – unkontrollierte Felder, Validierung beim Absenden. */

const privacyUrl = import.meta.env.VITE_PRIVACY_URL || '';
const DEFAULTS = emptyLeadForm();

function field({ id, name, label, type = 'text', required = false, autocomplete = 'off', placeholder = '', error, inputmode }) {
  const errorId = `${id}-error`;
  return html`<div class="flex flex-col gap-1">
    <label for=${id} class="text-label-tech text-on-surface-variant">${label}${required ? html` <span aria-hidden="true">*</span>` : nothing}</label>
    <input
      id=${id}
      name=${name}
      type=${type}
      class="field"
      placeholder=${placeholder}
      autocomplete=${autocomplete}
      inputmode=${inputmode ?? nothing}
      ?required=${required}
      aria-invalid=${error ? 'true' : 'false'}
      aria-describedby=${error ? errorId : nothing}
    />
    ${error ? html`<span id=${errorId} class="text-body-sm text-error">${error}</span>` : nothing}
  </div>`;
}

function successPanel(state, actions) {
  const { lead } = state;
  return html`<div class="fade-in flex flex-col items-start gap-3 rounded-xl bg-tertiary-fixed/35 p-4" role="status">
    <span class="grid size-11 place-items-center rounded-full bg-tertiary text-on-tertiary">${icon('mark_email_read', { size: 24 })}</span>
    <div class="flex flex-col gap-1">
      <span class="text-headline-sm text-on-surface">Vielen Dank${lead.name ? `, ${lead.name}` : ''}!</span>
      <p class="text-body-md text-on-surface-variant">
        Deine Anfrage mit der Konfiguration <strong class="text-on-surface tabular-nums">${lead.reference}</strong> ist bei uns eingegangen.
        Ein CITODOMUS-Bauberater meldet sich innerhalb von 24 Stunden.
      </p>
      ${lead.demo
        ? html`<p class="mt-1 rounded-lg bg-surface-container-lowest/70 p-2 text-body-sm text-on-surface-variant">
            Demo-Modus: Es wurden keine Daten übertragen. Für den Live-Betrieb <code class="code-box">VITE_LEAD_ENDPOINT</code> setzen.
          </p>`
        : nothing}
    </div>
    <button type="button" class="btn btn-quiet !py-2" @click=${actions.resetLead}>${icon('edit', { size: 18 })} Neue Anfrage</button>
  </div>`;
}

export function leadForm(state, derived, actions) {
  const { lead } = state;
  if (lead.status === 'success') return successPanel(state, actions);
  const errors = lead.errors ?? {};
  const sending = lead.status === 'sending';
  return html`<form
    class="relative flex flex-col gap-3"
    novalidate
    aria-describedby="lead-intro"
    @submit=${(event) => {
      event.preventDefault();
      actions.submitLead(event.currentTarget);
    }}
  >
    <div id="lead-intro" class="flex items-center gap-2.5 rounded-lg bg-primary-fixed/40 p-3">
      <span class="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-on-primary">${icon('real_estate_agent', { size: 18 })}</span>
      <span class="flex flex-col">
        <span class="text-label-strong text-on-primary-fixed">Kostenloser Bauplatz- & Bebaubarkeits-Check</span>
        <span class="text-body-sm text-on-surface-variant">Wir prüfen Bebauungsplan und Kranzufahrt – kostenlos und unverbindlich.</span>
      </span>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      ${field({ id: 'lead-name', name: 'name', label: 'Vor- & Nachname', required: true, autocomplete: 'name', placeholder: 'z. B. Markus Weber', error: errors.name })}
      ${field({ id: 'lead-phone', name: 'phone', label: 'Telefonnummer', type: 'tel', required: true, autocomplete: 'tel', placeholder: '+49 170 1234567', error: errors.phone, inputmode: 'tel' })}
      ${field({ id: 'lead-email', name: 'email', label: 'E-Mail-Adresse', type: 'email', required: true, autocomplete: 'email', placeholder: 'name@beispiel.de', error: errors.email })}
      ${field({ id: 'lead-location', name: 'location', label: 'PLZ / Bauort', autocomplete: 'postal-code', placeholder: 'z. B. 80331 München', error: errors.location })}
    </div>

    <fieldset class="flex flex-col gap-1.5">
      <legend class="mb-1 text-label-tech text-on-surface-variant">Grundstück</legend>
      <div class="grid grid-cols-3 gap-1.5">
        ${PLOT_OPTIONS.map(
          (option) => html`<label class="segment grid place-items-center px-2 py-2 text-center text-body-sm font-semibold">
            <input class="sr-only" type="radio" name="plot" value=${option.id} ?checked=${option.id === DEFAULTS.plot} />
            ${option.label}
          </label>`,
        )}
      </div>
    </fieldset>

    <fieldset class="flex flex-col gap-1.5">
      <legend class="mb-1 text-label-tech text-on-surface-variant">Gewünschte Beratung</legend>
      <div class="grid grid-cols-2 gap-1.5">
        ${CONSULTATION_OPTIONS.map(
          (option) => html`<label class="segment flex items-center gap-2 px-3 py-2 text-body-sm font-semibold">
            <input class="sr-only" type="radio" name="consultation" value=${option.id} ?checked=${option.id === DEFAULTS.consultation} />
            ${option.id === 'video' ? icon('videocam', { size: 18 }) : icon('holiday_village', { size: 18 })} ${option.label}
          </label>`,
        )}
      </div>
    </fieldset>

    <div class="flex flex-col gap-1">
      <label for="lead-message" class="text-label-tech text-on-surface-variant">Nachricht (optional)</label>
      <textarea id="lead-message" name="message" rows="2" class="field resize-y" maxlength="1000" placeholder="Wunschtermin, Fragen zum Grundstück …" aria-invalid=${errors.message ? 'true' : 'false'}></textarea>
      ${errors.message ? html`<span class="text-body-sm text-error">${errors.message}</span>` : nothing}
    </div>

    <div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
      <label>Website <input type="text" name="website" tabindex="-1" autocomplete="off" /></label>
    </div>

    <label class="flex items-start gap-2.5 text-body-sm text-on-surface-variant">
      <input
        type="checkbox"
        name="consent"
        class="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]"
        aria-invalid=${errors.consent ? 'true' : 'false'}
        aria-describedby=${errors.consent ? 'lead-consent-error' : nothing}
      />
      <span>
        Ich willige ein, dass CITODOMUS meine Angaben und meine Konfiguration zur Bearbeitung der Anfrage verarbeitet und mich
        kontaktiert. Widerruf jederzeit möglich. Details in der
        ${privacyUrl
          ? html`<a class="font-semibold text-primary underline" href=${privacyUrl} target="_blank" rel="noopener">Datenschutzerklärung</a>`
          : html`Datenschutzerklärung`}.
        ${errors.consent ? html`<span id="lead-consent-error" class="mt-1 block text-error">${errors.consent}</span>` : nothing}
      </span>
    </label>

    ${lead.error
      ? html`<p class="flex items-start gap-2 rounded-lg bg-error-container p-3 text-body-sm text-on-error-container" role="alert">
          ${icon('error', { size: 18 })} ${lead.error}
        </p>`
      : nothing}

    <button type="submit" class="btn btn-primary w-full !py-3" ?disabled=${sending}>
      ${sending
        ? html`${icon('progress_activity', { size: 18, className: 'animate-spin' })} Wird gesendet …`
        : html`Verbindliches Festpreis-Angebot erhalten ${icon('send', { size: 18 })}`}
    </button>
    <p class="flex items-center justify-center gap-4 text-label-tech text-on-surface-variant">
      <span class="flex items-center gap-1">${icon('check', { size: 14, className: 'text-tertiary' })} 100 % unverbindlich</span>
      <span class="flex items-center gap-1">${icon('check', { size: 14, className: 'text-tertiary' })} Keine Vorab-Kosten</span>
    </p>
  </form>`;
}
