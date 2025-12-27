import GObject from 'gi://GObject';
import Shell from 'gi://Shell';
import GLib from 'gi://GLib';
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
      
      const Controls = Main.overview._overview._controls;
      this._appDisplay = Controls._appDisplay;

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
        this._resort();
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
            } catch (e) {
            }
            
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
      
      if (!this._appDisplay._pageManager?._updatingPages) {
        this._appDisplay._redisplay();
      }
    }

    destroy() {
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
    this._indicator = new SorterIndicator(this);
    Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
  }

  disable() {
    this._indicator?.destroy();
    this._indicator = null;
  }
}
