import { html, nothing } from 'lit-html';
import { FRAMES, MODELS, PV_PACKAGES, ROOFS } from '../data/catalog.js';
import { compassLabel, pvPowerAt, sunPosition, SUNRISE } from '../core/energy.js';
import { formatClock, formatKwh, formatMeters, formatNumber } from '../core/format.js';
import { lineItems } from '../core/pricing.js';
import { SUN_MAX, SUN_MIN } from '../core/state.js';
import { guaranteeBadge } from './components.js';
import { floorplanLayer } from './floorplan-view.js';
import { icon } from './icons.js';

/** 3D-Viewport mit schwebenden Bedienelementen (DESIGN.md: „3D Viewport Controls“). */

const VIEW_OPTIONS = [
  { id: 'exterior', label: '3D Außen', short: 'Außen', icon: 'view_in_ar' },
  { id: 'interior', label: 'Innenraum', short: 'Innen', icon: 'chair' },
  { id: 'floorplan', label: 'Grundriss 2D', short: 'Plan', icon: 'space_dashboard' },
  { id: 'section', label: 'Schnitt', short: 'Schnitt', icon: 'vertical_split' },
];

function hotspotDefs(state) {
  const { config } = state;
  const frame = FRAMES[config.frame];
  const facade = lineItems(config).find((item) => item.id === 'facade').label.replace('Fassade: ', '');
  if (state.step === 2) {
    return [
      { anchor: 'facade', icon: 'texture', label: 'Fassadenbekleidung', value: facade, section: 'sec-fassade' },
      { anchor: 'window', icon: 'window', label: 'Fenster & Rahmen', value: `${frame.name} ${frame.color}${config.raffstore ? ' · Raffstore' : ''}`, section: 'sec-fenster' },
      { anchor: 'door', icon: 'key', label: 'Hauseingang', value: config.smartLock ? 'SmartScan Fingerscan & Code' : 'Sicherheits-Haustür RC3', section: 'sec-haustuer' },
    ];
  }
  if (state.step === 3) {
    const roof = ROOFS[config.roof];
    const pv = PV_PACKAGES[config.pv];
    return [
      { anchor: 'roof', icon: 'roofing', label: 'Dachform', value: `${roof.name} · ${roof.description}`, section: 'sec-dach' },
      { anchor: 'pv', icon: 'solar_power', label: 'Indach-PV', value: `${pv.kwp} kWp · ${pv.modules} Module`, section: 'sec-pv' },
    ];
  }
  return [];
}

function hotspots(state, actions) {
  if (state.view !== 'exterior' || state.viewerStatus !== 'ready') return nothing;
  return hotspotDefs(state).map(
    (h) => html`<div class="hotspot" data-anchor=${h.anchor} data-hidden="true" style="transform:translate(-9999px,-9999px)">
      <button
        type="button"
        class="relative block size-9 -translate-x-1/2 -translate-y-1/2 rounded-full"
        aria-label="${h.label}: ${h.value} – Optionen anzeigen"
        @click=${() => actions.focusSection(h.section)}
      >
        <span class="hotspot-pulse absolute inset-0 rounded-full bg-accent/60"></span>
        <span class="relative grid size-9 place-items-center rounded-full bg-white text-primary shadow-float transition-colors hover:bg-primary hover:text-on-primary"
          >${icon(h.icon, { size: 18 })}</span
        >
      </button>
      <div class="hotspot-tip absolute bottom-full left-0 mb-7 flex flex-col rounded-lg bg-inverse-surface px-3 py-1.5 text-center whitespace-nowrap text-inverse-on-surface shadow-float">
        <span class="text-label-tech text-primary-fixed">${h.label}</span>
        <span class="text-body-sm font-semibold">${h.value}</span>
      </div>
    </div>`,
  );
}

function topBadges(state, derived) {
  const model = MODELS[state.config.model];
  const labels = { interior: 'Innenraum 360°', section: 'Schnitt A–A', floorplan: null, exterior: null };
  return html`<div class="pointer-events-none absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 pr-14 lg:top-4 lg:left-4">
    <span class="glass-dark flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-tech shadow-sm">
      ${icon('view_in_ar', { size: 16, className: 'text-tertiary-fixed' })} ${model.shortName} · ${state.config.area} m²
    </span>
    <span class="flex items-center gap-1 rounded-full bg-tertiary-container/90 px-3 py-1.5 text-label-tech text-on-tertiary shadow-sm backdrop-blur-md">
      ${icon('bolt', { size: 16 })} ${derived.standard.plus ? 'Effizienzhaus 40 Plus' : 'KfW 40 QNG Standard'}
    </span>
    ${labels[state.view]
      ? html`<span class="glass flex items-center gap-1 rounded-full px-3 py-1.5 text-label-tech text-on-surface">${labels[state.view]}</span>`
      : nothing}
  </div>`;
}

