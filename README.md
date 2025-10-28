# NexoWatt EMS

---

## v0.3.3
**Fix:** Der LIVE-Button schaltet jetzt wieder korrekt zur Hauptseite (Tabs werden beim Laden initialisiert).

### Deployment (static hosting)
1. Repository hochladen oder klonen.
2. Den Inhalt des `www/` Ordners auf einen Webserver legen (oder Live-Server/`serve` lokal starten).
3. `index.html` im Browser öffnen.

### Development (lokal)
- Mit einem beliebigen Static-Server im `www/`-Verzeichnis starten, z.B.:
  ```bash
  npx serve www
  # oder
  python -m http.server --directory www 5173
  ```



## v0.3.4
- Entfernt: Zwei Karten aus der Einstellungsseite (SoC-Badge / Update-Intervall) und das Über-Panel. 
  Durch leeren Settings-Bereich erscheinen sie auch nicht mehr unten auf der LIVE-Seite.
