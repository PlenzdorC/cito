import { html, nothing } from 'lit-html';
import { FINANCING, MODELS } from '../../data/catalog.js';
import { EXCLUDED_SERVICES, INCLUDED_SERVICES } from '../../data/content.js';
import { formatDelta, formatEuro, formatMonthly, formatNumber } from '../../core/format.js';
import { pill } from '../components.js';
import { icon } from '../icons.js';
import { leadForm } from './lead-form.js';
import { embedGenerator } from './embed-generator.js';

/** Schritt 5 – Angebot & Kontakt */

function summaryHeader(state, derived) {
  const model = MODELS[state.config.model];
  return html`<div class="flex flex-col gap-3 rounded-xl bg-surface-container-low p-4">
    <div class="flex items-center gap-3">
      <span class="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-headline-sm text-on-primary">5</span>
      <div class="flex min-w-0 flex-col">
        <span class="text-label-tech text-primary uppercase">Konfiguration vollständig</span>
        <span class="text-headline-sm text-on-surface">${model.shortName} · ${state.config.area} m² ${state.config.floors === 1 ? 'eingeschossig' : 'zweigeschossig'}</span>
      </div>
    </div>
    <div class="flex flex-wrap gap-2">
      <span class="inline-flex items-center gap-1 rounded-full bg-tertiary-container px-3 py-1 text-label-tech text-on-tertiary">
        ${icon('verified', { size: 16 })} 12 Monate Festpreisgarantie
      </span>
      <span class="rounded-full bg-surface-container px-3 py-1 text-label-tech text-on-surface-variant tabular-nums">ID: ${derived.configId}</span>
    </div>
  </div>`;
}

function financing(state, derived, actions) {
  const total = derived.breakdown.total;
  const max = Math.floor((total * FINANCING.maxEquityShare) / FINANCING.equityStep) * FINANCING.equityStep;
  const fill = max > 0 ? (state.equity / max) * 100 : 0;
  return html`<div class="flex flex-col gap-2 rounded-xl border border-line p-3.5">
    <div class="flex items-center justify-between">
      <label for="equity" class="text-label-strong text-on-surface">Eigenkapital</label>
      <output for="equity" class="text-label-strong text-primary tabular-nums">${formatEuro(state.equity)}</output>
    </div>
    <input
      id="equity"
      class="range"
      type="range"
      min="0"
      max=${max}
      step=${FINANCING.equityStep}
      style="--fill:${fill}%"
      .value=${String(state.equity)}
      aria-valuetext="${formatNumber(state.equity)} Euro Eigenkapital"
      @input=${(event) => actions.setEquity(Number(event.target.value))}
    />
    <div class="flex items-baseline justify-between gap-2">
      <span class="text-body-sm text-on-surface-variant">Darlehen ${formatEuro(Math.max(0, total - state.equity))}</span>
      <span class="text-price-md text-primary tabular-nums">${formatMonthly(derived.monthly)}</span>
    </div>
    <p class="text-[11px] leading-snug text-on-surface-variant">
      Beispielrechnung: ${formatNumber(FINANCING.interestRate * 100, 2)} % Sollzins p. a., ${formatNumber(FINANCING.repaymentRate * 100, 0)} %
      anfängliche Tilgung. Keine Finanzierungszusage.
    </p>
  </div>`;
}

