import { html } from 'lit-html';
import { BRICK_TONES, FACADES, FRAMES, PLASTER_COLORS, WOOD_TONES } from '../data/catalog.js';
import { BRAND_FACTS, TIMELINE } from '../data/content.js';
import { formatEuro, formatKwh, formatNumber, formatPercent } from '../core/format.js';
import { citoCard, kpiCard } from './components.js';
import { icon } from './icons.js';

/** Kontextkarten unter dem Viewport – je Schritt andere Inhalte. */

function facadeSwatches(config) {
  const plaster = PLASTER_COLORS[config.plasterColor];
  const wood = WOOD_TONES[config.woodTone];
  const brick = BRICK_TONES[config.brickTone];
  const frame = FRAMES[config.frame];
  const plasterTexture = `radial-gradient(rgb(0 0 0 / .06) 1px, transparent 1.2px) 0 0 / 5px 5px, ${plaster.hex}`;
  const woodTexture = `repeating-linear-gradient(90deg, ${wood.hex} 0 6px, rgb(0 0 0 / .22) 6px 7px), ${wood.hex}`;
  const brickTexture = `repeating-linear-gradient(0deg, #d8d2c8 0 1.5px, transparent 1.5px 9px), repeating-linear-gradient(90deg, #d8d2c8 0 1.5px, transparent 1.5px 18px), ${brick.hex}`;
  const primary =
    config.facade === 'holz'
      ? { texture: woodTexture, label: 'Rhombusschalung', value: wood.name }
      : config.facade === 'klinker'
        ? { texture: brickTexture, label: 'Klinkerriemchen', value: brick.name }
        : { texture: plasterTexture, label: 'Mineralputz 2 mm', value: plaster.name };
  const secondary =
    config.facade === 'klinker' && config.floors === 2
      ? { texture: plasterTexture, label: 'Putz Obergeschoss', value: plaster.name }
      : { texture: `linear-gradient(135deg, ${frame.hex}, ${frame.hex} 60%, #aebfcb 60%)`, label: 'Glas', value: 'Dreifach, Uw 0,72' };
  const frameSwatch = { texture: `linear-gradient(90deg, ${frame.hex} 0 30%, #9eb3c2 30% 70%, ${frame.hex} 70%)`, label: 'Fensterprofil', value: `${frame.code} ${frame.color}` };
  return [primary, secondary, frameSwatch];
}

function materialStrip(config) {
  return html`<div class="grid grid-cols-3 gap-2" aria-label="Aktuelle Materialien: ${FACADES[config.facade].name}">
    ${facadeSwatches(config).map(
      (s) => html`<div class="flex min-w-0 items-center gap-2.5 rounded-xl bg-surface-container-lowest p-2 shadow-lift">
        <span class="size-11 shrink-0 rounded-lg shadow-inner" style="background:${s.texture}"></span>
        <span class="flex min-w-0 flex-col">
          <span class="truncate text-label-tech text-on-surface-variant">${s.label}</span>
          <span class="truncate text-label-strong text-on-surface">${s.value}</span>
        </span>
      </div>`,
    )}
  </div>`;
}

function autarkyCard(energy) {
  const pct = Math.round(energy.autarky * 100);
  return html`<div class="flex flex-col justify-between gap-2 rounded-2xl bg-surface-container-lowest p-4 shadow-lift">
    <div class="flex items-center justify-between">
      <span class="text-label-tech text-on-surface-variant uppercase">Autarkiegrad</span>
      ${icon('energy_savings_leaf', { size: 18, className: 'text-tertiary' })}
    </div>
    <div class="flex items-center gap-3">
      <div class="relative size-16 shrink-0">
        <svg class="size-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--color-surface-container)" stroke-width="3.5" />
          <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--color-tertiary)" stroke-width="3.5" stroke-linecap="round"
            stroke-dasharray="${pct} 100" style="transition: stroke-dasharray .6s var(--ease-out-expo)" />
        </svg>
        <span class="absolute inset-0 grid place-items-center text-label-strong text-on-surface tabular-nums">${pct} %</span>
      </div>
      <div class="flex min-w-0 flex-col">
        <span class="text-body-sm font-bold text-on-surface">${pct >= 75 ? 'Nahezu netzunabhängig' : pct >= 60 ? 'Überwiegend Sonnenstrom' : 'Guter Eigenanteil'}</span>
        <span class="text-label-tech text-on-surface-variant">Mit ${energy.batteryKwh} kWh Speicher · ${formatKwh(energy.consumption)} Verbrauch</span>
      </div>
    </div>
  </div>`;
}

