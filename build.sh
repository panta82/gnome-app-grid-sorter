#!/usr/bin/env bash
set -e

EXTENSION_UUID="app-grid-sorter@pantas.net"
SOURCE_DIR="${EXTENSION_UUID}"
BUILD_DIR="dist"

mkdir -p "$BUILD_DIR"

echo "Building extension..."
gnome-extensions pack --force "$SOURCE_DIR" --out-dir="$BUILD_DIR"

echo "Build complete: $BUILD_DIR/$EXTENSION_UUID.shell-extension.zip"
