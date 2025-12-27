# GNOME App Picker Sorter - Technical Specification

## Goal

A minimal GNOME Shell extension to sort the app grid:
1. **Alphabetically** (A-Z)
2. **By usage frequency** (most used first)

## Core Architecture

### Files
```
gnome-app-picker-sorter@uuid/
├── extension.js       # All extension logic (~150 lines)
├── prefs.js          # Settings UI (~50 lines)
├── metadata.json
└── schemas/
    └── org.gnome.shell.extensions.app-picker-sorter.gschema.xml
```

### Key Insight: Use Official APIs

**Shell.AppUsage** - Official, documented API for app usage tracking:
- `Shell.AppUsage.get_default()` - Get singleton
- `appUsage.compare(id_a, id_b)` - Compare two apps by frequency
- `appUsage.get_most_used()` - Get most used apps

No custom tracking needed. GNOME already does this.

---

## Implementation

### extension.js

```javascript
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as AppDisplay from 'resource:///org/gnome/shell/ui/appDisplay.js';
import {Extension, InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';
import {QuickMenuToggle, SystemIndicator} from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const SorterToggle = GObject.registerClass(
class SorterToggle extends QuickMenuToggle {
  _init(extension) {
    super._init({
      title: 'App Sort',
      iconName: 'view-sort-ascending-symbolic',
      toggleMode: false,
    });

    this._extension = extension;
    this._settings = extension.getSettings();
    this._injectionManager = new InjectionManager();
    this._appUsage = Shell.AppUsage.get_default();
    this._appDisplay = Main.overview._overview._controls._appDisplay;

    // Menu items
    this._addMenuItem('Sort A-Z', 'alphabetical');
    this._addMenuItem('Sort by Usage', 'usage');
    this._addMenuItem('Manual', 'manual');
    
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    
    const prefsItem = new PopupMenu.PopupMenuItem('Settings…');
    prefsItem.connect('activate', () => {
      Main.extensionManager.openExtensionPrefs(this._extension.metadata.uuid, '', null);
    });
    this.menu.addMenuItem(prefsItem);

    this._patchCompareItems();
  }

  _addMenuItem(label, mode) {
    const item = new PopupMenu.PopupMenuItem(label);
    item.connect('activate', () => {
      this._settings.set_string('sort-mode', mode);
      this._reorder();
    });
    this.menu.addMenuItem(item);
  }

  _patchCompareItems() {
    const settings = this._settings;
    const appUsage = this._appUsage;

    this._injectionManager.overrideMethod(
      AppDisplay.AppDisplay.prototype,
      '_compareItems',
      () => {
        return function(a, b) {
          const mode = settings.get_string('sort-mode');
          
          if (mode === 'alphabetical') {
            return a.name.localeCompare(b.name);
          }
          
          if (mode === 'usage') {
            return appUsage.compare(a.id, b.id);
          }
          
          return 0; // manual - preserve order
        };
      }
    );
  }

  _reorder() {
    if (!this._appDisplay._pageManager?._updatingPages) {
      this._appDisplay._redisplay();
    }
  }

  destroy() {
    this._injectionManager.clear();
    super.destroy();
  }
});

const SorterIndicator = GObject.registerClass(
class SorterIndicator extends SystemIndicator {
  _init(extension) {
    super._init();
    this._toggle = new SorterToggle(extension);
    this.quickSettingsItems.push(this._toggle);
  }

  destroy() {
    this._toggle.destroy();
    super.destroy();
  }
});

export default class AppPickerSorterExtension extends Extension {
  enable() {
    this._indicator = new SorterIndicator(this);
    Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
  }

  disable() {
    this._indicator?.destroy();
    this._indicator = null;
  }
}
```

### schemas/org.gnome.shell.extensions.app-picker-sorter.gschema.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<schemalist>
  <schema id="org.gnome.shell.extensions.app-picker-sorter"
          path="/org/gnome/shell/extensions/app-picker-sorter/">
    <key name="sort-mode" type="s">
      <default>'manual'</default>
      <summary>Sort mode</summary>
      <description>How to sort: manual, alphabetical, usage</description>
    </key>
  </schema>
</schemalist>
```

### prefs.js

```javascript
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class AppPickerSorterPrefs extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();

    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup({ title: 'Sort Mode' });

    const row = new Adw.ComboRow({
      title: 'Sort applications by',
      model: new Gtk.StringList({ strings: ['Manual', 'Alphabetical', 'Usage Frequency'] }),
    });

    const modes = ['manual', 'alphabetical', 'usage'];
    row.selected = modes.indexOf(settings.get_string('sort-mode'));
    row.connect('notify::selected', () => {
      settings.set_string('sort-mode', modes[row.selected]);
    });

    group.add(row);
    page.add(group);
    window.add(page);
  }
}
```

### metadata.json

```json
{
  "uuid": "app-picker-sorter@example.com",
  "name": "App Picker Sorter",
  "description": "Sort app grid alphabetically or by usage",
  "shell-version": ["45", "46", "47", "48"],
  "settings-schema": "org.gnome.shell.extensions.app-picker-sorter",
  "url": "https://github.com/example/app-picker-sorter"
}
```

---

## How It Works

1. **User clicks Quick Settings menu** → selects sort mode
2. **Extension patches `_compareItems`** → GNOME's sort function
3. **Calls `_redisplay()`** → grid reorders using patched comparator
4. **For usage sort**: Uses `Shell.AppUsage.compare()` directly

That's it. No custom tracking, no file storage, no complexity.

---

## Why This Works

| Feature | Implementation |
|---------|---------------|
| Alphabetical | `a.name.localeCompare(b.name)` |
| Usage frequency | `Shell.AppUsage.compare(a.id, b.id)` |
| Manual | `return 0` (preserve existing order) |
| UI | Quick Settings menu (3 clicks) |
| Persistence | GSettings (automatic) |

---

## What We Removed

- ❌ Custom usage tracking (AppTracker class) → Use Shell.AppUsage
- ❌ File-based storage → Not needed
- ❌ Complex event listeners → Just patch and redisplay
- ❌ Folder sorting options → Keep it simple (future enhancement)
- ❌ Keyboard shortcuts → Future enhancement
- ❌ Multiple phases → Ship everything at once

---

## Build & Install

```bash
# Package
gnome-extensions pack app-picker-sorter@example.com

# Install
gnome-extensions install app-picker-sorter@example.com.shell-extension.zip --force

# Enable
gnome-extensions enable app-picker-sorter@example.com

# Restart shell (X11) or log out/in (Wayland)
```

---

## Testing

```bash
# View logs
journalctl -f /usr/bin/gnome-shell | grep -i sort

# Check current mode
gsettings get org.gnome.shell.extensions.app-picker-sorter sort-mode

# Set mode via CLI
gsettings set org.gnome.shell.extensions.app-picker-sorter sort-mode 'alphabetical'
```

---

## Future Enhancements (v2.0)

1. Sort folder contents
2. Folder position options (start/end/mixed)
3. Keyboard shortcuts
4. Sort by recently added (desktop file date)

---

## References

- [Shell.AppUsage API](https://gnome.pages.gitlab.gnome.org/gnome-shell/shell/class.AppUsage.html)
- [GNOME Extensions Guide](https://gjs.guide/extensions/)
- [Alphabetical App Grid](https://github.com/stuarthayhurst/alphabetical-grid-extension) (prior art)
- [App Grid Wizard](https://github.com/MahdiMirzadeh/app-grid-wizard) (Quick Settings pattern)
