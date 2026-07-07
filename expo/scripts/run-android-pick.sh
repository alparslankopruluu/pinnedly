#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_HOME="$SDK"
export JAVA_HOME="${JAVA_HOME:-/Applications/Android Studio.app/Contents/jbr/Contents/Home}"
export PATH="${BUN_INSTALL:-$HOME/.bun}/bin:$JAVA_HOME/bin:$SDK/platform-tools:$SDK/emulator:$PATH"
ADB="$SDK/platform-tools/adb"

if [[ ! -x "$ADB" ]]; then
  echo "adb bulunamadı: $ADB"
  exit 1
fi

BUN="${BUN_INSTALL:-$HOME/.bun}/bin/bun"

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
echo "Hangi cihazda başlatılsın?"
echo ""

for i in "${!serials[@]}"; do
  printf "  %d) %s  —  %s\n" "$((i + 1))" "${labels[$i]}" "${serials[$i]}"
done

echo ""

if [[ ${#serials[@]} -eq 1 ]]; then
  choice=1
  echo "Tek cihaz bulundu, otomatik seçildi."
else
  read -rp "Numara gir (1-${#serials[@]}): " choice
fi

if ! [[ "$choice" =~ ^[0-9]+$ ]] || (( choice < 1 || choice > ${#serials[@]} )); then
  echo "Geçersiz seçim."
  exit 1
fi

selected_serial="${serials[$((choice - 1))]}"
selected_model="${models[$((choice - 1))]}"
selected_label="${labels[$((choice - 1))]}"

echo ""
echo "Seçilen: $selected_label"
echo "Seri:    $selected_serial"
echo ""

if [[ ! -x "$BUN" ]]; then
  echo "bun bulunamadı: $BUN"
  exit 1
fi

cd "$ROOT"
export ANDROID_SERIAL="$selected_serial"
exec "$BUN" x expo run:android --device "$selected_model"