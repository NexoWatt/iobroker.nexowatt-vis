
## v0.3.12 — 2025-10-28

### UI
- Logo oben links vergrößert (responsiv per `clamp()`).
- Energiefluss-Monitor skaliert größer & responsiv (größere Mindesthöhe, breitere SVG, bessere Lesbarkeit).



## v0.3.11 — 2025-10-28

### Fixed/Changed
- **Installer** erscheint nicht mehr auf der LIVE-Seite (Panels werden konsequent versteckt/angezeigt).
- **Konsole**: `chg is not defined` behoben (korrekte Variablennamen im Donut-Rendering).
- **Menü**: beim Öffnen von Einstellungen/Installateur wird zuerst alles ausgeblendet (`hideAllPanels()`).
- Button umbenannt in **„NexoWatt Admin öffnen“**.
- **Responsive**: Installer/Settings Grids mit Breakpoints (2 Spalten → 1 Spalte < 980px).


## v0.3.10 — 2025-10-28

### Fixed
- Syntaxfehler in `app.js` (überzählige `}` in `setupInstaller()`) behoben → Dropdown-Menü & Live-Status funktionieren wieder.


## v0.3.9 — 2025-10-28

### Fixed
- Frontend initialisiert strikt **nach** DOM-Load.
- Event-Verbindung (`/events`) mit **Auto-Reconnect** und korrekter Live-Anzeige (grün).


## v0.3.8 — 2025-10-28

### Fixed
- Dropdown-Menü initialisiert **nach** DOM-Load (kein „Button ohne Funktion“ mehr).
- Live-Status (grüner Punkt) wieder zuverlässig: **Auto-Reconnect** der EventSource zu `/events` & Status-Update.


## v0.3.7 — 2025-10-28

### Fixed
- Untermenü wieder stabil: Klick im Menü blockiert das „Außen-Klick“-Schließen; ESC schließt das Menü; beim Start wird die LIVE-Seite gezeigt und alle Panels sind verborgen.


## v0.3.6 — 2025-10-28

### Changed
- Untermenü bereinigt: **Über** entfernt (keine doppelten/unnötigen Einträge).
- **Einstellungen**: Installateur-Button entfernt (Zugriff nur noch über das Untermenü).
- **Installateur**: Passwortabfrage **vor** dem Öffnen der Seite; optimierte Proportionen (2-Spalten-Layout, bessere Abstände).
- **LIVE** bleibt sauber: Einstellungen/Installateur werden nicht mehr auf der Hauptseite angezeigt.


## v0.3.5 — 2025-10-28

### Added
- Untermenü **Einstellungen** mit den Steuereinheiten (Bild 1) – jeder Regler/Eingabewert kann in der Admin-Konfiguration einem ioBroker-Datenpunkt zugeordnet werden.
- Untermenü **Installateur** (Passwort) mit den Steuereinheiten aus Bild 2 und Button zum Öffnen von ioBroker Admin.
- Server: `/api/installer/login` & `/api/set` zum Schreiben der Werte in die konfigurierten Objekt-IDs; Live-Updates für diese IDs werden ebenfalls abonniert.


## v0.3.4 — 2025-10-28

### Removed
- Einstellungen: „SoC‑Badge in Batterie anzeigen“ & „Update‑Intervall (s)“.
- Über NexoWatt EMS Panel.
- Beide Blöcke erscheinen auch nicht mehr unten auf der Hauptseite.

# Changelog

## v0.3.3 — 2025-10-28

### Fixed
- **LIVE tab not returning to main page**: Activate tab switching by calling `initTabs()` on startup and wrapping initialization in `DOMContentLoaded` for reliable load order.
