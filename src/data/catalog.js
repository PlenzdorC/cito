/**
 * CITODOMUS Produktkatalog – einzige Quelle für Modelle, Optionen und Preise.
 * Alle Preise in Euro inkl. MwSt. (Richtwerte für den Online-Konfigurator).
 */

const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

export const STEPS = deepFreeze([
  { id: 1, title: 'Typ & Größe', heading: 'Haustyp & Modell', short: 'Typ' },
  { id: 2, title: 'Architektur & Fassade', heading: 'Fassadengestaltung', short: 'Fassade' },
  { id: 3, title: 'Dach & Solar', heading: 'Dach, Solar & Autarkie', short: 'Dach' },
  { id: 4, title: 'Ausstattung & Energie', heading: 'Ausstattung & Haustechnik', short: 'Ausstattung' },
  { id: 5, title: 'Angebot & Kontakt', heading: 'Angebot & Beratung', short: 'Angebot' },
]);

export const REFERENCE_MODEL_ID = 'one';

export const MODELS = deepFreeze({
  alpha: {
    id: 'alpha',
    name: 'Modul-Bungalow Alpha',
    shortName: 'Bungalow Alpha',
    icon: 'bungalow',
    tagline: 'Eingeschossig • Barrierefrei konzipiert',
    basePrice: 239000,
    baseArea: 95,
    areaMin: 90,
    areaMax: 140,
    defaultRooms: 3,
    floorOptions: [1],
    defaultFloors: 1,
    accessibleIncluded: true,
  },
  one: {
    id: 'one',
    name: 'Familien-Stadthaus Cito One',
    shortName: 'Cito One',
    icon: 'domain',
    tagline: '2 Etagen • Bestseller für Familien',
    badge: 'Bestseller',
    basePrice: 284900,
    baseArea: 145,
    areaMin: 120,
    areaMax: 175,
    defaultRooms: 4,
    floorOptions: [1, 2],
    defaultFloors: 2,
    accessibleIncluded: false,
  },
  grande: {
    id: 'grande',
    name: 'Design-Villa Cito Grande',
    shortName: 'Cito Grande',
    icon: 'villa',
    tagline: 'Luxusmodul • Galerie & Doppel-Büro',
    basePrice: 358000,
    baseArea: 185,
    areaMin: 160,
    areaMax: 210,
    defaultRooms: 5,
    floorOptions: [1, 2],
    defaultFloors: 2,
    accessibleIncluded: false,
  },
});

export const ROOM_OPTIONS = deepFreeze([3, 4, 5, 6]);

export const PRICING = deepFreeze({
  /** Mehr- bzw. Minderfläche gegenüber der Modell-Basisfläche */
  areaPricePerSqm: 1850,
  /** Je Zimmer über dem Modell-Standard (Innenwände, Türen, Elektro) */
  extraRoomPrice: 1900,
  /** Mehrkosten Bodenplatte & Dach bei eingeschossiger Bauweise */
  singleStoreyPerSqm: 95,
  accessiblePrice: 3400,
  /** Skalierte Preise werden auf diesen Betrag gerundet */
  roundTo: 50,
});

export const FACADES = deepFreeze({
  putz: {
    id: 'putz',
    name: 'Mineralischer Edelputz',
    description: '2 mm Scheibenputz, schmutzabweisend',
    icon: 'format_paint',
    price: 0,
  },
  holz: {
    id: 'holz',
    name: 'Rhombusschalung Holz',
    description: 'Vertikale Lamellen, unbehandelt oder vorvergraut',
    icon: 'nature',
    price: 4800,
    badge: 'Beliebt',
  },
  klinker: {
    id: 'klinker',
    name: 'Akzent-Klinkerriemchen',
    description: 'Erdgeschoss in gebranntem Ziegel, darüber Edelputz',
    icon: 'view_module',
    price: 6900,
  },
});

export const PLASTER_COLORS = deepFreeze({
  sandweiss: { id: 'sandweiss', name: 'Sandweiß Matt', hex: '#efe9df' },
  schiefergrau: { id: 'schiefergrau', name: 'Schiefergrau', hex: '#5f6468' },
  terracotta: { id: 'terracotta', name: 'Terracotta', hex: '#b5643f' },
});

export const WOOD_TONES = deepFreeze({
  laerche: { id: 'laerche', name: 'Lärche Natur', hex: '#c28b56' },
  thermo: { id: 'thermo', name: 'Thermo-Kiefer', hex: '#7c5236' },
  silber: { id: 'silber', name: 'Silbergrau vorvergraut', hex: '#9c978e' },
});

