# App Grid Sorter

A minimal GNOME Shell extension to sort app grid.

![screenshot1.png](misc/screenshot1.png)

## Features

- **Sort A-Z** - Alphabetical order
- **Sort by Usage** - Most used apps first (uses GNOME's built-in tracking)
- **Sort by Last Update** - Apps sorted by installation/last modified date (newest first)
- **Manual** - Default drag-and-drop behavior
- **Quick Settings Toggle** - Access sort modes directly from Quick Settings
- **Settings Panel** - Full preferences window for customization
- **Toggle Quick Settings** - Option to hide Quick Settings integration

## Installation

```bash
gnome-extensions install app-grid-sorter@pantas.net.shell-extension.zip
gnome-extensions enable app-grid-sorter@pantas.net
```

Then log out and back in (Wayland) or press Alt+F2 → `r` (X11).

## Usage

**Via Quick Settings:**
1. Open Quick Settings (click top-right corner)
2. Click "App Sort"
3. Choose: Sort A-Z, Sort by Usage, Sort by Last Update, or Manual
4. Click "Settings…" to open preferences

**Via Settings:**
1. Open Extensions app
2. Find "App Grid Sorter"
3. Click the gear icon
4. Choose sort mode and toggle Quick Settings visibility

## How It Works

- Patches GNOME Shell's `_compareItems` and `_redisplay` functions
- Uses official `Shell.AppUsage` API for usage tracking (no custom tracking needed)
- Checks desktop file modification times for date-added sorting
- Quick Settings integration with SystemIndicator for easy access
- ~250 lines of code total

## Requirements

- GNOME Shell 45, 46, 47, or 48

## Development

See [SPEC.md](SPEC.md) for technical details.

```bash
# View logs
journalctl -f /usr/bin/gnome-shell | grep -i sort

# Set mode via CLI
gsettings set org.gnome.shell.extensions.app-grid-sorter sort-mode 'alphabetical'
gsettings set org.gnome.shell.extensions.app-grid-sorter sort-mode 'usage'
gsettings set org.gnome.shell.extensions.app-grid-sorter sort-mode 'date-added'
gsettings set org.gnome.shell.extensions.app-grid-sorter sort-mode 'manual'

# Toggle Quick Settings visibility
gsettings set org.gnome.shell.extensions.app-grid-sorter show-in-quick-settings true
```

## Credits

Inspired by:
- [Alphabetical App Grid](https://github.com/stuarthayhurst/alphabetical-grid-extension)
- [App Grid Wizard](https://github.com/MahdiMirzadeh/app-grid-wizard)

## License

GPL-3.0
