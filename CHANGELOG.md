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
