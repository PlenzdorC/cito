import { html, nothing } from 'lit-html';
import { MODELS, ROOFS } from '../data/catalog.js';
import { TIMELINE } from '../data/content.js';
import { formatArea, formatDelta, formatEuro, formatKwh, formatMeters, formatMonthly, formatNumber, formatPercent } from '../core/format.js';
import { floorplanSvg } from './floorplan-view.js';

/** Druckbares Exposé (wird nur bei „PDF Exposé“ gerendert und per window.print() ausgegeben). */

function fact(label, value) {
  return html`<div style="border:1px solid #e4e1db;border-radius:8px;padding:8px 10px">
    <div style="font-size:10px;color:#56423c;text-transform:uppercase;letter-spacing:.04em">${label}</div>
    <div style="font-size:14px;font-weight:700;color:#1a1c1a">${value}</div>
  </div>`;
}

export function exposeTemplate(state, derived, { image, createdAt }) {
  const { config } = state;
  const model = MODELS[config.model];
  const { breakdown, energy, geo, plan, openings, standard } = derived;
  const date = new Intl.DateTimeFormat('de-DE', { dateStyle: 'long' }).format(createdAt);
  return html`<article class="expose" style="font-family:var(--font-sans);color:#1a1c1a;-webkit-print-color-adjust:exact;print-color-adjust:exact">
    <header style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #9d3e1a;padding-bottom:8px">
      <div>
        <div style="font-size:22px;font-weight:800;color:#9d3e1a;letter-spacing:-.02em">CITODOMUS</div>
        <div style="font-size:11px;color:#56423c">In 6 Monaten zuhause. · Modulare Präzision</div>
      </div>
      <div style="text-align:right;font-size:11px;color:#56423c">
        <div style="font-size:15px;font-weight:700;color:#1a1c1a">Exposé ${derived.configId}</div>
        <div>Erstellt am ${date}</div>
      </div>
    </header>

    <h1 style="font-size:24px;font-weight:800;margin:14px 0 2px">${model.name}</h1>
    <p style="margin:0 0 10px;font-size:12px;color:#56423c">${config.area} m² · ${config.rooms} Zimmer · ${config.floors === 1 ? 'eingeschossig' : 'zweigeschossig'} · ${ROOFS[config.roof].name}</p>
    ${image ? html`<img src=${image} alt="3D-Ansicht des konfigurierten Hauses" style="width:100%;height:auto;border-radius:12px;display:block" />` : nothing}

    <section style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px">
      ${fact('Wohnfläche', formatArea(config.area))}
      ${fact('Außenmaße', `${formatMeters(geo.outer.width)} × ${formatMeters(geo.outer.depth)}`)}
      ${fact('Gebäudehöhe', formatMeters(geo.totalHeight))}
      ${fact('Energiestandard', `${standard.label} · QNG`)}
      ${fact('PV & Speicher', `${energy.kwp} kWp · ${energy.batteryKwh} kWh`)}
      ${fact('Autarkie (Richtwert)', formatPercent(energy.autarky))}
    </section>

    <section style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;background:#f4f3f0;border-radius:12px;padding:12px 14px">
      <div>
        <div style="font-size:10px;color:#56423c;text-transform:uppercase">Festpreis inkl. MwSt.</div>
        <div style="font-size:26px;font-weight:800;color:#9d3e1a">${formatEuro(breakdown.total)}</div>
      </div>
      <div style="text-align:right;font-size:12px;color:#56423c">
        <div>Basis ${formatEuro(breakdown.basePrice)} · Upgrades ${formatDelta(breakdown.upgradesTotal, { includedLabel: '0 €' })}</div>
        <div style="font-weight:700;color:#9d3e1a">Monatlich ab ${formatMonthly(derived.monthly)}</div>
      </div>
    </section>

    <section style="break-before:page;page-break-before:always">
      <h2 style="font-size:16px;font-weight:800;margin:0 0 6px">Grundriss</h2>
      <div style="display:grid;grid-template-columns:repeat(${plan.floors.length},1fr);gap:10px">
        ${plan.floors.map(
          (floor, level) => html`<figure style="margin:0;border:1px solid #e4e1db;border-radius:10px;padding:6px">
            <figcaption style="font-size:11px;font-weight:700;color:#9d3e1a">${floor.label}</figcaption>
            <div style="height:${plan.floors.length > 1 ? 220 : 300}px">${floorplanSvg({ plan, geo, openings, level })}</div>
          </figure>`,
        )}
      </div>
    </section>

    <section style="margin-top:12px">
      <h2 style="font-size:16px;font-weight:800;margin:0 0 6px">Kalkulation</h2>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <tr><td style="padding:4px 0;border-bottom:1px solid #e4e1db">Basishaus ${model.name} (${model.baseArea} m²)</td><td style="text-align:right;border-bottom:1px solid #e4e1db">${formatEuro(breakdown.basePrice)}</td></tr>
        ${breakdown.items.map(
          (item) => html`<tr>
            <td style="padding:4px 0;border-bottom:1px solid #e4e1db;color:#56423c">${item.label}</td>
            <td style="text-align:right;border-bottom:1px solid #e4e1db">${formatDelta(item.amount, { includedLabel: 'inklusive' })}</td>
          </tr>`,
        )}
        <tr><td style="padding:6px 0;font-weight:800">Festpreis gesamt</td><td style="text-align:right;font-weight:800;color:#9d3e1a">${formatEuro(breakdown.total)}</td></tr>
      </table>
    </section>

    <section style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;font-size:11px">
      <div>
        <h2 style="font-size:14px;font-weight:800;margin:0 0 4px">Energie (Richtwerte)</h2>
        <div>PV-Jahresertrag: ${formatKwh(energy.annualYield)}</div>
        <div>Stromverbrauch: ${formatKwh(energy.consumption)}</div>
        <div>Ersparnis: ca. ${formatEuro(energy.savingsPerYear)} pro Jahr</div>
        <div>CO₂-Einsparung: ${formatNumber(energy.co2TonsPerYear, 1)} t pro Jahr</div>
      </div>
      <div>
        <h2 style="font-size:14px;font-weight:800;margin:0 0 4px">6-Monate-Fahrplan</h2>
        ${TIMELINE.map((step) => html`<div><strong>${step.weeks}:</strong> ${step.title}</div>`)}
      </div>
    </section>

    <footer style="margin-top:14px;border-top:1px solid #e4e1db;padding-top:6px;font-size:9px;color:#56423c">
      Alle Angaben sind unverbindliche Richtwerte inkl. MwSt. Nicht enthalten: Grundstück, Bodenplatte/Fundament, Hausanschlüsse,
      Außenanlagen. Förderfähigkeit wird im Rahmen der Energieberatung geprüft. Festpreisangebot nach Bauplatz-Check.
    </footer>
  </article>`;
}
