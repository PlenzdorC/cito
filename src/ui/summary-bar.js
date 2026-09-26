import { html } from 'lit-html';
import { formatDelta, formatEuro, formatMonthly } from '../core/format.js';
import { icon } from './icons.js';

/** Live-Kalkulationsleiste (DESIGN.md: „Live Calculation Summary Bar“). */
export function summaryBar(state, derived, actions) {
  const { breakdown } = derived;
  const sending = state.lead.status === 'sending';
  return html`<footer class="summary-bar" id="summary-bar">
    <div class="flex items-center justify-between gap-3 px-4 py-2.5 lg:px-8 lg:py-3">
      <div class="flex min-w-0 items-center gap-4 lg:gap-6">
        <div class="flex min-w-0 flex-col">
          <span class="text-label-tech whitespace-nowrap text-on-surface-variant uppercase">
            <span class="hidden sm:inline">Geschätzter </span>Gesamtpreis
          </span>
          <span class="flex flex-wrap items-baseline gap-x-1.5">
            <span class="text-price-md whitespace-nowrap text-on-surface tabular-nums sm:text-price-xl">${formatEuro(breakdown.total)}</span>
            <span class="text-label-tech font-bold whitespace-nowrap text-tertiary">inkl. MwSt.</span>
          </span>
        </div>
        <div class="hidden flex-col border-l border-surface-container pl-4 xl:flex lg:pl-6">
          <span class="text-label-tech text-on-surface-variant uppercase">Basis & Upgrades</span>
          <span class="text-label-strong text-on-surface tabular-nums">
            ${formatEuro(breakdown.basePrice)}
            <span class="${breakdown.upgradesTotal > 0 ? 'text-primary' : 'text-tertiary'}"
              >${formatDelta(breakdown.upgradesTotal, { includedLabel: '+ 0 €' })}</span
            >
          </span>
        </div>
        <div class="hidden flex-col border-l border-surface-container pl-4 sm:flex lg:pl-6">
          <span class="text-label-tech text-on-surface-variant uppercase">Monatliche Finanzierungsrate</span>
          <span class="text-price-md text-primary tabular-nums">ab ${formatMonthly(derived.monthly)}</span>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <button type="button" class="btn btn-secondary hidden md:inline-flex" @click=${actions.printExpose}>
          ${icon('download', { size: 18 })} PDF Exposé
        </button>
        <button type="button" class="btn btn-primary" ?disabled=${sending} @click=${actions.requestOffer}>
          <span class="hidden lg:inline">Jetzt Traumhaus unverbindlich anfragen</span>
          <span class="lg:hidden">Anfragen</span>
          ${sending ? icon('progress_activity', { size: 18, className: 'animate-spin' }) : icon('arrow_forward', { size: 18 })}
        </button>
      </div>
    </div>
  </footer>`;
}
