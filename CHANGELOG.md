# Changelog

## 0.0.1
- Initial preview release.

## 0.3.26 – 2025-11-01
- Fix: Installer-Login in Formular gehüllt; ENTER/Submit funktioniert zuverlässig.
- Fix: Doppelter Top‑Level-Block mit `await` entfernt (SyntaxError app.js:403).
- Neu: Abbrechen-Button schließt Installer und verhindert unbefugten Zugriff auf Form.

## 0.3.27 – 2025-11-01
- Fix: Unerwartete '}' in app.js entfernt.
- Chore: verborgenes Username-Feld für Passwort-Form (Barrierefreiheit).

## 0.3.28 – 2025-11-01
- Fix: Donut-Render verwendete chg2/dchg2 außerhalb des Blocks → ReferenceError. Jetzt charge/discharge.

## 0.3.29 – 2025-11-01
- Installer-Schutz auf HttpOnly-Cookie umgestellt (Server prüft Session).
- Frontend vereinfacht: kein Token-Handling mehr, Login-Form triggert nur /api/installer/login.
- /config liefert `installerLocked` abhängig von Session.

## 0.3.30 – 2025-11-01
- Default-Passwort für Installer: **install2025!** (falls kein Wert gesetzt).

## 0.3.31 – 2025-11-01
- Fix: Syntaxfehler im Login-Endpoint behoben; /api/set prüft jetzt sauber die Session.

## 0.3.32 – 2025-11-01
- Fix: Doppelte else-/Klammern in main.js entfernt (Login-Route).

## 0.3.33 – 2025-11-01
- Fix: Stray top-level await in app.js entfernt.

## 0.3.34 – 2025-11-01
- Fix: Reste der alten Token-Logik entfernt (SyntaxError in Zeile ~276 beseitigt).

## 0.3.35 – 2025-11-01
- Fix: Fehlende '}' nach initMenu() ergänzt (SyntaxError am Dateiende).

## 0.3.39 - 2025-11-01
- Neu: Eigene Datenpunkte für **Einstellungen** unter `nexowatt-vis.0.settings.*` (notifyEnabled, email, dynamicTariff, storagePower, price, priority, tariffMode)
- /api/set fällt auf lokale States zurück, wenn keine Fremd-ID konfiguriert ist.

### 0.3.40 (2025-11-01)
- Energy Flow Monitor: labels moved under icons, centered battery icon, battery SOC above icon, building power shown above icon inside the circle.

### 0.3.41 (2025-11-01)
- Admin: Übersichtskachel + Admin-Tab mit Auto-Weiterleitung auf `http://<ioBroker-IP>:<VIS-Port>/`.

### 0.3.42 (2025-11-01)
- Admin: welcomeScreen (legacy) + welcomeScreenPro mit RELATIVEM Link `/adapter/nexowatt-vis/tab.html` – Kachel wird klickbar.

### 0.3.43 (2025-11-01)
- Admin: Datapoint-Beschriftungen nach UI-Kategorien + Default-IDs für FENECON/OpenEMS ergänzt.

### 0.3.44 (2025-11-01)
- Fix: ID-Mismatches im UI behoben (`gridBuyPowerCard/gridSellPowerCard`, `evcsLastChargeKwh`, `consumptionOther`).
- Default `gridFrequency` → `fenecon.0._sum.GridFrequency`.

### 0.3.51 (2025-11-01)
- Fix: /history.html Route hinzugefügt (404 behoben).
- UI: Bestehenden HISTORY-Tab genutzt (kein zusätzlicher Button), Click öffnet /history.html.

### 0.3.52 (2025-11-01)
- Fix: History-Route und API in startServer(app) korrekt registriert (404 beseitigt).

### 0.3.53 (2025-11-01)
- Responsives Layout: Energiefluss proportioniert (kleiner), SVG-Ring reduziert, Breakpoints angepasst.
- Admin: alle Reiter als 2-Spalten-Layout ab md, mobil 1-Spalte; `newLine` entfernt wo sinnvoll.

### 0.3.54 (2025-11-01)
- History-Seite: identischer Header wie LIVE (Brand, Menü, Tabs). HISTORY aktiv, LIVE führt auf '/'.
\n### 0.3.55 (2025-11-01)\n- History: Menü 'Einstellungen' öffnet Live-Seite im Einstellungsmodus.\n- History: Statuspunkt (liveDot) via SSE aktiviert.\n- Live: Unterstützt Query '?settings=1' für direkten Einstiegs in Einstellungen.\n
### 0.3.56 (2025-11-01)
- Live: ?settings=1 öffnet die Einstellungen zuverlässig (DOM-ready).
- Energiefluss: Icons durch hochgeladene PNGs ersetzt (PV, Netz, Wallbox, Batterie, Gebäude).

### 0.3.57 (2025-11-01)
- UI: 'Wallbox' → 'Ladestation'.
- Farbschema Ringe: PV gelb, Batterie grün, Ladestation lila, Gebäude blau.
- Icons kräftiger (Sättigung/Glühen); Gebäude-Icon weiß.
- Mehr Luft unter den Icon-Beschriftungen (Label y=28).
\n### 0.3.58 (2025-11-01)\n- EVCS: Klickbare Karte öffnet Steuer-Modal (Status, Aktiv-Schalter, Modus-Slider 1–3, Leistung).\n- Admin: Neuer Reiter 'EVCS' zum Zuordnen von IDs (Leistung, Status, Aktiv, Modus).\n\n### 0.3.59 (2025-11-01)\n- Mobile: Settings-Form responsiv (Labels oben, volle Breite, größere Slider/Toggle, Installer-Button 100%).\n
### 0.3.60 (2025-11-01)
- Fix: Ring-Farben korrekt zugeordnet (Batterie grün, Ladestation blau, Gebäude blau, PV gelb, Netz rot).
- DOM: Knoten erhalten explizite Klassen (charger/battery) für stabile Farbgebung.

### 0.3.61 (2025-11-01)
- Gebäude-Icon wirklich weiß (stärkerer Filter).
- Ladestation-Modul: Modal öffnet jetzt auch beim Klick auf den **Knoten** im Energiefluss (ID `nodeEvcs`).
- Klickbarer Cursor für Nodes.
\n### 0.3.62 (2025-11-01)\n- Sichtbarkeit Ladestation: richtet sich nach *Installer → Anzahl Ladepunkte*. Bei 0 werden Knoten, Linie und Karten ausgeblendet.\n\n### 0.3.63 (2025-11-01)\n- Sichtbarkeit Ladestation: robust — liest `installer.chargepoints` direkt via API & per Live-States; Intervall-Polling alle 5s.\n\n### 0.3.64 (2025-11-01)\n- Ladestations-Sichtbarkeit: robustere Erkennung verschiedenster Key-/Shapes; Anlauf-Polling 1 min.\n\n### 0.3.65 (2025-11-01)\n- Fix: SyntaxError in app.js (getChargepointsFromState) behoben.\n
### 0.3.66 (2025-11-01)
- Fix: SyntaxError in app.js beseitigt (bereinigte Funktion + Header wiederhergestellt).
- Gebäude-Icon im Energiefluss durch neues weißes Icon ersetzt (/static/icons/building.png).
