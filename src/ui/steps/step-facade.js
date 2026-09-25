import { html, nothing } from 'lit-html';
import {
  BRICK_TONES,
  ENTRANCE_EXTRAS,
  FACADES,
  FRAMES,
  PLASTER_COLORS,
  WINDOW_EXTRAS,
  WOOD_TONES,
} from '../../data/catalog.js';
import { deltaBadge, pill, radioCard, sectionHeader, swatchGroup, toggleRow } from '../components.js';
import { icon } from '../icons.js';

/** Schritt 2 – Architektur & Fassade */

function facadeDetails(config, actions) {
  if (config.facade === 'holz') {
    return swatchGroup({
      name: 'woodTone',
      label: 'Holzton',
      options: Object.values(WOOD_TONES),
      selected: config.woodTone,
      onSelect: (woodTone) => actions.setOptions({ woodTone }),
    });
  }
  const plaster = swatchGroup({
    name: 'plasterColor',
    label: config.facade === 'klinker' ? 'Putz OG' : 'Farbton',
    options: Object.values(PLASTER_COLORS),
    selected: config.plasterColor,
    onSelect: (plasterColor) => actions.setOptions({ plasterColor }),
  });
  if (config.facade !== 'klinker') return plaster;
  return html`<div class="flex flex-col gap-2.5">
    ${swatchGroup({
      name: 'brickTone',
      label: 'Klinker',
      options: Object.values(BRICK_TONES),
      selected: config.brickTone,
      onSelect: (brickTone) => actions.setOptions({ brickTone }),
    })}
    ${config.floors === 2 ? plaster : nothing}
  </div>`;
}

function facadeCard(facade, config, derived, actions) {
  const selected = config.facade === facade.id;
  const description =
    facade.id === 'klinker' && config.floors === 1 ? 'Komplette Fassade in gebranntem Ziegel' : facade.description;
  const body = html`<span class="flex items-center gap-3 p-3.5">
    <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-container-highest ${selected ? 'text-primary' : 'text-on-surface'}"
      >${icon(facade.icon, { size: 22 })}</span
    >
    <span class="min-w-0 flex-1">
      <span class="flex flex-wrap items-center gap-1.5">
        <span class="text-label-strong text-on-surface">${facade.name}</span>
        ${facade.badge ? pill(facade.badge) : nothing}
      </span>
      <span class="block text-body-sm text-on-surface-variant">${description}</span>
    </span>
    ${deltaBadge(derived.prices.facade[facade.id], { size: 'md' })}
  </span>`;
  const extra = selected ? html`<div class="border-t border-line/70 px-3.5 py-3">${facadeDetails(config, actions)}</div>` : nothing;
  return radioCard({
    name: 'facade',
    value: facade.id,
    selected,
    onSelect: (id) => actions.setOptions({ facade: id }),
    body,
    extra,
  });
}

function frameTile(frame, config, derived, actions) {
  const selected = config.frame === frame.id;
  const dark = frame.id !== 'weiss';
  const body = html`<span class="flex flex-col gap-0.5 p-2.5">
    <span
      class="mb-1.5 grid h-12 place-items-center rounded-lg text-label-tech shadow-sm ${dark ? 'text-white' : 'text-on-surface'}"
      style="background:${frame.hex}; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .08)"
      >${frame.code}</span
    >
    <span class="text-label-strong text-on-surface">${frame.name}</span>
    <span class="text-body-sm text-on-surface-variant">${frame.color}</span>
    <span class="mt-1">${deltaBadge(derived.prices.frame[frame.id], { emphasis: selected })}</span>
  </span>`;
  return radioCard({ name: 'frame', value: frame.id, selected, onSelect: (id) => actions.setOptions({ frame: id }), body });
}

export function stepFacade(state, derived, actions) {
  const { config } = state;
  const prices = derived.prices;
  return html`
    <section class="panel-section flex flex-col gap-3" id="sec-fassade" aria-labelledby="h-fassade" data-highlight=${state.highlight === 'sec-fassade'}>
      ${sectionHeader({ id: 'h-fassade', badge: 1, title: 'Fassaden-Typ & Hülle', meta: 'Basis: Edelputz' })}
      <div class="flex flex-col gap-2" role="radiogroup" aria-labelledby="h-fassade">
        ${Object.values(FACADES).map((facade) => facadeCard(facade, config, derived, actions))}
      </div>
    </section>

    <section class="panel-section flex flex-col gap-3" id="sec-fenster" aria-labelledby="h-fenster" data-highlight=${state.highlight === 'sec-fenster'}>
      ${sectionHeader({ id: 'h-fenster', badge: 2, title: 'Fensterrahmen & Glas', meta: 'Uw = 0,72 W/m²K', metaTone: 'tertiary' })}
      <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-labelledby="h-fenster">
        ${Object.values(FRAMES).map((frame) => frameTile(frame, config, derived, actions))}
      </div>
      ${toggleRow({
        id: 'opt-raffstore',
        icon: 'blinds',
        title: WINDOW_EXTRAS.raffstore.name,
        description: WINDOW_EXTRAS.raffstore.description,
        price: prices.raffstore,
        checked: config.raffstore,
        onToggle: (raffstore) => actions.setOptions({ raffstore }),
      })}
    </section>

    <section class="panel-section flex flex-col gap-3" id="sec-haustuer" aria-labelledby="h-haustuer" data-highlight=${state.highlight === 'sec-haustuer'}>
      ${sectionHeader({ id: 'h-haustuer', badge: 3, title: 'Haustür & Eingang', meta: 'RC3 Sicherheitsstandard' })}
      ${toggleRow({
        id: 'opt-smartlock',
        icon: 'fingerprint',
        title: ENTRANCE_EXTRAS.smartLock.name,
        description: ENTRANCE_EXTRAS.smartLock.description,
        price: prices.smartLock,
        checked: config.smartLock,
        onToggle: (smartLock) => actions.setOptions({ smartLock }),
      })}
      ${toggleRow({
        id: 'opt-canopy',
        icon: 'roofing',
        title: ENTRANCE_EXTRAS.canopy.name,
        description: ENTRANCE_EXTRAS.canopy.description,
        price: prices.canopy,
        checked: config.canopy,
        onToggle: (canopy) => actions.setOptions({ canopy }),
      })}
    </section>
  `;
}
