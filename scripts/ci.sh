#!/usr/bin/env bash
# CI: build + boyut + relative path + sabit lint + testler + üretim kapıları (brief §5.4, AC0.2)
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
node scripts/check-paths.mjs
node scripts/check-size.mjs
node scripts/check-constants.mjs
npm test
node tools/gate-core.mjs
node tools/gate-daily.mjs
echo "CI: ALL GREEN"
