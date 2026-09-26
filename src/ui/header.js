import { html, nothing } from 'lit-html';
import { STEPS } from '../data/catalog.js';
import { CITO_AVATARS } from '../data/content.js';
import { icon } from './icons.js';
import { returnTarget } from './return-link.js';

/** Hausförmiges Markenzeichen (Terracotta-Dach, Anthrazit-Korpus). */
const logoMark = html`<svg class="shrink-0" width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
  <path d="M16 3 3 13.5l2.4 2.9L16 7.7l10.6 8.7 2.4-2.9L25 10.2V5h-3.6v2.3Z" fill="var(--color-accent)" />
  <path d="M7.5 16.2 16 9.3l8.5 6.9V28h-6.2v-6.3h-4.6V28H7.5Z" fill="var(--color-slate)" />
  <circle cx="13" cy="17" r="1.1" fill="#fff" />
  <circle cx="19" cy="17" r="1.1" fill="#fff" />
</svg>`;

function stepNav(state, actions) {
  return html`<nav aria-label="Konfigurationsschritte" class="min-w-0">
    <ol class="step-scroller flex items-center gap-1 overflow-x-auto rounded-full bg-surface-container-low p-1">
      ${STEPS.map((step) => {
        const current = step.id === state.step;
        const done = step.id < state.step || (step.id <= state.maxStep && !current);
        return html`<li class="shrink-0">
          <button
            type="button"
            class="step-pill flex items-center gap-1.5 rounded-full px-3 py-1.5 text-body-sm whitespace-nowrap transition-colors ${current
              ? ''
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}"
            aria-current=${current ? 'step' : 'false'}
            @click=${() => actions.goToStep(step.id)}
          >
            ${done
              ? html`<span class="grid size-4 place-items-center rounded-full bg-slate text-tertiary-fixed">${icon('check', { size: 12 })}</span>`
              : html`<span class="tabular-nums ${current ? '' : 'opacity-70'}">${step.id}.</span>`}
            <span class="${current ? '' : 'hidden xl:inline'}">${step.title}</span>
            <span class="sr-only">${done ? '(erledigt)' : current ? '(aktuell)' : ''}</span>
          </button>
        </li>`;
      })}
    </ol>
  </nav>`;
}

/** Zurück zur Seite, die den Konfigurator aufgerufen hat (nur mit ?return=…). */
function backLink(target) {
  if (!target) return nothing;
  const label = `Zurück zu ${target.host}`;
  return html`<a
      id="return-link"
      class="btn btn-quiet !gap-1.5 !p-2 md:!py-2 md:!pr-3.5 md:!pl-2.5"
      href=${target.href}
      aria-label=${label}
      title=${label}
    >
      ${icon('arrow_back', { size: 18 })}
      <span class="hidden max-w-40 truncate md:inline" aria-hidden="true">${target.host}</span>
    </a>
    <span class="hidden h-7 w-px bg-line-strong sm:block" aria-hidden="true"></span>`;
}

export function header(state, derived, actions) {
  return html`<header class="app-header" id="app-header">
    <div class="flex h-16 items-center justify-between gap-3 px-4 lg:h-[4.5rem] lg:px-8">
      <div class="flex shrink-0 items-center gap-2.5 sm:gap-3">
        ${backLink(returnTarget(state, derived))}
        <a
          class="flex shrink-0 items-center gap-2.5 rounded-lg"
          href="#"
          @click=${(event) => {
            event.preventDefault();
            actions.goToStep(1);
          }}
          aria-label="CITODOMUS 3D-Planer – zum Start"
        >
          ${logoMark}
          <span class="flex flex-col leading-none">
            <span class="flex items-center gap-1.5">
              <span class="text-headline-sm font-extrabold tracking-tight text-primary uppercase">Citodomus</span>
              <span class="hidden rounded-full bg-tertiary-container px-1.5 py-0.5 text-[11px] font-semibold text-on-tertiary min-[400px]:inline"
                >3D Planer</span
              >
            </span>
            <span class="mt-1 hidden text-label-tech text-on-surface-variant sm:block">In 6 Monaten zuhause.</span>
          </span>
        </a>
      </div>
      ${state.partner
        ? html`<span class="hidden items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 text-label-tech whitespace-nowrap text-on-surface md:flex">
            <span class="size-2 rounded-full bg-tertiary"></span> Partner ${state.partner}
          </span>`
        : html`<span class="hidden items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1 text-label-tech text-on-surface 2xl:flex">
            ${icon('verified', { size: 16, className: 'text-tertiary' })} Modulare Präzision
          </span>`}
      <div class="hidden flex-1 justify-center lg:flex">${stepNav(state, actions)}</div>
      <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <button type="button" class="btn btn-secondary !gap-2 !p-1 sm:!py-1.5 sm:!pr-3.5 sm:!pl-1.5" aria-label="Frage an Cito" @click=${actions.openCito}>
          <img src=${CITO_AVATARS.wave} alt="" width="28" height="28" class="size-7 rounded-full object-cover" />
          <span class="hidden sm:inline" aria-hidden="true">Frage an Cito</span>
        </button>
        <button type="button" class="icon-btn" title="Teilen & Einbetten" aria-label="Teilen & Einbetten" @click=${actions.openShare}>
          ${icon('share', { size: 18 })}
        </button>
        <button type="button" class="icon-btn hidden sm:inline-flex" title="Konfiguration speichern" aria-label="Konfiguration speichern" @click=${actions.saveConfig}>
          ${icon('bookmark', { size: 18 })}
        </button>
      </div>
    </div>
    <div class="border-t border-line/60 px-4 py-2 lg:hidden">${stepNav(state, actions)}</div>
  </header>`;
}
