import { html, nothing } from 'lit-html';
import { formatDelta } from '../core/format.js';
import { icon } from './icons.js';

/** Wiederverwendbare Bausteine des Konfigurators (lit-html-Templates). */

const TONE_TEXT = {
  muted: 'text-on-surface-variant',
  primary: 'text-primary',
  tertiary: 'text-tertiary',
};

/** Preisdifferenz: „Inklusive“ in Grün, Aufpreise neutral oder betont. */
export function deltaBadge(amount, { includedLabel = 'Inklusive', emphasis = false, size = 'sm' } = {}) {
  const tone = amount === 0 ? 'text-tertiary' : emphasis ? 'text-primary' : 'text-on-surface';
  const type = size === 'md' ? 'text-price-md' : 'text-label-strong';
  return html`<span class="delta-badge ${type} ${tone}">${formatDelta(amount, { includedLabel })}</span>`;
}

export function pill(text, { tone = 'primary', className = '' } = {}) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    tertiary: 'bg-tertiary-fixed/60 text-on-tertiary-fixed',
    neutral: 'bg-surface-container-high text-on-surface-variant',
    dark: 'bg-inverse-surface text-inverse-on-surface',
  };
  return html`<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-label-tech ${tones[tone]} ${className}"
    >${text}</span
  >`;
}

/** Nummerierter Abschnittskopf, z. B. „① Fassaden-Typ & Hülle … Basis: Edelputz“. */
export function sectionHeader({ id, badge, title, meta = null, metaTone = 'muted' }) {
  return html`<div class="flex items-center justify-between gap-3">
    <h3 id=${id} class="flex items-center gap-2 text-headline-sm text-on-surface">
      <span class="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-label-tech text-on-primary"
        >${badge}</span
      >
      ${title}
    </h3>
    ${meta ? html`<span class="text-right text-label-tech ${TONE_TEXT[metaTone]}">${meta}</span>` : nothing}
  </div>`;
}

/**
 * Optionskarte mit Radio-Button. Der Inhalt steht im Label, optionale Unteroptionen
 * (z. B. Farbtöne) werden außerhalb des Labels angehängt.
 */
export function radioCard({ name, value, selected, disabled = false, onSelect, body, extra = null, className = '', title = '' }) {
  return html`<div class="option-card ${className}" data-selected=${selected} data-disabled=${disabled} title=${title}>
    <label class="block cursor-pointer">
      <input
        class="sr-only"
        type="radio"
        name=${name}
        value=${value}
        .checked=${selected}
        ?disabled=${disabled}
        @change=${() => onSelect(value)}
      />
      ${body}
    </label>
    ${extra}
  </div>`;
}

/** Zeile mit Schalter (role="switch") und Preis. */
export function toggleRow({ id, icon: iconName, title, description, price, checked, disabled = false, onToggle, note = null }) {
  return html`<label class="toggle-row flex cursor-pointer items-center gap-3 p-3" for=${id}>
    <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">${icon(iconName)}</span>
    <span class="min-w-0 flex-1">
      <span class="block text-label-strong text-on-surface">${title}</span>
      <span class="block text-body-sm text-on-surface-variant">${description}</span>
      ${note ? html`<span class="mt-0.5 block text-body-sm font-semibold text-primary">${note}</span>` : nothing}
    </span>
    ${price === null ? nothing : deltaBadge(price)}
    <span class="switch">
      <input
        id=${id}
        type="checkbox"
        role="switch"
        .checked=${checked}
        ?disabled=${disabled}
        @change=${(event) => onToggle(event.target.checked)}
      />
      <span class="switch-track"></span>
    </span>
  </label>`;
}

/** Inklusivleistung ohne Wahlmöglichkeit. */
export function includedRow({ icon: iconName, title, description = '' }) {
  return html`<div class="flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
    <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-tertiary/10 text-tertiary">${icon(iconName)}</span>
    <span class="min-w-0 flex-1">
      <span class="block text-label-strong text-on-surface">${title}</span>
      ${description ? html`<span class="block text-body-sm text-on-surface-variant">${description}</span>` : nothing}
    </span>
    <span class="flex items-center gap-1 text-label-strong text-tertiary">${icon('check_circle', { size: 18 })} Inklusive</span>
  </div>`;
}