function controls(state, actions) {
  const is3d = state.view !== 'floorplan' && state.viewerStatus === 'ready';
  return html`<div class="absolute top-3 right-3 z-10 flex flex-col gap-1.5 lg:top-4 lg:right-4">
    ${is3d
      ? html`<button type="button" class="glass grid size-10 place-items-center rounded-full text-on-surface" title="Tag / Nacht" aria-label="Beleuchtung: ${state.lighting === 'day' ? 'Tag' : 'Nacht'} – umschalten" @click=${actions.toggleLighting}>
            ${state.lighting === 'day' ? icon('light_mode', { size: 20 }) : icon('dark_mode', { size: 20 })}
          </button>
          <button type="button" class="glass grid size-10 place-items-center rounded-full text-on-surface" title="Blickwinkel zurücksetzen" aria-label="Blickwinkel zurücksetzen" @click=${actions.resetCamera}>
            ${icon('restart_alt', { size: 20 })}
          </button>`
      : nothing}
    <button type="button" class="glass grid size-10 place-items-center rounded-full text-on-surface" title="Vollbild" aria-label=${state.fullscreen ? 'Vollbild beenden' : 'Vollbild'} @click=${actions.toggleFullscreen}>
      ${state.fullscreen ? icon('fullscreen_exit', { size: 20 }) : icon('fullscreen', { size: 20 })}
    </button>
  </div>`;
}

function viewDock(state, actions) {
  const disabled3d = state.viewerStatus !== 'ready';
  return html`<div class="glass pointer-events-auto flex items-center gap-1 rounded-full p-1" role="radiogroup" aria-label="Ansicht">
    ${VIEW_OPTIONS.map((v) => {
      const active = state.view === v.id;
      const disabled = v.id !== 'floorplan' && disabled3d;
      return html`<button
        type="button"
        role="radio"
        aria-checked=${active}
        ?disabled=${disabled}
        class="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-label-tech transition-colors disabled:opacity-40 ${active
          ? 'bg-primary text-on-primary'
          : 'text-on-surface-variant hover:text-on-surface'}"
        @click=${() => actions.setView(v.id)}
      >
        ${icon(v.icon, { size: 16 })}<span class="hidden sm:inline">${v.label}</span><span class="sm:hidden">${v.short}</span>
      </button>`;
    })}
  </div>`;
}

function sunPanel(state, derived, actions) {
  const sun = sunPosition(state.sunTime);
  const power = pvPowerAt(state.sunTime, state.config);
  const direction = compassLabel(sun.azimuth);
  const peak = Math.abs(state.sunTime - 13.25) < 0.6;
  const fill = ((state.sunTime - SUN_MIN) / (SUN_MAX - SUN_MIN)) * 100;
  return html`<div class="glass pointer-events-auto flex w-full flex-col gap-2 rounded-xl p-2.5 md:flex-row md:items-center md:gap-4">
    <div class="flex min-w-0 flex-1 items-center gap-2">
      ${icon('wb_twilight', { size: 20, className: 'shrink-0 text-primary' })}
      <div class="flex min-w-0 flex-1 flex-col">
        <div class="flex items-center justify-between text-label-tech text-on-surface-variant">
          <span>06:00 Ost</span>
          <span class="font-bold text-primary tabular-nums">${formatClock(state.sunTime)} ${direction}${peak ? ' (Peak)' : ''}</span>
          <span>21:00 West</span>
        </div>
        <input
          class="range"
          type="range"
          min=${SUN_MIN}
          max=${SUN_MAX}
          step="0.25"
          style="--fill:${fill}%"
          .value=${String(state.sunTime)}
          aria-label="Sonnenstand (Uhrzeit am 21. Juni)"
          aria-valuetext="${formatClock(state.sunTime)} Uhr, Sonne im ${direction}"
          @input=${(event) => actions.setSunTime(Number(event.target.value))}
        />
      </div>
      ${icon('nightlight', { size: 20, className: 'shrink-0 text-secondary' })}
    </div>
    <div class="flex shrink-0 items-center justify-between gap-3 border-t border-surface-container pt-2 md:border-t-0 md:border-l md:pt-0 md:pl-4">
      <div class="flex flex-col">
        <span class="text-label-tech text-on-surface-variant uppercase">Tagesertrag Sim.</span>
        <span class="text-price-md text-tertiary tabular-nums">${formatKwh(derived.energy.summerDayYield, 1)}</span>
      </div>
      <div class="flex flex-col text-right">
        <span class="text-label-tech text-on-surface-variant uppercase">Jetzt</span>
        <span class="text-label-strong text-on-surface tabular-nums">${state.sunTime <= SUNRISE ? '0,0' : formatNumber(power, 1)} kW</span>
      </div>
    </div>
  </div>`;
}

