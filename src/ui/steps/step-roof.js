import { html, nothing } from 'lit-html';
import { ENERGY_EXTRAS, ENERGY_INCLUDED, FINANCING, PV_PACKAGES, ROOFS } from '../../data/catalog.js';
import { formatEuro, formatKwh, formatPercent } from '../../core/format.js';
import { deltaBadge, includedRow, pill, radioCard, sectionHeader, toggleRow } from '../components.js';
import { icon } from '../icons.js';
import { roofArt } from '../roof-art.js';

/** Schritt 3 – Dach & Solar */

function roofCard(roof, config, derived, actions) {
  const selected = config.roof === roof.id;
  const body = html`<span class="flex h-full flex-col gap-2 p-2.5">
    <span class="relative block aspect-[4/3] overflow-hidden rounded-lg bg-gradient-to-b from-[#dde8ef] to-[#f4f1ea]">
      ${roofArt(roof.id)}
      ${roof.badge
        ? html`<span class="absolute top-1 right-1 rounded bg-tertiary px-1.5 py-0.5 text-[10px] font-bold text-on-tertiary">${roof.badge}</span>`
        : nothing}
    </span>
    <span class="flex flex-col">
      <span class="text-label-strong text-on-surface">${roof.name}</span>
      <span class="text-[11px] leading-tight text-on-surface-variant">${roof.description}</span>
    </span>
    <span class="mt-auto flex flex-wrap items-center justify-between gap-x-2 border-t border-surface-container-high pt-1.5">
      <span class="text-label-tech font-bold ${roof.yieldFactor === 1 ? 'text-primary' : 'text-tertiary'}"
        >${formatPercent(roof.yieldFactor)} Ertrag</span
      >
      ${deltaBadge(derived.prices.roof[roof.id])}
    </span>
  </span>`;
  return radioCard({ name: 'roof', value: roof.id, selected, onSelect: (id) => actions.setOptions({ roof: id }), body, className: 'h-full' });
}

function pvCard(option, config, actions) {
  const selected = config.pv === option.id;
  const body = html`<span class="flex h-full flex-col gap-1 p-3">
    <span class="flex items-center justify-between gap-1">
      <span class="text-label-strong text-on-surface">${option.name}</span>
      <span class=${selected ? 'text-primary' : 'text-secondary'}>${icon(PV_PACKAGES[option.id].icon, { size: 16 })}</span>
    </span>
    <span class="text-label-tech text-on-surface-variant">${option.modules} Indach-Module</span>
    <span class="mt-auto pt-1">
      ${option.available
        ? deltaBadge(option.price, { includedLabel: 'Im Grundpreis', emphasis: selected })
        : html`<span class="text-body-sm font-semibold text-error">Dach zu klein</span>`}
    </span>
  </span>`;
  return radioCard({
    name: 'pv',
    value: option.id,
    selected,
    disabled: !option.available,
    title: option.available ? '' : `Auf dieses Dach passen maximal ${option.capacity} Module`,
    onSelect: (id) => actions.setOptions({ pv: id }),
    body,
    className: 'h-full',
  });
}

export function stepRoof(state, derived, actions) {
  const { config } = state;
  const pv = PV_PACKAGES[config.pv];
  const capacity = derived.pvOptions[0].capacity;
  return html`
    <section class="panel-section flex flex-col gap-3" id="sec-dach" aria-labelledby="h-dach" data-highlight=${state.highlight === 'sec-dach'}>
      ${sectionHeader({ id: 'h-dach', badge: 'A', title: 'Dachform wählen', meta: 'Einfluss auf PV-Ertrag', metaTone: 'primary' })}
      <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="h-dach">
        ${Object.values(ROOFS).map((roof) => roofCard(roof, config, derived, actions))}
      </div>
    </section>

    <section class="panel-section flex flex-col gap-3 border-t border-surface-container pt-4" id="sec-pv" aria-labelledby="h-pv" data-highlight=${state.highlight === 'sec-pv'}>
      ${sectionHeader({ id: 'h-pv', badge: 'B', title: 'Full-Black Indach-PV', meta: `${pv.kwp} kWp (${pv.modules} Module)`, metaTone: 'primary' })}
      <p class="text-body-sm text-on-surface-variant">
        Rahmenlose, reflexionsarme Module – vollintegriert in die Dachebene für ein homogenes, architektonisches
        Erscheinungsbild ohne sichtbare Klemmen.
      </p>
      <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="h-pv">
        ${derived.pvOptions.map((option) => pvCard(option, config, actions))}
      </div>
      <p class="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
        ${icon('grid_view', { size: 16, className: 'text-secondary' })}
        Dachfläche für max. <strong class="text-on-surface tabular-nums">${capacity} Module</strong>
        ${config.roof === 'flach' ? html`· Ost/West-Aufständerung auf dem Gründach` : nothing}
      </p>
    </section>

    <section class="panel-section flex flex-col gap-2 border-t border-surface-container pt-4" id="sec-technik" aria-labelledby="h-technik">
      ${sectionHeader({ id: 'h-technik', badge: 'C', title: 'Speicher & Haustechnik', meta: '100 % Sektorkopplung', metaTone: 'tertiary' })}
      ${ENERGY_INCLUDED.map((item) => includedRow({ icon: item.icon, title: item.name, description: item.description }))}
      ${toggleRow({
        id: 'opt-battery',
        icon: 'battery_full',
        title: ENERGY_EXTRAS.batteryPlus.name,
        description: ENERGY_EXTRAS.batteryPlus.description,
        price: derived.prices.batteryPlus,
        checked: config.batteryPlus,
        onToggle: (batteryPlus) => actions.setOptions({ batteryPlus }),
      })}
      ${toggleRow({
        id: 'opt-wallbox',
        icon: 'ev_station',
        title: ENERGY_EXTRAS.wallbox.name,
        description: ENERGY_EXTRAS.wallbox.description,
        price: derived.prices.wallbox,
        checked: config.wallbox,
        onToggle: (wallbox) => actions.setOptions({ wallbox }),
        note: config.wallbox ? `E-Auto mit ${formatKwh(derived.energy.usage.mobility)} Jahresbedarf eingeplant` : null,
      })}
    </section>

    <aside class="flex items-start gap-2.5 rounded-xl bg-surface-container-high p-3.5">
      ${icon('account_balance', { size: 20, className: 'mt-0.5 text-tertiary' })}
      <div class="flex flex-col gap-0.5">
        <span class="flex flex-wrap items-center gap-1.5 text-label-strong text-on-surface"
          >Staatliche KfW-Förderung nutzbar ${pill('QNG', { tone: 'tertiary' })}</span
        >
        <p class="text-body-sm text-on-surface-variant">
          Bis zu <strong class="text-on-surface">${formatEuro(FINANCING.kfwMaxLoan)} zinsverbilligter Kredit</strong> für
          klimafreundliche Wohngebäude mit QNG-Siegel möglich – die Förderfähigkeit prüfen wir in der Energieberatung.
        </p>
      </div>
    </aside>
  `;
}
