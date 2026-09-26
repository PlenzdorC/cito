# CITODOMUS 3D-Hauskonfigurator

Interaktiver Konfigurator für die modularen CITODOMUS-Häuser – umgesetzt nach den Vorgaben im
Projektordner (`DESIGN.md`, vier Screen-Entwürfe, Maskottchen „Cito“). In fünf Schritten wird ein Haus
konfiguriert, live kalkuliert, dreidimensional dargestellt und als Anfrage abgeschickt.

| Schritt | Vorlage | Inhalt |
| --- | --- | --- |
| 1 · Typ & Größe | `citodomus_konfigurator_haustyp_gr_e` | Modelllinie, Wohnfläche, Zimmer, Geschosse, Barrierefreiheit |
| 2 · Architektur & Fassade | `citodomus_konfigurator_architektur_fassade` | Putz/Holz/Klinker mit Farbtönen, Fensterrahmen, Raffstore, Haustür & Vordach |
| 3 · Dach & Solar | `citodomus_konfigurator_dach_solar` | Pult-/Sattel-/Gründach, PV 8–16 kWp, Speicher, Wallbox, Sonnenstand-Simulation |
| 4 · Ausstattung & Energie | *neu, im Stil der Vorlagen* | Bodenbeläge, Bad, Innenausbau, Lüftung, Smart Home, Kaminofen, Effizienzhaus-Check |
| 5 · Angebot & Kontakt | `citodomus_konfigurator_angebot_embed_code` | Kalkulation, Finanzierung, Anfrageformular, Embed-Code, Exposé, 3D-Export |

## Funktionsumfang

- **Parametrisches 3D-Modell (three.js)** – Maße aus der Wohnfläche, Fenster aus dem Grundriss, Fassaden-
  materialien, Rahmenfarben, Raffstores, Vordach mit LED, Dachformen, exakt belegte PV-Module, Gründach,
  Kaminschornstein, Wärmepumpe, E-Auto mit Wallbox. Tag/Nacht, Sonnenstand (Schritt 3), Kamerafahrten je Schritt,
  Hotspots zu den Optionen, Vollbild.
- **Weitere Ansichten** – Innenraum als Puppenhaus (Boden, Küche, Kaminofen, Türen, Smart Home),
  generierter **2D-Grundriss** (EG/OG mit Flächen, Treppe, Fenstern, Maßketten) und **Schnittansicht**.
- **Live-Kalkulation** – ein Katalog als einzige Preisquelle (`src/data/catalog.js`); flächenabhängige Aufpreise
  skalieren mit der Hausgröße. Summen je Schritt, Monatsrate mit Eigenkapital-Regler.
- **Fachliche Regeln** – z. B. maximale Zimmer je Fläche, Bungalow nur eingeschossig, PV-Paket muss aufs Dach passen
  (wird sonst mit Hinweis angepasst), Zweitbad erst ab 110 m².
- **Energie-Simulation** – Ertrag, Autarkie, Ersparnis, Amortisation, CO₂, Heizkosten (Richtwerte).
- **Cito, der digitale Bauberater** – kontextbezogene Tipps mit Ein-Klick-Übernahme und FAQ-Schublade.
- **Anfrage** – validiertes Formular mit Einwilligung und Honeypot; Versand an einen konfigurierbaren Endpunkt
  (ohne Endpunkt: Demo-Modus, es werden keine Daten übertragen).
- **Teilen & Speichern** – die Konfiguration steckt im URL-Hash (`#m=one&fa=holz&s=2`), Speichern im Browser.
- **Exposé (PDF über Druckdialog)** und **3D-Modell als `.glb`**.
- **Partner-Einbettung** – Embed-Code-Generator, Partner-ID und Akzentfarbe per URL.
- **Barrierefreiheit** – native Formularelemente, Tastaturbedienung, Fokusringe, Live-Region für den Gesamtpreis,
  reduzierte Bewegung wird respektiert. Ohne WebGL zeigt der Viewport automatisch den Grundriss.
- **Datenschutzfreundlich** – Schrift (Plus Jakarta Sans) und Icons (Material Symbols) sind selbst gehostet,
  es gibt keine Anfragen an Drittanbieter.

## Schnellstart

Voraussetzung: Node.js ≥ 22.12

