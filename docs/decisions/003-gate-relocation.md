# 003 — Kill-gate relocation: §8 human gate → Basic Launch KPIs

**Date:** 2026-11-21
**Status:** ACCEPTED (binding directive from Mahsun)

## Decision
The §8 day-3 human kill gate is CANCELLED and relocated: the kill gate is now the CrazyGames Basic Launch KPIs after QA pass — average session >=10 min AND D1 >=10% AND conversion >=80%, within the 7-day AND >=500-plays window (§4.4). CTR remains a gate (post-2026-11-23 launch, §4.4). Sprint 2 starts immediately at full speed; no content work is blocked.

## Reasoning
External playtesters are not available (n=0, recruitment impossible — Mahsun, binding). The §8 protocol requires min 12 participants; it cannot run. Basic Launch provides real-player measurement at scale the §8 protocol never could (>=500 plays vs n=12-20), replacing the gate's purpose: whether the core makes people chain runs. Cost accepted: we lose the cheap early kill and build Sprint 2 juice before any human signal; if Basic Launch fails the KPI gate, §10's iteration/stop rules apply instead of §8's retry/stop.

## §10 falsification-path updates
- **A2** ("the pressure is fun, a second run is wanted"): falsifier changes from "G1 second-run rate <50%" to "Basic Launch: avg session <10 min OR D1 <10% OR conversion <80%". Remediation: 1 iteration (cover + first 30 s), re-measure; still below → stop + report (mirrors §5.3/AC5.3 path).
- **A1** (5-8 min runs): now falsified only by live data (CG panel session/run duration + voluntary local-log export); no §8 G1 observation.
- Human-taste ACs with n=0 availability are re-marked: AC1.3 N/A-human; AC2.3 (first-clear median, 5 people) N/A-human — post-launch observation via telemetry.

## Hosting
Hermes deploys to GitHub Pages (mahsunbaran14); link pending, not blocking.
