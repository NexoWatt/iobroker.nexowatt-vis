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