function costCard(state, derived, actions) {
  const { breakdown } = derived;
  const model = MODELS[state.config.model];
  return html`<section class="flex flex-col gap-3" aria-labelledby="h-kosten">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3 id="h-kosten" class="text-headline-sm text-on-surface">Kostenkalkulation & Förderung</h3>
      ${pill('KfW 297/298 geeignet*', { tone: 'tertiary' })}
    </div>
    <ul class="flex flex-col divide-y divide-surface-container text-body-md">
      <li class="flex items-baseline justify-between gap-3 py-2">
        <span class="text-on-surface">Basishaus ${model.name} (${model.baseArea} m²)</span>
        <span class="shrink-0 text-label-strong text-on-surface tabular-nums">${formatEuro(breakdown.basePrice)}</span>
      </li>
      ${breakdown.items.map(
        (item) => html`<li class="flex items-baseline justify-between gap-3 py-2">
          <span class="text-on-surface-variant">${item.label}</span>
          <span class="shrink-0 text-label-strong tabular-nums ${item.included ? 'text-tertiary' : item.amount < 0 ? 'text-tertiary' : 'text-on-surface'}"
            >${formatDelta(item.amount, { includedLabel: 'inklusive' })}</span
          >
        </li>`,
      )}
      <li class="flex items-baseline justify-between gap-3 py-2">
        <span class="text-on-surface-variant">Transport, Kranmontage & Inbetriebnahme</span>
        <span class="shrink-0 text-label-strong text-tertiary">inklusive</span>
      </li>
    </ul>
    <div class="flex items-center justify-between gap-3 rounded-lg bg-tertiary-fixed-dim/30 p-3">
      <span class="flex flex-col">
        <span class="text-label-strong text-on-tertiary-fixed-variant">KfW-Förderkredit „Klimafreundlicher Neubau“</span>
        <span class="text-label-tech text-tertiary">Zinsverbilligt, mit QNG-Siegel bis zu</span>
      </span>
      <span class="text-price-md text-tertiary tabular-nums">${formatEuro(FINANCING.kfwMaxLoan)}</span>
    </div>
    <div class="flex flex-col gap-1 rounded-xl bg-surface-container-low p-4">
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-label-tech text-on-surface-variant uppercase">Festpreis gesamt</span>
        <span class="text-price-xl text-primary tabular-nums">${formatEuro(breakdown.total)}</span>
      </div>
      <div class="flex items-center justify-between gap-2 text-body-sm text-on-surface-variant">
        <span>Inklusive MwSt. & bezugsfertiger Übergabe</span>
        <span class="font-bold text-primary tabular-nums">Monatlich ca. ${formatEuro(derived.monthly)}</span>
      </div>
    </div>
    ${financing(state, derived, actions)}
    <details class="faq rounded-xl bg-surface-container-low">
      <summary class="flex items-center justify-between gap-2 p-3 text-label-strong text-on-surface">
        Was ist im Festpreis enthalten?
        <span class="faq-chevron transition-transform">${icon('keyboard_arrow_down', { size: 20 })}</span>
      </summary>
      <div class="grid gap-3 px-3 pb-3 sm:grid-cols-2">
        <ul class="flex flex-col gap-1 text-body-sm text-on-surface">
          ${INCLUDED_SERVICES.map((s) => html`<li class="flex items-start gap-1.5">${icon('check', { size: 16, className: 'mt-0.5 text-tertiary' })}${s}</li>`)}
        </ul>
        <ul class="flex flex-col gap-1 text-body-sm text-on-surface-variant">
          ${EXCLUDED_SERVICES.map((s) => html`<li class="flex items-start gap-1.5">${icon('remove', { size: 16, className: 'mt-0.5' })}${s}</li>`)}
        </ul>
      </div>
    </details>
    <p class="text-[11px] leading-snug text-on-surface-variant">
      * Richtwerte, unverbindlich. Förderfähigkeit und Konditionen werden im Rahmen der Energieberatung geprüft.
    </p>
  </section>`;
}

function actionTabs(state, derived, actions) {
  const tabs = [
    { id: 'bauherr', label: 'Für Bauherren' },
    { id: 'partner', label: 'Für Partner / Webseiten' },
  ];
  return html`<section class="flex flex-col gap-3" aria-label="Anfrage oder Einbettung">
    <div class="flex rounded-full bg-surface-container-low p-1" role="tablist" aria-label="Anfrageart">
      ${tabs.map(
        (tab) => html`<button
          type="button"
          role="tab"
          id="tab-${tab.id}"
          aria-selected=${state.offerTab === tab.id}
          aria-controls="panel-${tab.id}"
          tabindex=${state.offerTab === tab.id ? 0 : -1}
          class="flex-1 rounded-full px-3 py-2 text-label-strong transition-all ${state.offerTab === tab.id
            ? 'bg-primary text-on-primary shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface'}"
          @click=${() => actions.setOfferTab(tab.id)}
          @keydown=${(event) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              const next = tab.id === 'bauherr' ? 'partner' : 'bauherr';
              actions.setOfferTab(next);
              requestAnimationFrame(() => document.getElementById(`tab-${next}`)?.focus());
            }
          }}
        >
          ${tab.label}
        </button>`,
      )}
    </div>
    <div id="panel-bauherr" role="tabpanel" aria-labelledby="tab-bauherr" ?hidden=${state.offerTab !== 'bauherr'}>
      ${leadForm(state, derived, actions)}
    </div>
    <div id="panel-partner" role="tabpanel" aria-labelledby="tab-partner" ?hidden=${state.offerTab !== 'partner'}>
      ${state.offerTab === 'partner' ? embedGenerator(state, actions) : nothing}
    </div>
  </section>`;
}

function exportCard(actions) {
  return html`<section class="flex flex-col gap-3 rounded-xl bg-surface-container-low p-4" aria-labelledby="h-export">
    <div class="flex items-start gap-3">
      <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-fixed text-primary">${icon('roofing', { size: 26 })}</span>
      <div class="flex flex-col">
        <h3 id="h-export" class="text-label-strong text-on-surface">Planungsdaten exportieren</h3>
        <p class="text-body-sm text-on-surface-variant">Exposé mit Grundriss, Energiedaten und Kalkulation – oder das 3D-Modell für eigene Planungen.</p>
      </div>
    </div>
    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn btn-quiet !py-2" @click=${actions.printExpose}>${icon('picture_as_pdf', { size: 18 })} Exposé (PDF)</button>
      <button type="button" class="btn btn-quiet !py-2" @click=${actions.exportModel}>${icon('view_in_ar', { size: 18 })} 3D-Modell (.glb)</button>
      <button type="button" class="btn btn-quiet !py-2" @click=${actions.openShare}>${icon('link', { size: 18 })} Link teilen</button>
    </div>
  </section>`;
}

export function stepOffer(state, derived, actions) {
  return html`<div class="flex flex-col gap-5">
    ${summaryHeader(state, derived)} ${costCard(state, derived, actions)} ${actionTabs(state, derived, actions)} ${exportCard(actions)}
  </div>`;
}
