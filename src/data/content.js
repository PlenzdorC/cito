/** Redaktionelle Inhalte: Cito-Avatare, FAQ, Bauablauf und Leistungsumfang. */

const asset = (file) => `${import.meta.env?.BASE_URL ?? './'}cito/${file}`;

export const CITO_AVATARS = Object.freeze({
  builder: asset('cito-builder.jpg'),
  architect: asset('cito-architect.jpg'),
  keys: asset('cito-keys.jpg'),
  wave: asset('cito-wave.jpg'),
  full: asset('cito-full.jpg'),
});

export const FAQ = Object.freeze([
  {
    id: 'bauzeit',
    question: 'Wie schaffst du das in 6 Monaten?',
    answer:
      'Ab Baugenehmigung und fertiger Bodenplatte: 4 Wochen Werkplanung, 12 Wochen Modulfertigung in unserer Halle, Kranmontage vor Ort in 48 Stunden, danach Innenausbau und Abnahme. Den Einzugstermin halten wir im Bauvertrag fest.',
  },
  {
    id: 'festpreis',
    question: 'Was ist im Festpreis enthalten?',
    answer:
      'Planung, Bauantrag und Statik, Fertigung, Transport und Montage, schlüsselfertiger Innenausbau, Wärmepumpe, 8 kWp PV mit 10 kWh Speicher und Fußbodenheizung. Nicht enthalten sind Grundstück, Bodenplatte bzw. Fundament, Erdarbeiten, Hausanschlüsse und Außenanlagen.',
  },
  {
    id: 'foerderung',
    question: 'Welche Förderung ist möglich?',
    answer:
      'Als Effizienzhaus 40 mit QNG-Siegel eignet sich dein Haus in der Regel für den KfW-Kredit „Klimafreundlicher Neubau“ – je nach Programm bis zu 150.000 € zinsverbilligt. Die genaue Förderfähigkeit prüfen wir gemeinsam in der Energieberatung.',
  },
  {
    id: 'grundstueck',
    question: 'Brauche ich schon ein Grundstück?',
    answer:
      'Nein. Mit dem kostenlosen Bauplatz- & Bebaubarkeits-Check prüfen wir Bebauungsplan, Kranzufahrt und Bodenverhältnisse – auch für Grundstücke, die du gerade erst ins Auge gefasst hast.',
  },
  {
    id: 'transport',
    question: 'Wie kommen die Module aufs Grundstück?',
    answer:
      'Je nach Modell liefern wir 4 bis 8 Raummodule per Tieflader und stellen sie in ein bis zwei Tagen. Die Zufahrt sollte rund 3,5 m breit sein – alles Weitere klären wir beim Bauplatz-Check.',
  },
  {
    id: 'aenderungen',
    question: 'Kann ich später noch etwas ändern?',
    answer:
      'Ja, bis zur Freigabe der Werkplanung kannst du Grundriss und Ausstattung anpassen. Deine Online-Konfiguration ist die Grundlage für das verbindliche Festpreisangebot.',
  },
  {
    id: 'simulation',
    question: 'Wie genau ist die Energie-Simulation?',
    answer:
      'Die Werte sind Richtwerte auf Basis typischer Verbräuche und 1.000 kWh Jahresertrag je kWp in Deutschland. Die exakte Auslegung erfolgt mit den Daten deines Standorts.',
  },
]);

export const TIMELINE = Object.freeze([
  {
    weeks: 'Woche 1 – 4',
    title: 'Planung & Bauantrag',
    text: 'Digitales Aufmaß, statische Werkplanung & Bauantrags-Einreichung.',
    icon: 'draw',
    tone: 'primary',
  },
  {
    weeks: 'Woche 5 – 16',
    title: 'Modulfertigung',
    text: 'Präzise Vorfertigung mit Haustechnik, Fenstern und Innenausbau im Werk.',
    icon: 'precision_manufacturing',
    tone: 'tertiary',
  },
  {
    weeks: 'Woche 17 – 20',
    title: 'Aufbau vor Ort',
    text: 'Kranmontage in 48 Stunden, Dachabdichtung & Medienanschluss.',
    icon: 'foundation',
    tone: 'tertiary',
  },
  {
    weeks: 'Woche 24',
    title: 'Schlüsselübergabe',
    text: 'Feinabnahme & Cito-Übergabezertifikat. Einzugsbereit!',
    icon: 'key',
    tone: 'primary',
  },
]);

export const INCLUDED_SERVICES = Object.freeze([
  'Planung, Bauantrag & Statik',
  'Transport, Kranmontage & Inbetriebnahme',
  'Schlüsselfertiger Innenausbau',
  'Wärmepumpe, PV-Anlage & Speicher',
]);

export const EXCLUDED_SERVICES = Object.freeze([
  'Grundstück & Erschließung',
  'Bodenplatte / Fundament nach Bodengutachten',
  'Hausanschlüsse & Außenanlagen',
]);

export const BRAND_FACTS = Object.freeze([
  { icon: 'timer', label: 'Bauzeit', value: '6 Monate', note: 'Festpreisgarantie', tone: 'tertiary' },
  { icon: 'energy_savings_leaf', label: 'Energie', value: 'KfW 40 QNG', note: 'Bis zu 150k Förderkredit', tone: 'primary' },
  { icon: 'factory', label: 'Vorfertigung', value: '90 % Modul', note: 'Präzision in der Werkhalle', tone: 'secondary' },
  { icon: 'co2', label: 'Ökobilanz', value: '−65 % CO₂', note: 'Zertifiziertes Holz', tone: 'tertiary' },
]);
