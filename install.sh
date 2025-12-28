#!/usr/bin/env bash
set -e

EXTENSION_UUID="app-grid-sorter@pantas.net"
SOURCE_DIR="${EXTENSION_UUID}"
BUILD_DIR="dist"
INSTALL_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_UUID"
ZIP_FILE="$BUILD_DIR/$EXTENSION_UUID.shell-extension.zip"
RESTART_SHELL="${1:-}"

if [ ! -f "$ZIP_FILE" ]; then
  echo "Extension zip not found. Building..."
  ./build.sh
fi

echo "Installing extension..."
mkdir -p "$INSTALL_DIR"
unzip -q -o "$ZIP_FILE" -d "$INSTALL_DIR"

echo "Compiling schemas..."
glib-compile-schemas "$INSTALL_DIR/schemas/"

echo "Enabling extension..."
gnome-extensions enable "$EXTENSION_UUID"

if [ "$RESTART_SHELL" = "--restart" ] || [ "$RESTART_SHELL" = "-r" ]; then
  echo "Restarting shell..."
  killall -HUP gnome-shell
fi

echo "Installation complete."