function savingsCard(energy) {
  return html`<div class="flex flex-col justify-between gap-1 rounded-2xl bg-surface-container-lowest p-4 shadow-lift">
    <div class="flex items-center justify-between">
      <span class="text-label-tech text-on-surface-variant uppercase">Ersparnis Strom</span>
      ${icon('savings', { size: 18, className: 'text-primary' })}
    </div>
    <div class="flex items-baseline gap-1">
      <span class="text-price-xl text-on-surface tabular-nums">${formatEuro(energy.savingsPerYear)}</span>
      <span class="text-label-tech text-on-surface-variant">/ Jahr</span>
    </div>
    <span class="flex items-center gap-1 text-label-tech text-tertiary">
      ${icon('trending_up', { size: 14 })} Amortisation in ca. ${formatNumber(energy.amortisationYears, 1)} Jahren
    </span>
  </div>`;
}

function comfortCard(derived) {
  const { energy, standard } = derived;
  return html`<div class="grid grid-cols-2 gap-2">
    ${kpiCard({ icon: 'energy_savings_leaf', label: 'Standard', value: standard.plus ? 'EH 40 Plus' : 'EH 40', note: 'QNG-Siegel möglich', tone: 'tertiary' })}
    ${kpiCard({ icon: 'heat', label: 'Heizkosten', value: `ca. ${formatEuro(energy.heatingCostPerYear)}`, note: 'pro Jahr mit WP-Tarif', tone: 'primary' })}
    ${kpiCard({ icon: 'solar_power', label: 'PV-Ertrag', value: formatKwh(energy.annualYield), note: 'pro Jahr', tone: 'secondary' })}
    ${kpiCard({ icon: 'co2', label: 'CO₂-Einsparung', value: `${formatNumber(energy.co2TonsPerYear, 1)} t`, note: 'pro Jahr durch PV', tone: 'tertiary' })}
  </div>`;
}

function timelineCard() {
  const tone = { primary: 'border-primary text-primary', tertiary: 'border-tertiary text-tertiary' };
  return html`<div class="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-4 shadow-lift">
    <div class="flex items-center justify-between gap-2">
      <span class="flex items-center gap-1.5 text-headline-sm text-on-surface">${icon('schedule', { size: 22, className: 'text-primary' })} Der Cito 6-Monate-Übergabe-Fahrplan</span>
      <span class="hidden rounded-full bg-primary-fixed px-2.5 py-1 text-label-tech font-bold text-on-primary-fixed sm:inline">Fixtermin-Garantie</span>
    </div>
    <ol class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      ${TIMELINE.map(
        (item, index) => html`<li class="flex flex-col gap-1 rounded-xl border-l-4 bg-surface-container-low p-3 ${tone[item.tone]} ${index === 3 ? 'bg-surface-container-high' : ''}">
          <span class="flex items-center justify-between text-label-tech uppercase">${item.weeks} ${icon(item.icon, { size: 18 })}</span>
          <span class="text-label-strong text-on-surface">${item.title}</span>
          <span class="text-body-sm text-on-surface-variant">${item.text}</span>
        </li>`,
      )}
    </ol>
    <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-container-low p-3">
      <span class="flex items-center gap-2.5">
        <span class="grid size-8 place-items-center rounded-full bg-tertiary-container text-on-tertiary">${icon('verified', { size: 18 })}</span>
        <span class="flex flex-col">
          <span class="text-label-strong text-on-surface">Vertragsstrafen-Garantie bei Verzug</span>
          <span class="text-body-sm text-on-surface-variant">1.500 € Entschädigung pro Woche Verzögerung durch CITODOMUS.</span>
        </span>
      </span>
    </div>
  </div>`;
}

export function contextDeck(state, derived, actions) {
  const tip = citoCard(derived.tip, { onApply: actions.applyTip });
  let content;
  switch (state.step) {
    case 1:
      content = html`<div class="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        ${tip}
        <div class="grid grid-cols-2 gap-2">${BRAND_FACTS.map((fact) => kpiCard(fact))}</div>
      </div>`;
      break;
    case 2:
      content = html`<div class="flex flex-col gap-3">${materialStrip(state.config)} ${tip}</div>`;
      break;
    case 3:
      content = html`<div class="grid gap-3 md:grid-cols-3">${autarkyCard(derived.energy)} ${savingsCard(derived.energy)} ${tip}</div>`;
      break;
    case 4:
      content = html`<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">${comfortCard(derived)} ${tip}</div>`;
      break;
    default:
      content = timelineCard();
  }
  return html`<div class="context-deck shrink-0" aria-label="Informationen zur Konfiguration">${content}</div>`;
}
