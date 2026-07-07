#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_HOME="$SDK"
export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
export PATH="${BUN_INSTALL:-$HOME/.bun}/bin:$JAVA_HOME/bin:$SDK/platform-tools:$SDK/emulator:$PATH"
ADB="$SDK/platform-tools/adb"
BUN="${BUN_INSTALL:-$HOME/.bun}/bin/bun"
PACKAGE="app.techtactoe.draft"
MAIN_ACTIVITY="${PACKAGE}/.MainActivity"
APK="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"

if [[ ! -x "$ADB" ]]; then
  echo "adb bulunamadı: $ADB"
  exit 1
fi

if [[ ! -x "$BUN" ]]; then
  echo "bun bulunamadı: $BUN"
  exit 1
fi

serials=()
models=()
labels=()

while IFS= read -r line; do
  [[ -z "$line" ]] && continue

  serial=$(echo "$line" | awk '{print $1}')
  model=$(echo "$line" | sed -n 's/.*model:\([^ ]*\).*/\1/p')
  product=$(echo "$line" | sed -n 's/.*product:\([^ ]*\).*/\1/p')
  [[ -z "$model" ]] && model="Device_${serial:0:8}"
  [[ -z "$product" ]] && product="?"

  serials+=("$serial")
  models+=("$model")
  labels+=("$model ($product)")
done < <("$ADB" devices -l | awk 'NR>1 && $2=="device" {print}')

if [[ ${#serials[@]} -eq 0 ]]; then
  echo "Bağlı Android cihaz yok."
  exit 1
fi

echo ""
echo "${#serials[@]} cihazda başlatılıyor:"
for i in "${!serials[@]}"; do
  printf "  • %s  —  %s\n" "${labels[$i]}" "${serials[$i]}"
done
echo ""

cd "$ROOT"

if [[ -f "$ROOT/android/gradlew" ]]; then
  (cd "$ROOT/android" && ./gradlew --stop >/dev/null 2>&1) || true
fi

first_serial="${serials[0]}"
first_model="${models[0]}"
echo "► Derleme ve APK oluşturma (${labels[0]})..."
export ANDROID_SERIAL="$first_serial"
"$BUN" x expo run:android --device "$first_model" --no-bundler

if [[ ! -f "$APK" ]]; then
  echo "APK bulunamadı: $APK"
  exit 1
fi

if [[ ${#serials[@]} -gt 1 ]]; then
  echo ""
  echo "► Diğer cihazlara yükleme..."
  for i in "${!serials[@]}"; do
    [[ "$i" -eq 0 ]] && continue
    serial="${serials[$i]}"
    label="${labels[$i]}"
    echo "   $label"
    "$ADB" -s "$serial" install -r "$APK" >/dev/null
  done
fi

echo ""
echo "► Metro başlatılıyor..."
"$BUN" x expo start --dev-client --lan &
METRO_PID=$!

cleanup() {
  kill "$METRO_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Metro'nun ayağa kalkması için kısa bekleme
sleep 5

LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
DEV_URL="exp+draft://expo-development-client/?url=http%3A%2F%2F${LAN_IP}%3A8081"

echo ""
echo "► Uygulamalar açılıyor (Metro: http://${LAN_IP}:8081)..."
for i in "${!serials[@]}"; do
  serial="${serials[$i]}"
  label="${labels[$i]}"
  echo "   $label"
  "$ADB" -s "$serial" shell am start -a android.intent.action.VIEW -d "$DEV_URL" "$PACKAGE" >/dev/null
done

echo ""
echo "Tüm cihazlarda uygulama başlatıldı. Metro çalışıyor (Ctrl+C ile kapat)."
wait "$METRO_PID"