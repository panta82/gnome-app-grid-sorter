import GObject from 'gi://GObject';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as AppDisplay from 'resource:///org/gnome/shell/ui/appDisplay.js';
import * as OverviewControls from 'resource:///org/gnome/shell/ui/overviewControls.js';
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
      this._menuItems = new Map();

      const Controls = Main.overview._overview._controls;
      this._appDisplay = Controls._appDisplay;

      this._addMenuItem('Sort A-Z', 'alphabetical');
      this._addMenuItem('Sort by Usage', 'usage');
      this._addMenuItem('Sort by Last Update', 'date-added');
      this._addMenuItem('Manual', 'manual');

      this._updateActiveItem();
      
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      
      const prefsItem = new PopupMenu.PopupMenuItem('Settings…');
      prefsItem.connect('activate', () => {
        Main.extensionManager.openExtensionPrefs(this._extension.metadata.uuid, '', null);
      });
      this.menu.addMenuItem(prefsItem);

      this._patchCompareItems();
      this._connectListeners();
    }

    _getDesktopFileMtime(appId) {
      const dirs = [
        GLib.get_home_dir() + '/.local/share/applications',
        '/var/lib/snapd/desktop/applications',
        '/usr/share/applications',
        '/usr/local/share/applications'
      ];

      for (const dir of dirs) {
        const path = dir + '/' + appId;
        if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
          try {
            const file = Gio.File.new_for_path(path);
            const info = file.query_info('time::modified', Gio.FileQueryInfoFlags.NONE, null);
            const mtime = info.get_modification_time().tv_sec;
            const mtimeMs = mtime * 1000;
            log(`[AppGridSorter] ${appId}: ${path} -> mtime=${mtime} (${new Date(mtimeMs).toISOString()})`);
            return mtime;
          } catch (e) {
            log(`[AppGridSorter] Error reading ${path}: ${e.message}`);
          }
        }
      }

      log(`[AppGridSorter] ${appId}: Not found in any directory, returning 0`);
      return 0;
    }

    _addMenuItem(label, mode) {
      const item = new PopupMenu.PopupMenuItem(label);
      item.connect('activate', () => {
        this._settings.set_string('sort-mode', mode);
        this._updateActiveItem();
        this._resort();
      });
      this.menu.addMenuItem(item);
      this._menuItems.set(mode, item);
    }

    _updateActiveItem() {
      const currentMode = this._settings.get_string('sort-mode');
      this._menuItems.forEach((item, mode) => {
        if (mode === currentMode) {
          item.setOrnament(PopupMenu.Ornament.CHECK);
        } else {
          item.setOrnament(PopupMenu.Ornament.NONE);
        }
      });
    }

    _patchCompareItems() {
      const settings = this._settings;
      const appUsage = this._appUsage;
      const getDesktopFileMtime = this._getDesktopFileMtime.bind(this);

      this._injectionManager.overrideMethod(
        AppDisplay.AppDisplay.prototype,
        '_compareItems',
        () => {
          return function(a, b) {
            const mode = settings.get_string('sort-mode');
            log(`[AppGridSorter] _compareItems called with mode=${mode}, a.name=${a.name}, b.name=${b.name}`);

            try {
              if (mode === 'alphabetical') {
                if (!a.name || !b.name) return 0;
                return a.name.localeCompare(b.name);
              }

              if (mode === 'usage') {
                if (!a.id || !b.id) return 0;
                const result = appUsage.compare(a.id, b.id);
                return result;
              }

              if (mode === 'date-added') {
                log(`[AppGridSorter] DATE-ADDED BRANCH: Comparing by date`);
                if (!a.id || !b.id) {
                  log(`[AppGridSorter] DATE-ADDED: Missing id - a.id=${a.id}, b.id=${b.id}`);
                  return 0;
                }
                const aTime = getDesktopFileMtime(a.id);
                const bTime = getDesktopFileMtime(b.id);
                const result = bTime - aTime;
                log(`[AppGridSorter] DATE-ADDED: Compare ${a.name} (${a.id}, mtime=${aTime}) vs ${b.name} (${b.id}, mtime=${bTime}) -> ${result}`);
                return result;
              }
            } catch (e) {
              log(`[AppGridSorter] Error in comparison: ${e}`);
            }

            log(`[AppGridSorter] Returning 0 for mode=${mode}`);
            return 0;
          };
        }
      );

      this._injectionManager.overrideMethod(
        AppDisplay.AppDisplay.prototype,
        '_redisplay',
        () => {
          return function() {
            const mode = settings.get_string('sort-mode');
            const shouldSort = mode !== 'manual';

            let currentApps = this._orderedItems.slice();
            let currentAppIds = currentApps.map(icon => icon.id);

            let newApps = this._loadApps();
            if (shouldSort) {
              newApps = newApps.sort(this._compareItems.bind(this));
            }
            let newAppIds = newApps.map(icon => icon.id);

            let addedApps = newApps.filter(icon => !currentAppIds.includes(icon.id));
            let removedApps = currentApps.filter(icon => !newAppIds.includes(icon.id));

            removedApps.forEach((icon) => {
              this._removeItem(icon);
              icon.destroy();
            });

            const {itemsPerPage} = this._grid;
            newApps.forEach((icon, i) => {
              const page = Math.floor(i / itemsPerPage);
              const position = i % itemsPerPage;

              if (addedApps.includes(icon)) {
                this._addItem(icon, page, position);
              } else {
                this._moveItem(icon, page, position);
              }
            });

            this._orderedItems = newApps;
            this.emit('view-loaded');
          };
        }
      );
    }

    _resort() {
      if (!this._appDisplay) return;

      log(`[AppGridSorter] _resort called, mode=${this._settings.get_string('sort-mode')}`);

      if (!this._appDisplay._pageManager?._updatingPages) {
        log(`[AppGridSorter] Calling _redisplay`);
        this._appDisplay._redisplay();
      } else {
        log(`[AppGridSorter] Skipping _redisplay - pageManager is updating`);
      }
    }

    _connectListeners() {
      this._settingsHandler = this._settings.connect('changed::sort-mode', () => {
        this._updateActiveItem();
        this._resort();
      });
    }

    destroy() {
      this._settings.disconnect(this._settingsHandler);
      this._injectionManager.clear();
      super.destroy();
    }
  }
);

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
  }
);

export default class AppPickerSorterExtension extends Extension {
  enable() {
    log('[AppGridSorter] Extension enabled');
    this._settings = this.getSettings();

    if (this._settings.get_boolean('show-in-quick-settings')) {
      this._showIndicator();
    }

    this._settingsHandler = this._settings.connect('changed::show-in-quick-settings', () => {
      if (this._settings.get_boolean('show-in-quick-settings')) {
        this._showIndicator();
      } else {
        this._hideIndicator();
      }
    });
  }

  _showIndicator() {
    if (!this._indicator) {
      this._indicator = new SorterIndicator(this);
      Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
    }
  }

  _hideIndicator() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
  }

  disable() {
    if (this._settingsHandler) {
      this._settings.disconnect(this._settingsHandler);
    }
    this._hideIndicator();
    this._settings = null;
  }
}
