import { html, nothing } from 'lit-html';
import { BATHS, COMFORT_EXTRAS, FLOORINGS, INTERIOR_EXTRAS, INTERIOR_INCLUDED } from '../../data/catalog.js';
import { formatEuro } from '../../core/format.js';
import { doorCount } from '../../core/pricing.js';
import { deltaBadge, includedRow, pill, radioCard, sectionHeader, toggleRow } from '../components.js';
import { icon } from '../icons.js';

/** Schritt 4 – Ausstattung & Energie (im Stil der Vorlagen ergänzt) */

/** CSS-Musterflächen als Materialvorschau für Bodenbeläge. */
const FLOOR_PATTERNS = {
  vinyl:
    'repeating-linear-gradient(90deg, rgb(0 0 0 / .05) 0 1px, transparent 1px 34%), repeating-linear-gradient(0deg, #dcc6a1 0 11px, #d3bb93 11px 12px, #e0cba8 12px 23px, #d6bf98 23px 24px)',
  parkett:
    'repeating-linear-gradient(90deg, rgb(0 0 0 / .08) 0 1px, transparent 1px 48%), repeating-linear-gradient(0deg, #b78651 0 14px, #9f7042 14px 15px, #c0915c 15px 29px, #a87a4a 29px 30px)',
  feinstein:
    'repeating-linear-gradient(90deg, rgb(255 255 255 / .55) 0 1px, transparent 1px 50%), repeating-linear-gradient(0deg, rgb(255 255 255 / .55) 0 1px, transparent 1px 50%), radial-gradient(circle at 30% 40%, #b4afa7, #a29d94)',
};

function flooringCard(flooring, config, derived, actions) {
  const selected = config.flooring === flooring.id;
  const body = html`<span class="flex h-full flex-col gap-2 p-2.5">
    <span class="relative block h-16 overflow-hidden rounded-lg shadow-inner" style="background:${FLOOR_PATTERNS[flooring.id]}">
      ${flooring.badge
        ? html`<span class="absolute top-1 right-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-on-primary">${flooring.badge}</span>`
        : nothing}
    </span>
    <span class="flex flex-col">
      <span class="text-label-strong text-on-surface">${flooring.name}</span>
      <span class="text-[11px] leading-tight text-on-surface-variant">${flooring.description}</span>
    </span>
    <span class="mt-auto flex flex-col border-t border-surface-container-high pt-1.5">
      ${deltaBadge(derived.prices.flooring[flooring.id], { emphasis: selected })}
      ${flooring.pricePerSqm
        ? html`<span class="text-[11px] text-on-surface-variant tabular-nums">${flooring.pricePerSqm} € × ${config.area} m²</span>`
        : nothing}
    </span>
  </span>`;
  return radioCard({
    name: 'flooring',
    value: flooring.id,
    selected,
    onSelect: (id) => actions.setOptions({ flooring: id }),
    body,
    className: 'h-full',
  });
}

function bathCard(bath, config, derived, actions) {
  const selected = config.bath === bath.id;
  const body = html`<span class="flex items-center gap-3 p-3">
    <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary-container/70 ${selected ? 'text-primary' : 'text-on-secondary-container'}"
      >${icon(bath.icon, { size: 22 })}</span
    >
    <span class="min-w-0 flex-1">
      <span class="block text-label-strong text-on-surface">${bath.name}</span>
      <span class="block text-body-sm text-on-surface-variant">${bath.description}</span>
    </span>
    ${deltaBadge(derived.prices.bath[bath.id], { emphasis: selected })}
  </span>`;
  return radioCard({ name: 'bath', value: bath.id, selected, onSelect: (id) => actions.setOptions({ bath: id }), body });
}

function standardChecklist(derived) {
  const { standard } = derived;
  return html`<div class="flex flex-col gap-2 rounded-xl p-3.5 ${standard.plus ? 'bg-tertiary-fixed/40' : 'bg-surface-container-low'}">
    <div class="flex items-center justify-between gap-2">
      <span class="flex items-center gap-1.5 text-label-strong text-on-surface">
        ${icon('energy_savings_leaf', { size: 18, className: 'text-tertiary' })} ${standard.label}
      </span>
      ${standard.plus ? pill('Erreicht', { tone: 'tertiary' }) : pill('40 Plus möglich', { tone: 'neutral' })}
    </div>
    <ul class="grid grid-cols-2 gap-x-3 gap-y-1">
      ${standard.checks.map(
        (check) => html`<li class="flex items-center gap-1.5 text-body-sm ${check.ok ? 'text-on-surface' : 'text-on-surface-variant'}">
          ${check.ok
            ? icon('check_circle_fill', { size: 16, className: 'text-tertiary' })
            : icon('radio_button_unchecked', { size: 16, className: 'text-outline' })}
          ${check.label}
        </li>`,
      )}
    </ul>
  </div>`;
}