/** Farb-Swatches als Radiogruppe. */
export function swatchGroup({ name, label, options, selected, onSelect }) {
  const current = options.find((o) => o.id === selected);
  return html`<fieldset class="flex flex-wrap items-center gap-3">
    <legend class="sr-only">${label}</legend>
    <span class="text-label-tech text-on-surface-variant" aria-hidden="true">${label}:</span>
    <span class="flex items-center gap-2">
      ${options.map(
        (o) => html`<label class="swatch" style="background:${o.hex}" title=${o.name}>
          <input
            class="sr-only"
            type="radio"
            name=${name}
            .checked=${o.id === selected}
            @change=${() => onSelect(o.id)}
          />
          <span class="sr-only">${o.name}</span>
        </label>`,
      )}
    </span>
    <span class="ml-auto text-label-tech text-on-surface">${current?.name ?? ''}</span>
  </fieldset>`;
}

/** Cito-Beratungskarte mit optionaler Ein-Klick-Empfehlung. */
export function citoCard(tip, { onApply, className = '' } = {}) {
  return html`<article class="relative flex items-start gap-3.5 overflow-hidden rounded-2xl bg-surface-container-lowest p-4 shadow-lift ${className}" aria-live="polite">
    <span class="pointer-events-none absolute -right-8 -bottom-8 size-32 rounded-full bg-primary/5"></span>
    <span class="relative shrink-0">
      <img class="size-16 rounded-xl object-cover shadow-sm" src=${tip.avatar} alt="" width="64" height="64" loading="lazy" />
      <span class="absolute -right-1 -bottom-1 rounded-full bg-tertiary px-1.5 py-0.5 text-[10px] font-extrabold text-on-tertiary">CITO</span>
    </span>
    <div class="relative flex min-w-0 flex-1 flex-col gap-1">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span class="text-label-strong text-primary">${tip.title}</span>
        ${tip.badge ? pill(tip.badge, { tone: 'tertiary' }) : nothing}
      </div>
      <p class="text-body-md text-on-surface-variant">„${tip.text}“</p>
      ${tip.action && onApply
        ? html`<button
            type="button"
            class="btn btn-secondary mt-1 self-start !px-3.5 !py-1.5"
            @click=${() => onApply(tip.action.patch)}
          >
            ${icon('star_shine', { size: 16, className: 'text-primary' })} ${tip.action.label}
          </button>`
        : nothing}
    </div>
  </article>`;
}

/** Kennzahlkarte (Bauzeit, Energie, …). */
export function kpiCard({ icon: iconName, label, value, note, tone = 'tertiary' }) {
  const toneClass = { tertiary: 'text-tertiary', primary: 'text-primary', secondary: 'text-secondary' }[tone];
  return html`<div class="flex min-w-0 flex-col gap-0.5 rounded-xl bg-surface-container-low p-3">
    <span class="flex items-center gap-1 text-label-tech text-on-surface-variant">${icon(iconName, { size: 14, className: toneClass })} ${label}</span>
    <span class="truncate text-headline-sm text-on-surface tabular-nums">${value}</span>
    <span class="truncate text-body-sm ${tone === 'tertiary' ? 'font-semibold text-tertiary' : 'text-on-surface-variant'}">${note}</span>
  </div>`;
}

/** „In 6 Monaten zuhause“-Garantiesiegel (DESIGN.md: Anthrazit mit Grün- und Terracotta-Akzent). */
export function guaranteeBadge({ compact = false } = {}) {
  return html`<div class="flex items-center gap-2.5 rounded-xl bg-slate px-3 py-2 text-inverse-on-surface shadow-float">
    <span class="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-white">${icon('key', { size: 18 })}</span>
    <span class="flex flex-col">
      <span class="text-label-tech font-bold text-tertiary-fixed">In 6 Monaten bezugsfertig</span>
      ${compact ? nothing : html`<span class="text-body-sm text-surface-container-high">Präzisionsfertigung im Werk</span>`}
    </span>
  </div>`;
}