```bash
npm install
npm run dev        # Entwicklungsserver auf http://localhost:5173
npm test           # Unit- und Integrationstests (Vitest + jsdom)
npm run coverage   # Tests mit Abdeckungsbericht (Schwelle 80 %)
npm run build      # Produktions-Build nach dist/
npm run preview    # Build lokal ansehen
```

`npm run icons` erzeugt `src/ui/icon-paths.js` aus allen im Code verwendeten `icon('…')`-Aufrufen
(läuft automatisch vor `dev` und `build`). Icon-Namen deshalb immer als String-Literal übergeben.

## Konfiguration

Umgebungsvariablen (siehe `.env.example`):

| Variable | Zweck |
| --- | --- |
| `VITE_LEAD_ENDPOINT` | URL, an die Anfragen per `POST` (JSON) gehen. Leer = Demo-Modus. |
| `VITE_PRIVACY_URL` | Link zur Datenschutzerklärung im Formular. |
| `VITE_EMBED_BASE_URL` | Öffentliche Adresse des Konfigurators für den Embed-Code. |
| `VITE_RETURN_ORIGINS` | Weitere Ursprünge (Komma-getrennt), zu denen `?return=…` zurückführen darf. Der eigene Ursprung ist immer erlaubt. |

Preise, Optionen und Texte: `src/data/catalog.js` (Katalog), `src/data/content.js` (FAQ, Fahrplan, Leistungsumfang).
Die Beispielfinanzierung (Sollzins, Tilgung) steht ebenfalls im Katalog unter `FINANCING`.

### Anfrage-Payload

```json
{
  "configId": "CTD-2026-4K9QX",
  "createdAt": "2026-09-25T12:00:00.000Z",
  "partner": "MAKLER-42",
  "contact": { "name": "…", "phone": "…", "email": "…", "location": "…", "plot": "suche", "consultation": "video", "message": "…" },
  "configuration": { "model": "one", "area": 145, "…": "…" },
  "price": { "basePrice": 284900, "upgrades": 12350, "total": 297250, "monthlyRate": 1087, "items": [ … ] }
}
```

Der Endpunkt sollte optional `{ "reference": "…" }` zurückgeben (wird dem Kunden angezeigt) und muss serverseitig:

- alle Felder erneut validieren (der Client ist nicht vertrauenswürdig),
- Rate-Limiting und Spam-Schutz umsetzen (der Client verhindert nur Doppelklicks; das Honeypot-Feld filtert einfache Bots),
- die **Partner-Zuordnung prüfen**: `partner` stammt aus der URL und ist frei wählbar. Provisionen nur für
  registrierte Partner-IDs gutschreiben – idealerweise über ein serverseitig signiertes Partner-Token statt der Klartext-ID.

## Einbindung in eine andere Website

Zwei Wege, beide mit lauffähiger Beispielseite in `beispiele/` (bei `npm run dev` unter
`http://localhost:5173/beispiele/einbettung-iframe.html` bzw. `…/aufruf-mit-ruecksprung.html`):

| Variante | Beispiel | Wann |
| --- | --- | --- |
| 1 · Einbettung per iFrame | `beispiele/einbettung-iframe.html` | Konfigurator als Abschnitt der Seite, kein Seitenwechsel |
| 2 · Aufruf mit Rücksprung | `beispiele/aufruf-mit-ruecksprung.html` | Link öffnet den Konfigurator im Vollbild, „Zurück“ führt mit Ergebnis zur Seite |

Die Beispielseiten gehören nicht zum Build (`dist/`); die markierten Blöcke lassen sich übernehmen.

### Variante 1 – Einbettung per iFrame (auch für Partner-Websites)

```html
<iframe src="https://ihre-domain.de/konfigurator/?embed=1&partner=MAKLER-42&accent=9D3E1A#m=one"
        title="CITODOMUS 3D-Hauskonfigurator" width="100%" height="780px" loading="lazy"
        allow="fullscreen; clipboard-write" style="border:0;border-radius:16px"></iframe>
```

| Parameter | Bedeutung |
| --- | --- |
| `embed=1` | Embed-Modus |
| `partner` | Partner-ID (3–40 Zeichen, `A–Z`, `0–9`, `-`), wird der Anfrage beigefügt |
| `accent` | Akzentfarbe als Hex ohne `#`; zu helle Farben werden für lesbaren Kontrast automatisch abgedunkelt |
| `#…` | Start-Konfiguration (wie beim Teilen-Link) |

