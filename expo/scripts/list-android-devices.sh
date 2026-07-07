#!/usr/bin/env bash
set -euo pipefail

SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="$SDK/platform-tools/adb"

if [[ ! -x "$ADB" ]]; then
  echo "adb bulunamadı: $ADB"
  echo "Android Studio SDK kurulu mu? ANDROID_HOME doğru mu?"
  exit 1
fi

count=0

echo ""
echo "Bağlı Android cihazlar:"
echo ""

while IFS= read -r line; do
  [[ -z "$line" ]] && continue

  serial=$(echo "$line" | awk '{print $1}')
  model=$(echo "$line" | sed -n 's/.*model:\([^ ]*\).*/\1/p')
  product=$(echo "$line" | sed -n 's/.*product:\([^ ]*\).*/\1/p')
  [[ -z "$model" ]] && model="?"
  [[ -z "$product" ]] && product="?"

  count=$((count + 1))
  printf "  %d) %s  —  %s\n" "$count" "$model ($product)" "$serial"
done < <("$ADB" devices -l | awk 'NR>1 && $2=="device" {print}')

echo ""

if [[ "$count" -eq 0 ]]; then
  echo "Bağlı cihaz yok. Android Studio'da cihazı bağla, sonra tekrar dene."
  exit 1
fi