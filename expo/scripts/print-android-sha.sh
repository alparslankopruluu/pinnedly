#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Debug keystore (android/app/debug.keystore) ==="
if [[ -f android/app/debug.keystore ]]; then
  keytool -list -v \
    -keystore android/app/debug.keystore \
    -alias androiddebugkey \
    -storepass android \
    -keypass android 2>/dev/null | grep -E "SHA1|SHA256"
else
  echo "Not found (run: npx expo prebuild)"
fi

echo ""
echo "=== Release keystore (release.keystore) ==="
if [[ -f release.keystore && -f credentials.json ]]; then
  PASS=$(node -e "console.log(require('./credentials.json').android.keystore.keystorePassword)")
  ALIAS=$(node -e "console.log(require('./credentials.json').android.keystore.keyAlias)")
  keytool -list -v \
    -keystore release.keystore \
    -alias "$ALIAS" \
    -storepass "$PASS" 2>/dev/null | grep -E "SHA1|SHA256"
else
  echo "release.keystore or credentials.json missing"
fi

echo ""
echo "Add all SHA-1 values to Firebase → Project settings → Android app → SHA certificate fingerprints."