export const BRICK_TONES = deepFreeze({
  rotbunt: { id: 'rotbunt', name: 'Rotbunt', hex: '#a44b2d' },
  anthrazit: { id: 'anthrazit', name: 'Anthrazit-Kohle', hex: '#4b4745' },
});

export const FRAMES = deepFreeze({
  anthrazit: {
    id: 'anthrazit',
    name: 'Alu-Clip Matt',
    color: 'Anthrazit',
    code: 'RAL 7016',
    hex: '#373b3e',
    price: 1900,
  },
  eiche: {
    id: 'eiche',
    name: 'Holz-Alu',
    color: 'Eiche Natur',
    code: 'Eiche',
    hex: '#b58b5b',
    price: 3400,
  },
  weiss: {
    id: 'weiss',
    name: 'Kunststoff',
    color: 'Reinweiß 3-fach',
    code: 'RAL 9016',
    hex: '#f4f3ef',
    price: 0,
  },
});

export const WINDOW_EXTRAS = deepFreeze({
  raffstore: {
    id: 'raffstore',
    name: 'Elektrische Raffstore-Jalousien',
    description: 'Alulamellen windstabil mit Funksteuerung',
    icon: 'blinds',
    price: 2900,
    scale: 'facade',
  },
});

export const ENTRANCE_EXTRAS = deepFreeze({
  smartLock: {
    id: 'smartLock',
    name: 'SmartScan Fingerscan & Code',
    description: 'Schlüsselloser Zutritt per Biometrie',
    icon: 'fingerprint',
    price: 1250,
  },
  canopy: {
    id: 'canopy',
    name: 'Architektur-Vordach mit LED',
    description: 'Freitragendes Flachdach mit Decken-Spots',
    icon: 'roofing',
    price: 2100,
  },
});

export const ROOFS = deepFreeze({
  pult: {
    id: 'pult',
    name: 'Pultdach',
    description: '18° Südausrichtung',
    pitch: 18,
    yieldFactor: 1,
    price: 0,
    badge: 'Empfehlung',
  },
  sattel: {
    id: 'sattel',
    name: 'Satteldach',
    description: '35° Ost/West-Mix',
    pitch: 35,
    yieldFactor: 0.92,
    price: 3800,
  },
  flach: {
    id: 'flach',
    name: 'Flach- & Gründach',
    description: 'Extensiv bepflanzt',
    pitch: 0,
    yieldFactor: 0.88,
    price: 5200,
  },
});

export const PV_MODULE = deepFreeze({ width: 1.134, length: 1.722, wattPeak: 400 });

export const PV_PACKAGES = deepFreeze({
  basis: { id: 'basis', name: '8 kWp Basis', kwp: 8, modules: 20, price: 0, icon: 'flare' },
  plus: { id: 'plus', name: '12 kWp Plus', kwp: 12, modules: 30, price: 3900, icon: 'solar_power' },
  max: { id: 'max', name: '16 kWp Max', kwp: 16, modules: 40, price: 7400, icon: 'electric_bolt' },
});

export const ENERGY_INCLUDED = deepFreeze([
  {
    id: 'battery',
    name: '10 kWh Lithium-Eisenphosphat-Speicher',
    description: 'Notstromfähig mit automatischer 3-Phasen-Umschaltung',
    icon: 'battery_charging_full',
  },
  {
    id: 'heatpump',
    name: 'Luft-Wasser-Wärmepumpe (A+++)',
    description: 'Kühlfunktion im Sommer & Smart-Grid-Ready-Anbindung',
    icon: 'heat_pump',
  },
]);

export const ENERGY_EXTRAS = deepFreeze({
  batteryPlus: {
    id: 'batteryPlus',
    name: 'Speicher-Upgrade auf 15 kWh',
    description: 'Mehr Sonnenstrom für Abend und Nacht',
    icon: 'battery_full',
    price: 2600,
  },
  wallbox: {
    id: 'wallbox',
    name: '11 kW Intelligente Solar-Wallbox',
    description: 'Überschussladen für Elektrofahrzeuge',
    icon: 'ev_station',
    price: 1650,
  },
});

export const FLOORINGS = deepFreeze({
  vinyl: {
    id: 'vinyl',
    name: 'Vinyl-Designboden',
    description: 'Eiche hell · fußwarm & pflegeleicht',
    pricePerSqm: 0,
    swatch: '#d9c29c',
  },
  parkett: {
    id: 'parkett',
    name: 'Eichen-Landhausdiele',
    description: 'Echtholz geölt · 3,5 mm Nutzschicht',
    pricePerSqm: 45,
    swatch: '#b3824f',
    badge: 'Beliebt',
  },
  feinstein: {
    id: 'feinstein',
    name: 'Feinsteinzeug 120 × 60',
    description: 'Betonoptik · großformatig & robust',
    pricePerSqm: 55,
    swatch: '#a9a49c',
  },
});

