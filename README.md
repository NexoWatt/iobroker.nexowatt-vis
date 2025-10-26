
# ioBroker.nexowatt-vis

Prototype built 2025-10-26.

This helper adapter mirrors the configured raw datapoints into normalized states and
ships an **Energy Flow Monitor** (SVG/HTML) for VIS 2 in NexoWatt colors.

## States (read-only)
- `nexowatt-vis.X.flow.pvPower` (W)
- `nexowatt-vis.X.flow.gridPower` (W; import > 0, export < 0)
- `nexowatt-vis.X.flow.housePower` (W)
- `nexowatt-vis.X.flow.batteryPower` (W; discharge > 0, charge < 0)
- `nexowatt-vis.X.battery.soc` (%)

## Admin settings
Map your source datapoints (object IDs) in the adapter settings. The adapter will
subscribe to them and mirror the values into the states above.

## VIS 2 Energy Flow
Open `www/energyflow.html` and copy/paste the markup into a VIS-2 **HTML widget**.
Adjust the instance in the script (`statePrefix = 'nexowatt-vis.0.'`) if required.

Logos are served at `/adapter/nexowatt-vis/admin.png` and `/adapter/nexowatt-vis/admin_logo_.ico`.
