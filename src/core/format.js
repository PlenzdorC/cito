/** Deutsche Zahlen- und Preisformatierung (tabellarische Ziffern werden per CSS gesetzt). */

const EURO = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const DECIMAL_1 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const DECIMAL_2 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const INTEGER = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

// Schmales, geschütztes Leerzeichen zwischen Zahl und Einheit verhindert Zeilenumbrüche.
const NBSP = ' ';

export const formatEuro = (value) => `${EURO.format(Math.round(value))}${NBSP}€`;

/** Preisdifferenz für Optionskarten: „Inklusive“, „+ 4.800 €“ oder „− 1.200 €“. */
export const formatDelta = (value, { includedLabel = 'Inklusive' } = {}) => {
  const rounded = Math.round(value);
  if (rounded === 0) return includedLabel;
  const sign = rounded > 0 ? '+' : '−';
  return `${sign}${NBSP}${EURO.format(Math.abs(rounded))}${NBSP}€`;
};

export const formatArea = (value, digits = 0) =>
  `${digits === 0 ? INTEGER.format(value) : DECIMAL_1.format(value)}${NBSP}m²`;

export const formatMeters = (value) => `${DECIMAL_2.format(value)}${NBSP}m`;

export const formatNumber = (value, digits = 0) =>
  digits === 0 ? INTEGER.format(value) : digits === 1 ? DECIMAL_1.format(value) : DECIMAL_2.format(value);

export const formatPercent = (fraction) => `${INTEGER.format(Math.round(fraction * 100))}${NBSP}%`;

export const formatKwh = (value, digits = 0) => `${formatNumber(value, digits)}${NBSP}kWh`;

export const formatMonthly = (value) => `${formatEuro(value)}${NBSP}/${NBSP}Mt.`;

/** Uhrzeit aus Dezimalstunden, z. B. 13.5 → „13:30“. */
export const formatClock = (hours) => {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
