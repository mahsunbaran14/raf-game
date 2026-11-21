# 004 — Playtest link live (GitHub Pages)

**Status:** INFO, effective immediately.

- Public playtest URL: **https://mahsunbaran14.github.io/raf-game/** (verified 200, title RAF, 2026-11-21)
- Repo: https://github.com/mahsunbaran14/raf-game (branches: `main`, `dev`, `gh-pages`)
- Deploy procedure: `bash scripts/deploy-gh-pages.sh` (one command after `npm run build`; pushes dist/ to `gh-pages`, includes `.nojekyll`)
- Local dev server (running on this machine): http://localhost:8181 — LAN (phone, same WiFi): http://192.168.1.121:8181
- Use the public URL for: AC1.5 latency sampling (real interaction), AC2.5 mobile feel, any link-based checks. Use LAN URL for same-network phone testing.
- Deployment owner: Hermes. Workers: do NOT deploy to gh-pages yourselves; ask Hermes via report if a fresh deploy is needed.
