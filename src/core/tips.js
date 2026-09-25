import { MODELS, PRICING } from '../data/catalog.js';
import { CITO_AVATARS } from '../data/content.js';
import { maxRoomsForArea, pvAvailability, updateConfig } from './config.js';
import { energyMetrics, energyStandard } from './energy.js';
import { formatEuro, formatPercent } from './format.js';
import { houseGeometry } from './geometry.js';
import { optionPrices } from './pricing.js';

/**
 * Kontextbezogene Empfehlungen des Maskottchens Cito.
 * Jede Regel liefert entweder null oder einen Tipp; die erste passende Regel je Schritt gewinnt.
 * Ein Tipp kann eine Aktion (Options-Patch) enthalten, die sich mit einem Klick übernehmen lässt.
 */

const tip = (fields) => ({ badge: null, action: null, ...fields });

const STEP_RULES = {
  1: [
    (c) =>
      c.floors === 1 && !c.accessible && !MODELS[c.model].accessibleIncluded
        ? tip({
            title: 'Cito denkt voraus',
            badge: 'Komfort-Tipp',
            text: `Eingeschossig wohnen ist ideal für später: Mit breiten Türen und ebenerdigen Bädern ist dein Haus barrierefrei – für nur ${formatEuro(PRICING.accessiblePrice)}.`,
            action: { label: 'Barrierefrei planen', patch: { accessible: true } },
          })
        : null,
    (c) =>
      c.floors === 1 && c.model !== 'alpha'
        ? tip({
            title: 'Cito rechnet mit',
            text: `Eingeschossig braucht dein Haus rund ${Math.round(houseGeometry(c).footprintArea)} m² Grundfläche. Ich prüfe gern, ob das auf dein Grundstück passt.`,
          })
        : null,
    (c) =>
      c.rooms === maxRoomsForArea(c.area) && c.area + 10 <= MODELS[c.model].areaMax
        ? tip({
            title: 'Cito rechnet mit',
            text: `Mit ${c.rooms} Zimmern nutzt du jeden Quadratmeter. Etwas mehr Luft? 10 m² zusätzlich kosten ${formatEuro(10 * PRICING.areaPricePerSqm)}.`,
            action: { label: '+10 m² Wohnfläche', patch: { area: c.area + 10 } },
          })
        : null,
    () =>
      tip({
        title: 'CITO Bauberater',
        badge: 'Live-Prüfung',
        text: 'Hallo! Ich bin Cito. Starte mit deinem Wunschhaus – schlüsselfertig in nur 6 Monaten bezugsbereit! Statik, Grundriss und Preis passe ich sofort in Echtzeit an.',
      }),
  ],
  2: [
    (c) =>
      c.frame === 'weiss' && !c.raffstore
        ? tip({
            title: 'Cito empfiehlt für die Südseite',
            badge: 'Energie-Tipp',
            text: 'Für große Glasfronten empfehle ich Alu-Clip-Dreifachverglasung mit integriertem Raffstore. Sie spart im Winter Heizkosten und hält das Haus im Hochsommer angenehm kühl – ganz ohne Klimaanlage.',
            action: { label: 'Empfehlung übernehmen', patch: { frame: 'anthrazit', raffstore: true } },
          })
        : null,
    (c) =>
      c.facade === 'holz' && c.woodTone !== 'silber'
        ? tip({
            title: 'Cito kennt sein Holz',
            badge: 'Material-Tipp',
            text: 'Unbehandeltes Holz altert in Würde und wird über die Jahre silbergrau. Wer den Look von Anfang an möchte, wählt die vorvergraute Variante – gleichmäßig und wartungsarm.',
            action: { label: 'Vorvergraut wählen', patch: { woodTone: 'silber' } },
          })
        : null,
    (c) =>
      !c.canopy
        ? tip({
            title: 'Cito empfiehlt',
            badge: 'Eingang',
            text: 'Ein freitragendes Vordach mit LED-Spots schützt Gäste und Paketboten vor Regen – und setzt deinen Eingang abends stimmungsvoll in Szene.',
            action: { label: 'Vordach hinzufügen', patch: { canopy: true } },
          })
        : null,
    (c) =>
      tip({
        title: 'Cito ist begeistert',
        badge: 'QNG',
        text:
          c.facade === 'klinker'
            ? 'Klinker ist nahezu wartungsfrei und schützt die Sockelzone vor Spritzwasser – 30 Jahre Fassadenschutz inklusive.'
            : 'Starke Wahl! Alle Oberflächen entsprechen dem QNG-Nachhaltigkeitsstandard und sind für 30 Jahre Fassadenschutz ausgelegt.',
      }),
  ],
  3: [
    (c) => {
      const plus = pvAvailability(c).find((p) => p.id === 'plus');
      if (c.pv !== 'basis' || !plus.available) return null;
      const now = energyMetrics(c);
      const next = energyMetrics(updateConfig(c, { pv: 'plus' }).config);
      return tip({
        title: 'Cito rechnet mit',
        badge: 'Mehr Ertrag',
        text: `Mit 12 kWp steigt deine Autarkie von ${formatPercent(now.autarky)} auf ${formatPercent(next.autarky)} – das sind rund ${formatEuro(next.savingsPerYear - now.savingsPerYear)} mehr Ersparnis pro Jahr.`,
        action: { label: '12 kWp übernehmen', patch: { pv: 'plus' } },
      });
    },
    (c) =>
      !c.wallbox
        ? tip({
            title: 'Cito denkt an morgen',
            badge: 'E-Mobilität',
            text: 'Planst du ein E-Auto? Mit der Solar-Wallbox tankst du Sonnenüberschuss für rund 12.000 km im Jahr – nahezu kostenlos.',
            action: { label: 'Wallbox hinzufügen', patch: { wallbox: true } },
          })
        : null,
    (c) =>
      !c.batteryPlus
        ? tip({
            title: 'Cito empfiehlt',
            badge: 'Speicher',
            text: `Mit 15 kWh Speicher reicht dein Sonnenstrom bis tief in die Nacht – Autarkie ${formatPercent(energyMetrics({ ...c, batteryPlus: true }).autarky)}.`,
            action: { label: 'Speicher erweitern', patch: { batteryPlus: true } },
          })
        : null,
    (c) => {
      const m = energyMetrics(c);
      return tip({
        title: 'Cito Energie-Versprechen',
        badge: 'Autarkie',
        text: `Dein Schlüssel zur Unabhängigkeit: ${formatPercent(m.autarky)} Autarkie und rund ${formatEuro(m.savingsPerYear)} Ersparnis pro Jahr.`,
      });
    },
  ],
  4: [
    (c) =>
      !energyStandard(c).plus
        ? tip({
            title: 'Cito kennt den Weg zu 40 Plus',
            badge: 'Effizienzhaus',
            text: `Mit Wohnraumlüftung und Smart-Home-Energiemanager erreicht dein Haus den Standard Effizienzhaus 40 Plus: frische Luft ohne Wärmeverlust und maximaler Eigenverbrauch – zusammen ${formatEuro(
              (c.ventilation ? 0 : optionPrices(c).ventilation) + (c.smartHome ? 0 : optionPrices(c).smartHome),
            )}.`,
            action: { label: 'Beides hinzufügen', patch: { ventilation: true, smartHome: true } },
          })
        : null,
    (c) =>
      c.flooring === 'vinyl'
        ? tip({
            title: 'Cito empfiehlt',
            badge: 'Wohngefühl',
            text: 'Echtholz-Landhausdielen sind auf die Fußbodenheizung abgestimmt und fühlen sich barfuß besonders warm an.',
            action: { label: 'Landhausdiele wählen', patch: { flooring: 'parkett' } },
          })
        : null,
    () =>
      tip({
        title: 'Cito ist zufrieden',
        badge: 'Ausstattung',
        text: 'Perfekt ausgestattet: Fußbodenheizung in allen Räumen, Elektro nach RAL-Standard und Wände in Q3-Qualität sind immer inklusive.',
      }),
  ],
  5: [
    () =>
      tip({
        title: 'Fast geschafft!',
        badge: 'Festpreis',
        text: 'Sichere dir jetzt deinen Festpreis – 12 Monate garantiert. Unser Bauberater meldet sich innerhalb von 24 Stunden bei dir.',
      }),
  ],
};

const STEP_AVATARS = { 1: 'builder', 2: 'architect', 3: 'keys', 4: 'architect', 5: 'wave' };

/** Liefert den passenden Cito-Tipp für Schritt und Konfiguration. */
export function citoTip(config, step) {
  const rules = STEP_RULES[step] ?? STEP_RULES[1];
  let found = null;
  for (const rule of rules) {
    found = rule(config);
    if (found) break;
  }
  return { ...found, avatar: CITO_AVATARS[STEP_AVATARS[step] ?? 'wave'], step };
}
