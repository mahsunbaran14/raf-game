# 001 — Scope acceptance (BRIEF v2)

**Date:** 2026-11-21
**Status:** ACCEPTED (director; §12 step 1)

## Decision
BRIEF v2 (brief.md) is accepted as the single source of truth. Sprint 1 scope = §12 steps 1-8: decision log, repo skeleton, W1 sim, W3 generator/bot/CI, W4 telemetry, W2 renderer, engine measurement (5.1), AC1.1-AC1.8 evidence table.

## Rationale
§0: this document is the only valid context. §9.1 defines workstreams W1-W4 with the §5.3 data contract enabling parallel work.

## Assumptions carried (§10)
A1-A8 accepted as ASSUMPTIONs, each with its falsifying measurement and remediation branch. Key gates: A1/A2 tested by the day-3 kill gate (§8); A4 by the bot gate (§5.4); A7-A8 by live data.

## Binding constraints recorded
- Engine PixiJS 8 + Vite, plain JS ES modules, no TS/framework (§5.1, §5.2).
- All game constants in src/config/tuning.js (§2.7); lint-enforced.
- step() pure: no DOM/Pixi imports; randomness only via mulberry32(seed) (§5.3).
- Game-facing text English, single strings file (§5.2).
- v1 out-of-scope list (§3) is final; rewarded/2P/leaderboard/IAP excluded.

## Numbers
35 days to Basic Launch (gate-promise, not date-promise). Session KPI >=10 min, D1 >=10%, conversion >=80%, CTR gate (post-2026-11-23 launch).
