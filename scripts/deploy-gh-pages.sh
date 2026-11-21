#!/usr/bin/env bash
# Deploy the current dist/ build to GitHub Pages (gh-pages branch).
# Usage: bash scripts/deploy-gh-pages.sh
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f dist/index.html ]; then
  echo "dist/index.html yok — önce 'npm run build' çalıştır." >&2
  exit 1
fi
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
cp -r dist/* "$TMP"/
touch "$TMP/.nojekyll"
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="${GIT_NAME:-debius}" -c user.email="${GIT_EMAIL:-hezarhezar58@gmail.com}" commit -qm "deploy: RAF build $(date -u +%Y-%m-%dT%H:%MZ)"
git remote add origin git@github.com:mahsunbaran14/raf-game.git
git push -qf origin gh-pages
echo "OK: https://mahsunbaran14.github.io/raf-game/"
