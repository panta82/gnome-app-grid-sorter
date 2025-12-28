import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class AppPickerSorterPrefs extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();

    const page = new Adw.PreferencesPage();
    const group = new Adw.PreferencesGroup({ title: 'Sort Mode' });

    const row = new Adw.ComboRow({
      title: 'Sort applications by',
      model: Gtk.StringList.new(['Manual', 'Alphabetical', 'Usage', 'Last Update']),
    });

    const modes = ['manual', 'alphabetical', 'usage', 'date-added'];
    row.selected = modes.indexOf(settings.get_string('sort-mode'));
    row.connect('notify::selected', () => {
      settings.set_string('sort-mode', modes[row.selected]);
    });

    group.add(row);
    page.add(group);

    const uiGroup = new Adw.PreferencesGroup({ title: 'Interface' });

    const switchRow = new Adw.SwitchRow({
      title: 'Show in Quick Settings',
      subtitle: 'Add sort controls to Quick Settings menu',
    });
    switchRow.active = settings.get_boolean('show-in-quick-settings');
    switchRow.connect('notify::active', () => {
      settings.set_boolean('show-in-quick-settings', switchRow.active);
    });

    uiGroup.add(switchRow);
    page.add(uiGroup);
    window.add(page);
  }
}
