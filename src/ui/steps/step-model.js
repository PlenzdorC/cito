import { html, nothing } from 'lit-html';
import { MODELS, PRICING } from '../../data/catalog.js';
import { formatDelta, formatEuro, formatMonthly } from '../../core/format.js';
import { monthlyRate } from '../../core/pricing.js';
import { pill, radioCard, toggleRow } from '../components.js';
import { icon } from '../icons.js';

/** Schritt 1 – Haustyp & Größe */

function modelCard(model, config, actions) {
  const selected = config.model === model.id;
  const body = html`<span class="flex items-center gap-3 p-3.5">
    <span
      class="grid size-12 shrink-0 place-items-center rounded-lg transition-colors ${selected
        ? 'bg-primary text-on-primary shadow-sm'
        : 'bg-surface-container-high text-primary'}"
      >${icon(model.icon, { size: 24 })}</span
    >
    <span class="min-w-0 flex-1">
      <span class="flex flex-wrap items-baseline gap-x-1.5">
        <span class="text-label-strong text-on-surface">${model.name}</span>
        <span class="text-body-sm text-on-surface-variant">(${model.baseArea} m²)</span>
      </span>
      <span class="block text-body-sm text-on-surface-variant">${model.tagline}</span>
      ${model.badge ? pill(model.badge, { className: 'mt-1' }) : nothing}
    </span>
    <span class="shrink-0 text-right">
      <span class="block text-label-strong tabular-nums ${selected ? 'text-primary' : 'text-on-surface'}">${formatEuro(model.basePrice)}</span>
      <span class="block text-label-tech text-tertiary tabular-nums">ab ${formatMonthly(monthlyRate(model.basePrice))}</span>
    </span>
  </span>`;
  return radioCard({ name: 'model', value: model.id, selected, onSelect: actions.selectModel, body });
}

function areaControl(config, actions) {
  const model = MODELS[config.model];
  const fill = ((config.area - model.areaMin) / (model.areaMax - model.areaMin)) * 100;
  const mid = Math.round((model.areaMin + model.areaMax) / 2 / 5) * 5;
  return html`<div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between">
      <label for="area-slider" class="text-label-strong text-on-surface">Wohnfläche anpassen</label>
      <output for="area-slider" class="text-headline-sm text-primary tabular-nums">${config.area} m²</output>
    </div>
    <input
      id="area-slider"
      class="range"
      type="range"
      min=${model.areaMin}
      max=${model.areaMax}
      step="5"
      style="--fill:${fill}%"
      .value=${String(config.area)}
      aria-valuetext="${config.area} Quadratmeter"
      @input=${(event) => actions.setOptions({ area: Number(event.target.value) })}
    />
    <div class="flex justify-between text-label-tech text-on-surface-variant tabular-nums" aria-hidden="true">
      <span>${model.areaMin} m²</span><span>${mid} m²</span><span>${model.areaMax} m²</span>
    </div>
    <p class="text-body-sm text-on-surface-variant">
      ${formatEuro(PRICING.areaPricePerSqm)} je m² Abweichung von der Standardfläche (${model.baseArea} m²)
    </p>
  </div>`;
}

function roomsControl(config, derived, actions) {
  return html`<fieldset class="flex flex-col gap-1.5">
    <legend class="mb-1.5 text-label-strong text-on-surface">Zimmeranzahl</legend>
    <div class="grid grid-cols-4 gap-1.5">
      ${derived.roomOptions.map(
        (option) => html`<label
          class="segment grid place-items-center py-2 text-label-strong tabular-nums"
          title=${option.available ? `${option.rooms} Zimmer` : `Ab ${option.minArea} m² Wohnfläche`}
        >
          <input
            class="sr-only"
            type="radio"
            name="rooms"
            .checked=${config.rooms === option.rooms}
            ?disabled=${!option.available}
            @change=${() => actions.setOptions({ rooms: option.rooms })}
          />
          ${option.rooms === 6 ? '6+' : option.rooms}
          <span class="sr-only">Zimmer${option.available ? '' : ` (ab ${option.minArea} m²)`}</span>
        </label>`,
      )}
    </div>
    <p class="text-body-sm text-on-surface-variant">
      Wohnen/Essen zählt als ein Zimmer · je Zusatzzimmer ${formatDelta(PRICING.extraRoomPrice)}
    </p>
  </fieldset>`;
}

