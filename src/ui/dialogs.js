import { html } from 'lit-html';
import { CITO_AVATARS, FAQ } from '../data/content.js';
import { citoCard } from './components.js';
import { icon } from './icons.js';

/** Dialoge: Cito-Assistent (Schublade) und Teilen (Modal). Geöffnet werden sie in main.js per showModal(). */

const closeOnBackdrop = (event) => {
  if (event.target === event.currentTarget) event.currentTarget.close();
};

export function citoDialog(state, derived, actions) {
  return html`<dialog id="cito-dialog" class="drawer" aria-labelledby="cito-title" @close=${actions.closeDialog} @click=${closeOnBackdrop}>
    <div class="flex h-full flex-col">
      <div class="relative flex items-end gap-4 bg-slate px-5 pt-5 text-inverse-on-surface">
        <img src=${CITO_AVATARS.full} alt="Cito, das CITODOMUS-Maskottchen" width="104" height="163" class="h-40 w-auto shrink-0 object-contain" />
        <div class="flex flex-col gap-1 pb-5">
          <span class="text-label-tech tracking-wider text-tertiary-fixed uppercase">Dein digitaler Bauberater</span>
          <h2 id="cito-title" class="text-headline-md">Hallo, ich bin Cito!</h2>
          <p class="text-body-sm text-surface-container-high">Frag mich alles rund um Bauzeit, Festpreis, Förderung und dein Grundstück.</p>
        </div>
        <button type="button" class="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Schließen" @click=${actions.closeDialog}>
          ${icon('close', { size: 20 })}
        </button>
      </div>
      <div class="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
        <section class="flex flex-col gap-2" aria-labelledby="cito-tip-title">
          <h3 id="cito-tip-title" class="text-label-strong text-on-surface">Mein Tipp zu deiner Konfiguration</h3>
          ${citoCard(derived.tip, { onApply: actions.applyTip, className: '!shadow-none ring-1 ring-line' })}
        </section>
        <section class="flex flex-col gap-2" aria-labelledby="cito-faq-title">
          <h3 id="cito-faq-title" class="text-label-strong text-on-surface">Häufige Fragen</h3>
          ${FAQ.map(
            (item) => html`<details class="faq rounded-xl bg-surface-container-low">
              <summary class="flex items-center justify-between gap-3 p-3.5 text-label-strong text-on-surface">
                ${item.question}
                <span class="faq-chevron shrink-0 text-on-surface-variant transition-transform">${icon('keyboard_arrow_down', { size: 20 })}</span>
              </summary>
              <p class="px-3.5 pb-3.5 text-body-md text-on-surface-variant">${item.answer}</p>
            </details>`,
          )}
        </section>
      </div>
      <div class="flex flex-col gap-2 border-t border-surface-container p-4">
        <span class="text-body-sm text-on-surface-variant">Lieber persönlich? Unsere Bauberater sind für dich da.</span>
        <button type="button" class="btn btn-primary w-full" @click=${actions.requestOffer}>
          ${icon('support_agent', { size: 18 })} Beratung anfragen
        </button>
      </div>
    </div>
  </dialog>`;
}

export function shareDialog(state, derived, actions) {
  const shareUrl = actions.shareUrl();
  const mail = `mailto:?subject=${encodeURIComponent('Mein CITODOMUS Traumhaus')}&body=${encodeURIComponent(
    `Schau dir meine Hauskonfiguration an (${derived.configId}):\n${shareUrl}`,
  )}`;
  return html`<dialog id="share-dialog" class="modal" aria-labelledby="share-title" @close=${actions.closeDialog} @click=${closeOnBackdrop}>
    <div class="flex flex-col gap-4 p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="flex flex-col gap-1">
          <h2 id="share-title" class="text-headline-md text-on-surface">Konfiguration teilen</h2>
          <p class="text-body-sm text-on-surface-variant">Der Link öffnet genau diese Konfiguration – ideal für Familie, Bank oder Partner.</p>
        </div>
        <button type="button" class="icon-btn shrink-0" aria-label="Schließen" @click=${actions.closeDialog}>${icon('close', { size: 20 })}</button>
      </div>
      <div class="flex items-center gap-2">
        <label for="share-url" class="sr-only">Link zur Konfiguration</label>
        <input id="share-url" class="field code-box min-w-0 flex-1 !py-2 text-body-sm" readonly .value=${shareUrl} @focus=${(e) => e.target.select()} />
        <button type="button" class="btn btn-primary !py-2.5" @click=${() => actions.copyText(shareUrl, 'Link kopiert')}>
          ${icon('content_copy', { size: 18 })} Kopieren
        </button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <a class="btn btn-quiet" href=${mail}>${icon('mail', { size: 18 })} Per E-Mail</a>
        <button type="button" class="btn btn-quiet" @click=${actions.saveConfig}>${icon('bookmark_add', { size: 18 })} Im Browser merken</button>
      </div>
      <button type="button" class="btn btn-quiet" @click=${actions.embedFromShare}>
        ${icon('code', { size: 18 })} Auf eigener Website einbetten
      </button>
      <div class="flex items-center justify-between gap-3 border-t border-surface-container pt-3">
        <span class="text-body-sm text-on-surface-variant tabular-nums">Konfigurations-ID: ${derived.configId}</span>
        <button type="button" class="flex items-center gap-1 text-label-strong text-error hover:underline" @click=${actions.resetConfig}>
          ${icon('restart_alt', { size: 16 })} Neu starten
        </button>
      </div>
    </div>
  </dialog>`;
}

export function toastRegion(state, actions) {
  return html`<div class="toast-region" role="status" aria-live="polite">
    ${state.toasts.map(
      (toast) => html`<div
        class="toast flex items-start gap-2.5 rounded-xl p-3 shadow-float ${toast.tone === 'warn'
          ? 'bg-primary-fixed text-on-primary-fixed'
          : toast.tone === 'error'
            ? 'bg-error-container text-on-error-container'
            : 'bg-inverse-surface text-inverse-on-surface'}"
      >
        ${toast.tone === 'warn'
          ? icon('info', { size: 20, className: 'shrink-0' })
          : toast.tone === 'error'
            ? icon('error', { size: 20, className: 'shrink-0' })
            : icon('check_circle', { size: 20, className: 'shrink-0 text-tertiary-fixed' })}
        <span class="flex-1 text-body-md">${toast.text}</span>
        ${toast.action
          ? html`<button type="button" class="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-label-strong hover:bg-white/25" @click=${() => actions.runToastAction(toast)}>
              ${toast.action.label}
            </button>`
          : ''}
        <button type="button" class="shrink-0 opacity-70 hover:opacity-100" aria-label="Hinweis schließen" @click=${() => actions.dismissToast(toast.id)}>
          ${icon('close', { size: 18 })}
        </button>
      </div>`,
    )}
  </div>`;
}