function dimensionPill(derived) {
  const { geo } = derived;
  return html`<span class="glass-dark flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-tech tabular-nums">
    ${icon('straighten', { size: 16, className: 'text-tertiary-fixed' })}
    ${formatMeters(geo.outer.width)} × ${formatMeters(geo.outer.depth)} · H ${formatMeters(geo.totalHeight)}
  </span>`;
}

function statusLayer(state) {
  if (state.viewerStatus === 'loading') {
    return html`<div class="absolute inset-0 grid place-items-center" aria-live="polite">
      <div class="skeleton-pulse flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-label-strong text-on-surface-variant shadow-lift">
        ${icon('progress_activity', { size: 18, className: 'animate-spin text-primary' })} 3D-Modell wird geladen …
      </div>
    </div>`;
  }
  if ((state.viewerStatus === 'unsupported' || state.viewerStatus === 'error') && state.view === 'floorplan') {
    return html`<div class="absolute right-3 bottom-16 left-3 z-10 rounded-lg bg-error-container/95 p-2.5 text-body-sm text-on-error-container shadow-lift lg:right-auto" role="status">
      ${state.viewerStatus === 'unsupported'
        ? 'Dein Browser unterstützt keine 3D-Grafik (WebGL). Wir zeigen dir stattdessen den Grundriss.'
        : 'Die 3D-Ansicht konnte nicht gestartet werden. Wir zeigen dir stattdessen den Grundriss.'}
    </div>`;
  }
  return nothing;
}

export function viewport(state, derived, actions) {
  const showCanvas = state.view !== 'floorplan';
  const exterior = state.view === 'exterior' && state.viewerStatus === 'ready';
  return html`<div class="viewport-wrap">
    <div
      class="viewport group"
      id="viewport"
      data-lighting=${state.lighting}
      data-view=${state.view}
      role="region"
      aria-roledescription="3D-Ansicht"
      aria-label="Visualisierung deines Hauses"
    >
      <div class="viewport-canvas" id="viewport-canvas" ?hidden=${!showCanvas}></div>
      ${showCanvas ? html`<div class="viewport-vignette"></div>` : floorplanLayer(state, derived, actions)}
      <div class="absolute inset-0 overflow-hidden" id="hotspot-layer">${hotspots(state, actions)}</div>
      ${topBadges(state, derived)} ${controls(state, actions)} ${statusLayer(state)}
      <div class="pointer-events-none absolute right-3 bottom-3 left-3 z-10 flex flex-col gap-2 lg:right-4 lg:bottom-4 lg:left-4">
        ${state.step === 3 && exterior ? sunPanel(state, derived, actions) : nothing}
        <div class="flex flex-wrap items-end justify-between gap-2">
          ${viewDock(state, actions)}
          ${state.step === 5 && exterior
            ? html`<div class="pointer-events-auto hidden sm:block">${guaranteeBadge()}</div>`
            : state.view === 'exterior' || state.view === 'section'
              ? html`<div class="pointer-events-auto hidden sm:block">${dimensionPill(derived)}</div>`
              : nothing}
        </div>
      </div>
      ${showCanvas && state.viewerStatus === 'ready' && !state.interacted
        ? html`<div class="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span class="glass-dark flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-tech">
              ${icon('360', { size: 18 })} ${state.view === 'interior' ? 'Ziehen zum Umsehen' : '360° interaktiv drehen'}
            </span>
          </div>`
        : nothing}
    </div>
  </div>`;
}