### Variante 2 – Aufruf mit Rücksprung

Die aufrufende Seite übergibt ihre eigene Adresse (URL-kodiert) in `return`; `partner` und `#…` funktionieren wie oben:

```
https://ihre-domain.de/konfigurator/?return=https%3A%2F%2Fwww.ihre-website.de%2Fhaeuser%2F#m=one
```

Der Konfigurator zeigt dann oben links „Zurück zu ihre-website.de“ und nach einer gesendeten Anfrage einen
Zurück-Button. Beide führen zur Rücksprungadresse und hängen das Ergebnis an (eigene Parameter und Anker der Seite
bleiben erhalten):

```
https://www.ihre-website.de/haeuser/?config=m%3Done%26fa%3Dholz&configId=CTD-2026-4K9QX&total=297250&lead=CTD-2026-4K9QX
```

| Parameter | Inhalt |
| --- | --- |
| `config` | Konfiguration im Format des Teilen-Links – als `#…` an die Konfigurator-Adresse gehängt, öffnet sie das Haus wieder |
| `configId` | Konfigurations-ID |
| `total` | Gesamtpreis in Euro (nur zur Anzeige) |
| `lead` | nur nach gesendeter Anfrage: Vorgangsnummer des Anfrage-Endpunkts |

- **Schutz vor Open Redirect:** Zurückgeführt wird nur auf `http(s)`-Adressen ohne Zugangsdaten auf dem eigenen
  Ursprung des Konfigurators oder einem Ursprung aus `VITE_RETURN_ORIGINS`. Andere Werte werden ignoriert (kein
  Zurück-Link). Im Embed-Modus (`embed=1`) gibt es keinen Rücksprung.
- Die angehängten Werte sind auf der Zielseite nicht vertrauenswürdig: prüfen, nur als Text ausgeben, den Preis nicht
  weiterverarbeiten. Verbindlich ist allein die Anfrage an `VITE_LEAD_ENDPOINT`.

## Betrieb

- Der Build ist statisch (`dist/`) und nutzt relative Pfade – er läuft unter jedem Unterpfad und jedem Webserver.
- Im Build ist eine Content-Security-Policy als `<meta>` gesetzt. `frame-ancestors` lässt sich nur per HTTP-Header
  setzen: per `Content-Security-Policy: frame-ancestors 'self' https://partner-a.de …` auf die Partner-Domains
  beschränken (schützt vor Clickjacking und fremden Einbettungen) oder bewusst offen lassen.
- HTTPS verwenden (Zwischenablage und Vollbild benötigen einen sicheren Kontext).

## Architektur

```
src/
  data/       Katalog (Preise, Optionen) und redaktionelle Inhalte
  core/       reine Logik: Regeln, Preise, Energie, Geometrie, Grundriss, Fassadenöffnungen,
              PV-Belegung, URL-Kodierung, Zustand – vollständig getestet
  services/   Anfrage, Speicher, Einbettung, Rücksprung
  app/        Aktionen (Zustandsübergänge + Seiteneffekte) und Browser-Helfer
  ui/         lit-html-Templates: Header, Viewport-Overlays, fünf Schritt-Panels, Dialoge, Exposé
  scene/      three.js: Materialien, Wände, Öffnungen, Dach & PV, Außenanlage, Schnitt, Innenraum, Kamera
  styles/     Tailwind v4 mit den Design-Tokens aus DESIGN.md
tests/        Vitest (Logik, Services, UI-Integration mit jsdom)
```

Datenfluss: Zustand (`core/state.js`) → abgeleitete Daten (`core/derive.js`) → Rendering (`ui/app.js`) und
3D-Viewer (`scene/viewer.js`, rendert nur bei Änderungen). Grundriss, Fassadenöffnungen, Preise und 3D-Modell
entstehen aus derselben Konfiguration und passen daher immer zusammen.

## Hinweise

- Alle Preise, Förder- und Energieangaben sind Richtwerte aus den Vorlagen bzw. plausible Annahmen und vor dem
  Livegang fachlich zu prüfen (insbesondere Förderprogramme, Zinssätze und Garantieaussagen).
- Die Visualisierung ist stilisiert und kein verbindlicher Entwurf; Grundrisse sind regelbasiert erzeugt.
