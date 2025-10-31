# ioBroker.nexowatt-vis (0.3.14)

## What’s new
- Server-side installer password check (no bypass by clicking OK/Cancel)
- Installer panel is hidden unless a valid token is present.
- If password is empty, access is **blocked** by default for safety.
- Creates states for `Einstellungen` and `Installateur` on first start:
  - Boolean: `settings.switchA`, `settings.switchB`, `installer.switchA`, `installer.switchB`
  - Number 1–2: `settings.slider1`, `settings.slider2`, `installer.slider1`, `installer.slider2`

## Setup
1. Install the adapter (from GitHub zip or local file).
2. Open adapter settings and set an **Installer Password** (stored encrypted).
3. Open UI: `http://<ioBrokerIP>:8188/` (port can be changed in settings).
4. Click **Installateur Login**, enter the password. On success, the **Installateur** card becomes visible.
