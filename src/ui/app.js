import { html } from 'lit-html';
import { contextDeck } from './deck.js';
import { citoDialog, shareDialog, toastRegion } from './dialogs.js';
import { header } from './header.js';
import { configPanel } from './panel.js';
import { summaryBar } from './summary-bar.js';
import { viewport } from './viewport.js';

/** Wurzel-Template der Anwendung. */
export function appTemplate(state, derived, actions) {
  return html`
    <a
      href="#panel-title"
      class="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      @click=${(event) => {
        event.preventDefault();
        document.getElementById('panel-title')?.focus();
      }}
      >Zu den Konfigurationsoptionen springen</a
    >
    <div class="app-shell" data-step=${state.step} data-embed=${state.embed}>
      ${header(state, derived, actions)}
      <main class="app-main" id="main">
        <section class="stage" aria-label="Visualisierung und Kennzahlen">
          ${viewport(state, derived, actions)} ${contextDeck(state, derived, actions)}
        </section>
        ${configPanel(state, derived, actions)}
      </main>
      ${summaryBar(state, derived, actions)}
    </div>
    ${toastRegion(state, actions)} ${citoDialog(state, derived, actions)} ${shareDialog(state, derived, actions)}
  `;
}
