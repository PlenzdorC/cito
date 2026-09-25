import { html, nothing } from 'lit-html';
import { STEPS } from '../data/catalog.js';
import { formatDelta, formatEuro } from '../core/format.js';
import { subtotalUntil } from '../core/pricing.js';
import { icon } from './icons.js';
import { stepFacade } from './steps/step-facade.js';
import { stepInterior } from './steps/step-interior.js';
import { stepModel } from './steps/step-model.js';
import { stepOffer } from './steps/step-offer.js';
import { stepRoof } from './steps/step-roof.js';

/** Rechte Spalte: Schrittkopf, Optionen, Zwischensumme und Navigation. */

const STEP_BODIES = { 1: stepModel, 2: stepFacade, 3: stepRoof, 4: stepInterior, 5: stepOffer };

const SUBTITLES = {
  1: 'Wähle Modelllinie, Wohnfläche und Raumprogramm – Statik und Preis rechnen live mit.',
  2: 'Widerstandsfähige, langlebige Oberflächen nach deutschem QNG-Nachhaltigkeitsstandard.',
  3: 'Dachform und Photovoltaik bestimmen deinen Ertrag – die Simulation zeigt dir die Wirkung.',
  4: 'Materialien und Haustechnik für dein Wohngefühl – im Innenraum-Viewer sofort sichtbar.',
  5: 'Prüfe deine Kalkulation und sichere dir den Festpreis – unverbindlich und kostenlos.',
};

function panelHead(state) {
  const step = STEPS[state.step - 1];
  const progress = state.step * 20;
  return html`<div class="flex flex-col gap-2 px-5 pt-5 pb-4">
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 flex-col">
        <span class="text-label-tech font-extrabold tracking-widest text-primary uppercase">Schritt ${state.step} von 5</span>
        <h2 class="text-headline-md text-on-surface" id="panel-title" tabindex="-1">${step.heading}</h2>
      </div>
      <span class="shrink-0 rounded-full bg-primary-fixed px-2.5 py-1 text-label-strong text-on-primary-fixed tabular-nums">${progress} % fertig</span>
    </div>
    <p class="text-body-sm text-on-surface-variant">${SUBTITLES[state.step]}</p>
    <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-container" role="progressbar" aria-label="Fortschritt" aria-valuemin="0" aria-valuemax="100" aria-valuenow=${progress}>
      <div class="h-full rounded-full bg-primary transition-[width] duration-500" style="width:${progress}%"></div>
    </div>
  </div>`;
}

function panelFoot(state, derived, actions) {
  const { breakdown } = derived;
  const next = STEPS[state.step];
  const stepDelta = breakdown.byStep[state.step];
  return html`<div class="flex flex-col gap-3 rounded-b-2xl border-t border-surface-container bg-surface-container-low/80 px-5 py-4">
    ${state.step < 5
      ? html`<div class="flex flex-col gap-1 text-body-sm">
          <div class="flex items-center justify-between text-on-surface-variant">
            <span>Dieser Schritt</span>
            <span class="font-semibold tabular-nums ${stepDelta === 0 ? 'text-tertiary' : 'text-primary'}">${formatDelta(stepDelta, { includedLabel: 'ohne Aufpreis' })}</span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="text-label-strong text-on-surface uppercase">Zwischensumme Schritt ${state.step}</span>
            <span class="text-headline-md text-on-surface tabular-nums">${formatEuro(subtotalUntil(breakdown, state.step))}</span>
          </div>
        </div>`
      : nothing}
    <div class="flex items-center gap-2">
      ${state.step > 1
        ? html`<button type="button" class="btn btn-quiet" @click=${actions.prevStep}>
            ${icon('arrow_back', { size: 18 })}<span class="hidden sm:inline">${STEPS[state.step - 2].short}</span><span class="sm:hidden">Zurück</span>
          </button>`
        : nothing}
      ${next
        ? html`<button type="button" class="btn btn-primary flex-1" @click=${actions.nextStep}>
            <span class="truncate">Weiter zu ${next.title}</span>${icon('arrow_forward', { size: 18 })}
          </button>`
        : html`<button type="button" class="btn btn-primary flex-1" @click=${actions.saveConfig}>
            ${icon('bookmark_added', { size: 18 })} Konfiguration speichern
          </button>`}
    </div>
  </div>`;
}

export function configPanel(state, derived, actions) {
  const body = STEP_BODIES[state.step];
  return html`<aside class="config-panel" aria-labelledby="panel-title">
    ${panelHead(state)}
    <div class="panel-body flex flex-col gap-5" id="panel-body">${body(state, derived, actions)}</div>
    ${panelFoot(state, derived, actions)}
  </aside>`;
}
