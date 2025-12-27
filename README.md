# App Grid Sorter

A minimal GNOME Shell extension to sort app grid.

## Features

- **Sort A-Z** - Alphabetical order
- **Sort by Usage** - Most used apps first (uses GNOME's built-in tracking)
- **Manual** - Default drag-and-drop behavior

## Installation

```bash
gnome-extensions install app-grid-sorter@pantas.net.shell-extension.zip
gnome-extensions enable app-grid-sorter@pantas.net
```

Then log out and back in (Wayland) or press Alt+F2 → `r` (X11).

## Usage

1. Open Quick Settings (click top-right corner)
2. Click "App Sort" 
3. Choose: Sort A-Z, Sort by Usage, or Manual

## How It Works

- Patches GNOME Shell's `_compareItems` function
- Uses official `Shell.AppUsage` API for usage tracking (no custom tracking needed)
- ~100 lines of code total

## Requirements

- GNOME Shell 45, 46, 47, or 48

## Development

See [SPEC.md](SPEC.md) for technical details.

```bash
# View logs
journalctl -f /usr/bin/gnome-shell | grep -i sort

# Set mode via CLI
gsettings set org.gnome.shell.extensions.app-grid-sorter sort-mode 'alphabetical'
```

## Credits

Inspired by:
- [Alphabetical App Grid](https://github.com/stuarthayhurst/alphabetical-grid-extension)
- [App Grid Wizard](https://github.com/MahdiMirzadeh/app-grid-wizard)

## License

GPL-3.0
