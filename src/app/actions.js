import { deriveView } from '../core/derive.js';
import { encodeConfig } from '../core/serialize.js';
import * as S from '../core/state.js';
import { buildLeadPayload, isLikelyBot, validateLead } from '../services/lead.js';
import { saveConfiguration } from '../services/storage.js';

/**
 * Alle Benutzeraktionen. Zustandsänderungen laufen ausschließlich über reine Funktionen aus core/state.js;
 * Seiteneffekte (Zwischenablage, Speicher, Viewer, Druck) werden über `deps` injiziert.
 */

const TOAST_MS = 4500;

export function createActions(store, deps) {
  const update = (fn) => store.setState(fn);
  const get = () => store.getState();

  function toast(tone, text, action = null) {
    let id = 0;
    update((s) => {
      const next = S.pushToast(s, { tone, text, action });
      id = next.toastSeq;
      return next;
    });
    deps.setTimeout(() => update((s) => S.dismissToast(s, id)), action ? TOAST_MS * 1.6 : TOAST_MS);
  }

  /** Übernimmt Regelhinweise (z. B. „PV-Paket angepasst“) als Toasts. */
  function applyWithNotices(transition) {
    const before = get();
    update(transition);
    const after = get();
    if (after.noticeSeq !== before.noticeSeq) after.notices.forEach((notice) => toast(notice.tone, notice.text));
  }

  function goToStep(step) {
    const before = get().step;
    update((s) => S.goToStep(s, step));
    if (get().step !== before) deps.afterRender(() => deps.onStepChanged(get().step));
  }

  const actions = {
    selectModel: (id) => applyWithNotices((s) => S.selectModel(s, id)),
    setOptions: (patch) => applyWithNotices((s) => S.setOptions(s, patch)),
    applyTip: (patch) => {
      applyWithNotices((s) => S.setOptions(s, patch));
      toast('info', 'Cito-Empfehlung übernommen.');
    },
    goToStep,
    nextStep: () => goToStep(get().step + 1),
    prevStep: () => goToStep(get().step - 1),
    setView: (view) => update((s) => S.setView(s, view)),
    setPlanLevel: (level) => update((s) => S.setPlanLevel(s, level)),
    toggleLighting: () => update(S.toggleLighting),
    setSunTime: (hour) => update((s) => S.setSunTime(s, hour)),
    resetCamera: () => deps.viewer()?.resetCamera(),
    toggleFullscreen: () => deps.toggleFullscreen(),
    setEquity: (equity) => update((s) => S.setEquity(s, equity, deriveView(s).breakdown.total)),
    setOfferTab: (tab) => update((s) => S.setOfferTab(s, tab)),
    setEmbedForm: (patch) => update((s) => S.setEmbedForm(s, patch)),
    markInteracted: () => update(S.markInteracted),
    dismissToast: (id) => update((s) => S.dismissToast(s, id)),
    runToastAction: (toastItem) => {
      toastItem.action?.run();
      update((s) => S.dismissToast(s, toastItem.id));
    },

    openCito: () => update((s) => S.setDialog(s, 'cito')),
    openShare: () => update((s) => S.setDialog(s, 'share')),
    closeDialog: () => update((s) => S.setDialog(s, null)),

    shareUrl: () => deps.shareUrl(encodeConfig(get().config, { step: get().step })),

    async copyText(text, message) {
      const ok = await deps.copyToClipboard(text);
      toast(ok ? 'info' : 'error', ok ? `${message}.` : 'Kopieren nicht möglich – bitte manuell markieren und kopieren.');
    },

    saveConfig() {
      const result = saveConfiguration(get().config, deps.storage());
      toast(result.ok ? 'info' : 'error', result.ok ? 'Konfiguration gespeichert – sie wird beim nächsten Besuch geladen.' : result.error);
    },

    resetConfig() {
      const previous = get().config;
      update((s) => S.setDialog(S.resetConfiguration(s), null));
      toast('info', 'Konfiguration zurückgesetzt.', {
        label: 'Rückgängig',
        run: () => update((s) => S.loadConfiguration(s, previous)),
      });
    },

    requestOffer() {
      const { step, offerTab } = get();
      update((s) => S.setOfferTab(S.setDialog(s, null), 'bauherr'));
      // Steht das Anfrageformular schon offen (Schritt 5, „Für Bauherren“), wird es abgesendet – die Prüfung zeigt, was noch fehlt.
      if (step === 5 && offerTab === 'bauherr' && deps.submitForm('lead-form')) return;
      goToStep(5);
      deps.afterRender(() => deps.focusElement(get().lead.status === 'success' ? 'lead-success' : 'lead-name'));
    },

    embedFromShare() {
      update((s) => S.setOfferTab(S.setDialog(s, null), 'partner'));
      goToStep(5);
      deps.afterRender(() => deps.focusElement('embed-partner'));
    },

    focusSection(id) {
      deps.scrollToSection(id);
      update((s) => S.setHighlight(s, id));
      deps.setTimeout(() => update((s) => (s.highlight === id ? S.setHighlight(s, null) : s)), 1600);
    },

    resetLead: () => update((s) => S.setLead(s, { status: 'idle', errors: {}, error: null })),

    async submitLead(formElement) {
      if (get().lead.status === 'sending') return;
      const data = new FormData(formElement);
      const form = {
        name: String(data.get('name') ?? ''),
        phone: String(data.get('phone') ?? ''),
        email: String(data.get('email') ?? ''),
        location: String(data.get('location') ?? ''),
        plot: String(data.get('plot') ?? ''),
        consultation: String(data.get('consultation') ?? ''),
        message: String(data.get('message') ?? ''),
        consent: data.get('consent') === 'on',
        website: String(data.get('website') ?? ''),
      };
      const { valid, errors } = validateLead(form);
      if (!valid) {
        update((s) => S.setLead(s, { errors, error: null }));
        deps.afterRender(() => deps.focusFirstInvalid(formElement));
        return;
      }
      const state = get();
      const derived = deriveView(state);
      if (isLikelyBot(form)) {
        // Bots erhalten eine Erfolgsmeldung, es wird aber nichts versendet.
        update((s) => S.setLead(s, { status: 'success', errors: {}, reference: derived.configId, demo: true, name: '' }));
        return;
      }
      update((s) => S.setLead(s, { status: 'sending', errors: {}, error: null }));
      try {
        const payload = buildLeadPayload({
          form,
          config: state.config,
          breakdown: derived.breakdown,
          configId: derived.configId,
          partner: state.partner,
          monthlyRate: derived.monthly,
        });
        const result = await deps.submitLead(payload);
        update((s) => S.setLead(s, { status: 'success', reference: result.reference, demo: result.demo, name: form.name.trim().split(/\s+/)[0] }));
        // Das Formular samt Absende-Button verschwindet – Fokus und Blick gehen zur Bestätigung.
        deps.afterRender(() => deps.focusElement('lead-success'));
      } catch (error) {
        update((s) => S.setLead(s, { status: 'idle', error: error.message }));
        deps.afterRender(() => deps.focusElement('lead-error'));
      }
    },

    async printExpose() {
      try {
        await deps.printExpose();
      } catch (error) {
        deps.logError(error);
        toast('error', 'Das Exposé konnte nicht erstellt werden.');
      }
    },

    async exportModel() {
      const viewer = deps.viewer();
      if (!viewer) {
        toast('error', 'Das 3D-Modell ist in diesem Browser nicht verfügbar.');
        return;
      }
      try {
        const blob = await viewer.exportGlb();
        deps.download(blob, `citodomus-${deriveView(get()).configId}.glb`);
        toast('info', '3D-Modell (.glb) wird heruntergeladen.');
      } catch (error) {
        deps.logError(error);
        toast('error', 'Der 3D-Export ist fehlgeschlagen.');
      }
    },
  };

  return { actions, toast };
}