function floorsControl(config, derived, actions) {
  const model = MODELS[config.model];
  const options = [
    { floors: 1, label: '1 Geschoss', icon: 'looks_one' },
    { floors: 2, label: '2 Geschosse', icon: 'looks_two' },
  ];
  return html`<fieldset class="flex flex-col gap-1.5">
    <legend class="mb-1.5 text-label-strong text-on-surface">Geschosse</legend>
    <div class="grid grid-cols-2 gap-1.5">
      ${options.map((option) => {
        const available = model.floorOptions.includes(option.floors);
        const surcharge = option.floors === 1 && model.defaultFloors === 2 ? derived.prices.singleStorey : 0;
        return html`<label
          class="segment flex items-center gap-2 px-3 py-2.5 text-label-tech"
          title=${available ? '' : `${model.shortName} gibt es nur ${model.defaultFloors}-geschossig`}
        >
          <input
            class="sr-only"
            type="radio"
            name="floors"
            .checked=${config.floors === option.floors}
            ?disabled=${!available}
            @change=${() => actions.setOptions({ floors: option.floors })}
          />
          ${option.floors === 1 ? icon('looks_one', { size: 18 }) : icon('looks_two', { size: 18 })}
          <span class="flex-1">${option.label}</span>
          ${surcharge ? html`<span class="tabular-nums opacity-80">${formatDelta(surcharge)}</span>` : nothing}
        </label>`;
      })}
    </div>
  </fieldset>`;
}

export function stepModel(state, derived, actions) {
  const { config } = state;
  const model = MODELS[config.model];
  return html`
    <section class="panel-section flex flex-col gap-2.5" id="sec-model" aria-labelledby="h-model">
      <h3 id="h-model" class="text-label-strong text-on-surface">1. Architektonische Modelllinie</h3>
      <div class="grid gap-2" role="radiogroup" aria-labelledby="h-model">
        ${Object.values(MODELS).map((m) => modelCard(m, config, actions))}
      </div>
    </section>

    <section class="panel-section flex flex-col gap-5 rounded-xl bg-surface-container-low p-4" id="sec-size" aria-labelledby="h-size">
      <h3 id="h-size" class="text-label-strong text-on-surface">2. Größe & Grundriss</h3>
      ${areaControl(config, actions)} ${roomsControl(config, derived, actions)} ${floorsControl(config, derived, actions)}
      ${toggleRow({
        id: 'opt-accessible',
        icon: 'accessible_forward',
        title: 'Barrierefreier Grundriss',
        description: model.accessibleIncluded ? 'Beim Bungalow Alpha serienmäßig' : 'Breite Türen & ebenerdige Bäder',
        price: derived.prices.accessible,
        checked: config.accessible,
        disabled: model.accessibleIncluded,
        onToggle: (checked) => actions.setOptions({ accessible: checked }),
      })}
    </section>

    <aside class="flex flex-col gap-1 rounded-xl bg-tertiary-fixed/30 p-4">
      <span class="flex items-center gap-1.5 text-label-strong text-on-tertiary-fixed">
        ${icon('workspace_premium', { size: 20, className: 'text-tertiary' })} CITODOMUS 6-Monate-Garantie
      </span>
      <p class="text-body-sm text-on-surface-variant">
        Präzise Vorfertigung mit RAL-Gütezeichen im deutschen Werk. Verbindlicher Einzugstermin im Bauvertrag fixiert.
      </p>
    </aside>
  `;
}
