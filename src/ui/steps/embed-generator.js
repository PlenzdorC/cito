import { html, nothing } from 'lit-html';
import { encodeConfig } from '../../core/serialize.js';
import { buildEmbedSnippet, buildEmbedUrl, currentBaseUrl, validateEmbedOptions } from '../../services/embed.js';
import { icon } from '../icons.js';

/** Embed-Code-Generator „Für Partner / Webseiten“. */

const FALLBACK_BASE_URL = 'https://citodomus.de/konfigurator/';
const embedBase = () => import.meta.env?.VITE_EMBED_BASE_URL || currentBaseUrl() || FALLBACK_BASE_URL;

function input({ id, label, value, error, onInput, className = '' }) {
  return html`<div class="flex flex-col gap-1">
    <label for=${id} class="text-label-tech text-on-surface-variant">${label}</label>
    <input
      id=${id}
      class="field code-box !py-2 text-body-sm ${className}"
      .value=${value}
      spellcheck="false"
      aria-invalid=${error ? 'true' : 'false'}
      @input=${(event) => onInput(event.target.value.trim())}
    />
    ${error ? html`<span class="text-body-sm text-error">${error}</span>` : nothing}
  </div>`;
}

export function embedCode(state) {
  const form = state.embedForm;
  const url = buildEmbedUrl({
    baseUrl: embedBase(),
    partner: form.partner,
    accent: form.accent,
    configHash: form.includeConfig ? encodeConfig(state.config) : '',
  });
  return { url, snippet: buildEmbedSnippet({ url, width: form.width, height: form.height }) };
}

export function embedGenerator(state, actions) {
  const form = state.embedForm;
  const { errors } = validateEmbedOptions(form);
  const { url, snippet } = embedCode(state);
  const set = (patch) => actions.setEmbedForm(patch);
  return html`<div class="flex flex-col gap-3">
    <div class="flex flex-col gap-1 rounded-xl bg-surface-container-low p-3.5">
      <div class="flex items-center justify-between gap-2">
        <span class="text-label-strong text-on-surface">Embed-Code-Generator</span>
        <span class="rounded-full bg-tertiary-container px-2 py-0.5 text-label-tech text-on-tertiary">Live-Sync</span>
      </div>
      <span class="text-body-sm text-on-surface-variant">
        Binde den 3D-Konfigurator mit deiner Partner-ID auf deiner Immobilien- oder Makler-Website ein. Anfragen werden dir zugeordnet.
      </span>
    </div>
    <div class="grid grid-cols-2 gap-3">
      ${input({ id: 'embed-partner', label: 'Partner-ID', value: form.partner, error: errors.partner, onInput: (partner) => set({ partner }) })}
      <div class="flex flex-col gap-1">
        <label for="embed-color" class="text-label-tech text-on-surface-variant">Akzentfarbe</label>
        <span class="flex items-center gap-2">
          <input
            id="embed-color"
            type="color"
            class="size-9 cursor-pointer rounded-lg border border-line-strong bg-transparent p-0.5"
            .value=${/^#[0-9a-f]{6}$/i.test(form.accent) ? form.accent.toLowerCase() : '#9d3e1a'}
            @input=${(event) => set({ accent: event.target.value.toUpperCase() })}
          />
          <span class="code-box text-body-sm text-on-surface">${form.accent}</span>
        </span>
      </div>
      ${input({ id: 'embed-width', label: 'Breite', value: form.width, error: errors.width, onInput: (width) => set({ width }) })}
      ${input({ id: 'embed-height', label: 'Mindesthöhe', value: form.height, error: errors.height, onInput: (height) => set({ height }) })}
    </div>
    <label class="flex items-center gap-2 text-body-sm text-on-surface">
      <input type="checkbox" class="size-4 accent-[var(--color-primary)]" .checked=${form.includeConfig} @change=${(event) => set({ includeConfig: event.target.checked })} />
      Aktuelle Konfiguration als Startpunkt übernehmen
    </label>
    <div class="flex flex-col gap-1">
      <div class="flex items-center justify-between">
        <label for="embed-code" class="text-label-tech text-on-surface-variant">iFrame-HTML-Code</label>
        <button type="button" class="flex items-center gap-1 text-label-tech text-primary hover:underline" @click=${() => actions.copyText(snippet, 'Embed-Code kopiert')}>
          ${icon('content_copy', { size: 14 })} Code kopieren
        </button>
      </div>
      <textarea id="embed-code" class="code-box w-full resize-none rounded-lg bg-inverse-surface p-3 text-[11px] leading-relaxed text-inverse-on-surface" rows="5" readonly .value=${snippet}></textarea>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <a class="btn btn-quiet !py-2" href=${url} target="_blank" rel="noopener">${icon('open_in_new', { size: 18 })} Vorschau öffnen</a>
    </div>
    <div class="flex items-center gap-2.5 rounded-lg bg-surface-container-low p-3">
      ${icon('handshake', { size: 20, className: 'text-primary' })}
      <span class="text-body-sm text-on-surface">Provision: Bis zu <strong>2.800 €</strong> pro vermitteltem Bauabschluss über dein Widget.</span>
    </div>
  </div>`;
}