export function stepInterior(state, derived, actions) {
  const { config } = state;
  const prices = derived.prices;
  const secondBathAllowed = config.area >= INTERIOR_EXTRAS.secondBath.minArea;
  return html`
    <section class="panel-section flex flex-col gap-3" id="sec-boden" aria-labelledby="h-boden">
      ${sectionHeader({ id: 'h-boden', badge: 'A', title: 'Bodenbeläge', meta: 'Wohn- & Schlafräume' })}
      <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="h-boden">
        ${Object.values(FLOORINGS).map((flooring) => flooringCard(flooring, config, derived, actions))}
      </div>
    </section>

    <section class="panel-section flex flex-col gap-2 border-t border-surface-container pt-4" id="sec-bad" aria-labelledby="h-bad">
      ${sectionHeader({ id: 'h-bad', badge: 'B', title: 'Bad & Sanitär', meta: 'Markenarmaturen' })}
      <div class="flex flex-col gap-2" role="radiogroup" aria-labelledby="h-bad">
        ${Object.values(BATHS).map((bath) => bathCard(bath, config, derived, actions))}
      </div>
      ${toggleRow({
        id: 'opt-secondbath',
        icon: 'wc',
        title: INTERIOR_EXTRAS.secondBath.name,
        description: config.floors === 2 ? 'Duschbad im Erdgeschoss statt Gäste-WC' : INTERIOR_EXTRAS.secondBath.description,
        price: prices.secondBath,
        checked: config.secondBath,
        disabled: !secondBathAllowed,
        note: secondBathAllowed ? null : `Ab ${INTERIOR_EXTRAS.secondBath.minArea} m² Wohnfläche möglich`,
        onToggle: (secondBath) => actions.setOptions({ secondBath }),
      })}
    </section>

    <section class="panel-section flex flex-col gap-2 border-t border-surface-container pt-4" id="sec-ausbau" aria-labelledby="h-ausbau">
      ${sectionHeader({ id: 'h-ausbau', badge: 'C', title: 'Innenausbau' })}
      ${toggleRow({
        id: 'opt-doors',
        icon: 'door_front',
        title: INTERIOR_EXTRAS.tallDoors.name,
        description: `${INTERIOR_EXTRAS.tallDoors.description} · ${doorCount(config)} Türen à ${formatEuro(INTERIOR_EXTRAS.tallDoors.pricePerDoor)}`,
        price: prices.tallDoors,
        checked: config.tallDoors,
        onToggle: (tallDoors) => actions.setOptions({ tallDoors }),
      })}
      ${toggleRow({
        id: 'opt-kitchen',
        icon: 'countertops',
        title: INTERIOR_EXTRAS.kitchen.name,
        description: INTERIOR_EXTRAS.kitchen.description,
        price: prices.kitchen,
        checked: config.kitchen,
        onToggle: (kitchen) => actions.setOptions({ kitchen }),
      })}
    </section>

    <section class="panel-section flex flex-col gap-2 border-t border-surface-container pt-4" id="sec-komfort" aria-labelledby="h-komfort">
      ${sectionHeader({
        id: 'h-komfort',
        badge: 'D',
        title: 'Haustechnik & Komfort',
        meta: derived.standard.label,
        metaTone: derived.standard.plus ? 'tertiary' : 'muted',
      })}
      ${standardChecklist(derived)}
      ${toggleRow({
        id: 'opt-ventilation',
        icon: 'mode_fan',
        title: COMFORT_EXTRAS.ventilation.name,
        description: COMFORT_EXTRAS.ventilation.description,
        price: prices.ventilation,
        checked: config.ventilation,
        onToggle: (ventilation) => actions.setOptions({ ventilation }),
      })}
      ${toggleRow({
        id: 'opt-smarthome',
        icon: 'home_iot_device',
        title: COMFORT_EXTRAS.smartHome.name,
        description: COMFORT_EXTRAS.smartHome.description,
        price: prices.smartHome,
        checked: config.smartHome,
        onToggle: (smartHome) => actions.setOptions({ smartHome }),
      })}
      ${toggleRow({
        id: 'opt-stove',
        icon: 'fireplace',
        title: COMFORT_EXTRAS.stove.name,
        description: COMFORT_EXTRAS.stove.description,
        price: prices.stove,
        checked: config.stove,
        onToggle: (stove) => actions.setOptions({ stove }),
      })}
      ${INTERIOR_INCLUDED.map((item) => includedRow({ icon: item.icon, title: item.name }))}
    </section>
  `;
}
