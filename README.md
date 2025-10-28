
# ioBroker.nexowatt-vis

Responsive OpenEMS-ähnliches Dashboard in **NexoWatt**-Farben (grün/schwarz) als eigener ioBroker Adapter.
Alle Datenpunkte werden in den Adaptereinstellungen verknüpft. Der Adapter stellt ein kleines Web-UI bereit.

## Features
- LIVE-Ansicht mit Energie-Monitor (Ring), KPIs und Karten (Autarkie, Eigenverbrauch, Speicher, Netz, Produktion, Verbrauch, EVCS)
- Responsive Layout (Desktop, Tablet, Smartphone)
- Farben/Theme: NexoWatt (grün/schwarz)
- Serverseitige Events (SSE) für Echtzeit-Updates
- Admin5-JSON-Config mit `id`-Feldern zum direkten Verknüpfen der ioBroker States

## Installation (Dev)
```bash
# auf dem ioBroker Host
cd /opt/iobroker
# Ordner anlegen und Dateien hineinkopieren/zips entpacken
# anschließend:
iobroker add nexowatt-vis --host <hostname> --enabled true
# oder via Adapter-Admin: als benutzerdefinierten Adapter installieren
```

**Web UI**: `http://<host>:8188/` (Port in den Einstellungen änderbar).

## Konfiguration
Öffne die Instanz-Einstellungen und verknüpfe alle relevanten Datenpunkte:
- Autarkie %, Eigenverbrauch % (optional – wird bei Bedarf aus PV/Verbrauch hergeleitet)
- PV-/Produktion, Gesamtverbrauch
- Netzbezug/Einspeisung
- Speicher: Lade-/Entladeleistung, SoC
- Verbrauch EVCS / Sonstiges
- EVCS Status & letzte Ladung
- (optional) Netzfrequenz, Netzspannung

Einheit für Leistung (W / kW) kann gewählt werden.

## Datenfluss
Der Adapter abonniert die konfigurierten States (subscribeForeignStates) und pusht Änderungen via SSE an das Frontend.
Das UI nutzt eine SVG-Ringanzeige und Karten mit Progress-Bars.

## Hinweise
- Dies ist ein minimales, startfähiges Grundgerüst. Passen Sie Labels, zusätzliche Karten und Berechnungslogik nach Bedarf an.
- Für produktiven Einsatz empfehlen wir eine Code-Signierung, erweiterte Fehlerbehandlung und Tests.


## Installation über GitHub

1. Repository forken/klonen (oder deinen eigenen Repo-Namen verwenden):  
   `https://github.com/USER/iobroker.nexowatt-vis`

2. In ioBroker Admin **Adapter → GitHub-Icon** klicken, dann die URL deines Repos angeben
   (z. B. `https://github.com/USER/iobroker.nexowatt-vis`).

3. Instanz anlegen und unter **Einstellungen → Datenpunkte** die States auf deine IDs mappen.

### Direkt per Shell (optional)
```bash
cd /opt/iobroker
iobroker url "https://github.com/USER/iobroker.nexowatt-vis" --debug
iobroker add nexowatt-vis
```