export const BATHS = deepFreeze({
  komfort: {
    id: 'komfort',
    name: 'Komfort-Bad',
    description: 'Bodengleiche Dusche, Wand-WC, Waschtisch mit Unterschrank',
    icon: 'shower',
    price: 0,
  },
  wellness: {
    id: 'wellness',
    name: 'Wellness-Bad',
    description: 'Freistehende Wanne, Regendusche, Doppelwaschtisch',
    icon: 'bathtub',
    price: 7900,
  },
});

export const INTERIOR_EXTRAS = deepFreeze({
  secondBath: {
    id: 'secondBath',
    name: 'Zweites Duschbad',
    description: 'Zusätzlich zum Hauptbad · ab 110 m² Wohnfläche',
    icon: 'wc',
    price: 11500,
    minArea: 110,
  },
  tallDoors: {
    id: 'tallDoors',
    name: 'Raumhohe Innentüren',
    description: 'Flächenbündige Zargen, 2,50 m Durchgangshöhe',
    icon: 'door_front',
    pricePerDoor: 340,
  },
  kitchen: {
    id: 'kitchen',
    name: 'Cito Küche mit Kochinsel',
    description: 'Grifflose Fronten, Induktion & Einbaugeräte',
    icon: 'countertops',
    price: 14900,
  },
});

export const COMFORT_EXTRAS = deepFreeze({
  ventilation: {
    id: 'ventilation',
    name: 'Wohnraumlüftung mit Wärmerückgewinnung',
    description: '90 % Wärmerückgewinnung, Pollenfilter, flüsterleise',
    icon: 'mode_fan',
    price: 6900,
    scale: 'area',
  },
  smartHome: {
    id: 'smartHome',
    name: 'Smart-Home & Energiemanager',
    description: 'Licht, Beschattung & PV-Überschuss per App steuern',
    icon: 'home_iot_device',
    price: 4900,
  },
  stove: {
    id: 'stove',
    name: 'Kaminofen, raumluftunabhängig',
    description: 'Wohlige Strahlungswärme, 6 kW, mit Edelstahlschornstein',
    icon: 'fireplace',
    price: 5400,
  },
});

export const INTERIOR_INCLUDED = deepFreeze([
  { id: 'floorHeating', name: 'Fußbodenheizung in allen Räumen', icon: 'heat' },
  { id: 'electrics', name: 'Elektro nach RAL-RG 678, Ausstattungswert 2', icon: 'electrical_services' },
  { id: 'walls', name: 'Wände Q3 gespachtelt & weiß gestrichen', icon: 'format_paint' },
]);

export const FINANCING = deepFreeze({
  /** Beispiel-Sollzins p. a. für die Monatsrate */
  interestRate: 0.0239,
  /** Anfängliche Tilgung p. a. */
  repaymentRate: 0.02,
  kfwMaxLoan: 150000,
  maxEquityShare: 0.4,
  equityStep: 5000,
});

export const ENERGY = deepFreeze({
  /** kWh je kWp und Jahr bei Südausrichtung */
  specificYield: 1000,
  /** kWh je kWp an einem sonnigen Junitag */
  summerDayYieldPerKwp: 4.6,
  gridPrice: 0.38,
  feedInTariff: 0.078,
  heatPumpTariff: 0.29,
  /** kg CO₂ je kWh Netzstrom */
  co2PerKwh: 0.38,
  /** Anlagenwert 8 kWp + 10 kWh Speicher für die Amortisationsrechnung */
  pvSystemBaseValue: 15000,
  householdBase: 1000,
  householdPerPerson: 650,
  heatingDemandPerSqm: 25,
  ventilationHeatSaving: 0.3,
  ventilationFanKwh: 250,
  hotWaterPerPerson: 500,
  scop: 4.2,
  hotWaterCop: 2.8,
  wallboxKwh: 2200,
  baseBatteryKwh: 10,
  plusBatteryKwh: 15,
  smartHomeAutarkyBonus: 0.04,
  maxAutarky: 0.9,
});

export const BUILDING = deepFreeze({
  /** Seitenverhältnis Langseite : Schmalseite der Innenfläche */
  aspectRatio: 1.45,
  wallThickness: 0.36,
  storeyHeight: 2.95,
  plinthHeight: 0.3,
  /** Dachaufbau über der obersten Geschossdecke */
  roofBuildUp: 0.3,
  parapetHeight: 0.45,
  overhang: 0.5,
  flatRoofMargin: 0.4,
  pitchedRoofMargin: 0.35,
  moduleGap: 0.02,
  flatModuleTilt: 10,
  flatPairGap: 0.15,
});
