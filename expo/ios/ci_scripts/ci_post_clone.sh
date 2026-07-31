#!/bin/sh

set -eu

if [ -n "${CI_PRIMARY_REPOSITORY_PATH:-}" ]; then
  APP_DIR="${CI_PRIMARY_REPOSITORY_PATH}/expo"
else
  SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
  APP_DIR=$(CDPATH= cd -- "${SCRIPT_DIR}/../.." && pwd)
fi

if ! command -v node >/dev/null 2>&1; then
  export HOMEBREW_NO_AUTO_UPDATE=1
  brew install node
fi

cd "${APP_DIR}"
npm ci --legacy-peer-deps --no-audit --no-fund

cd ios
pod install --deployment
