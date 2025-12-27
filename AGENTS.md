# AGENTS.md

## GNOME Shell Extension Development

### Shell Restart
```bash
killall -HUP gnome-shell
```

### Debugging
```bash
# View extension logs
journalctl --user -xeu gnome-shell -f

# Filter for extension
journalctl --user -r | grep -i extension-name

# Looking Glass (UI debugger)
# Press Alt+F2, type lg, press Enter
```

### Extension Locations
- Development: `/path/to/project/extension-uuid/`
- Installed: `~/.local/share/gnome-shell/extensions/extension-uuid/`

### Key GNOME APIs
- **Shell.AppUsage** - Official app usage tracking
  - `Shell.AppUsage.get_default()`
  - `appUsage.compare(id_a, id_b)` - Compare two apps by frequency

### App Grid Sorting
Override both methods on `AppDisplay.AppDisplay.prototype`:
1. **_compareItems** - Custom sort comparison function
2. **_redisplay** - Controls how apps are positioned when redisplayed

### Schema Management
```bash
# Compile schema
glib-compile-schemas ~/.local/share/gnome-shell/extensions/uuid/schemas/

# Install to system
glib-compile-schemas --targetdir=~/.local/share/glib-2.0/schemas schemas/
```

### Quick Settings Toggle Pattern
```javascript
const Toggle = GObject.registerClass(class Toggle extends QuickMenuToggle {
  _init(extension) {
    super._init({ title: 'Name', toggleMode: false });
    this._settings = extension.getSettings();
    // Add menu items
  }
});

const Indicator = GObject.registerClass(class Indicator extends SystemIndicator {
  _init(extension) {
    super._init();
    this.quickSettingsItems.push(new Toggle(extension));
  }
});
```

### Common Issues
- **Extension not appearing**: Restart shell
- **Schema errors**: Ensure gschemas.compiled exists
- **No logs**: Use `journalctl --user -xeu gnome-shell -f`
- **Extension state ERROR**: Check logs for schema or import errors

### Packaging
```bash
# Create zip
gnome-extensions pack extension-uuid/

# Install
gnome-extensions install extension-uuid.shell-extension.zip --force

# Enable
gnome-extensions enable extension-uuid
```
