# External design review — 2026-11-21 (via Mahsun, model "opus 5.5")

Source context: reviewer could NOT play the game (canvas drag unavailable to it); assessment is based on TWO SCREENSHOTS of the live build + the rules as described. So this is visual/structural feedback, not gameplay feel. Treat clarity/layout findings as high-confidence, feel findings as provisional.

Mahsun's own playtest note (same day, live build, desktop): drag is comfortable on PC; gameplay "not bad". No mobile note yet.

## Findings (verbatim substance, triaged)

### F1 — The 4+ clearing rule is invisible (HIGH)
Nothing on screen tells the player that 4+ same-color cells clear. Player places randomly at first. Triage: tutorial/onboarding gap. Proposed fix (reviewer): scripted, textless 3-move tutorial — first tray preset so a 4-group forms and clears in three moves shown by a ghost hand; then deliberately trigger a collapse and a clear-to-restore. Remove the "Drag a piece onto the rack" text. → Candidate for Sprint 3 UX (replaces/extends current 3-hint onboarding).

### F2 — Collapse is invisible; pressure not felt (HIGH)
Mechanic exists but the player can't see it coming. "An invisible threat creates no pressure — the player is first surprised, then feels cheated." Proposed fix: 4-segment placement counter around the rack; at 3/4 the cells about to collapse blink red / crack; on collapse: screen shake + low-frequency sound; on ring restore: bright celebration + "breath" sound. → New juice/UX work item; aligns with existing fx work. Add explicit AC (e.g. incoming-collapse warning visible >=1 placement ahead).

### F3 — Possible bug: collapse geometry inconsistent (VERIFY)
Screenshot shows top row + left column closed (8x8 -> 7x7 anchored bottom-right?), while the QA/description wording says "outer ring collapses" (which would imply 8x8 -> 6x6). Brief §2.3 spec says 8→7→6→5→4 (one ring = one row + one column). So: implementation matches the brief numbers, but the WORDING ("outer ring") contradicts the visual. ACTION: director must resolve — either (a) keep 8→7 semantics and rename/re-describe it honestly (e.g. "shelf edge closes") + make it read as intentional, or (b) switch to true full-ring 8→6 with retuned gates. Log the decision (005) with QA-note wording.

### F4 — UI labels (MEDIUM)
"Wave" and "Waste" sit side by side, same size/color, near-identical words; "Waste" meaning unguessable. → Rename (e.g. "Lost") or add tooltip; differentiate visually. Sprint 3, cheap.

### F5 — Game over screen improvements (HIGH, cheap)
- Show WHY the run ended (e.g. "the last collapse ate 3 of your cells").
- Near-miss moment: "40 points from your best".
- One-click instant restart, no animation delay — every extra second to restart loses players on CrazyGames.
- Ring-restore celebration is currently the game's best feeling; make it loud (see F2).
→ Fold into Sprint 3.

### F6 — Layout (MEDIUM)
- Tray at far right edge, ~470px from the rack — move next to / below the rack.
- Tray pieces drawn ~1/3 of their on-board size — show at >=60-70% of real size.
- Most of the screen is empty — tighten the composition.
→ Sprint 3 layout pass.

### F7 — Visual identity is forgettable (CRITICAL for CTR gate)
"Dark background, rounded flat squares, 8x8 grid — looks like Block Blast / Woodoku / 1010! clones; indistinguishable in CrazyGames thumbnails. The 'shelf' theme is visually absent — it's just a grid." Reviewer's direction: make the grid a REAL rack (wooden or metal shelves), pieces become products per color (jars, boxes, bottles), collapse becomes the shelf board breaking and falling. "Memorable and self-explains the mechanic." Keep the color+glyph pairing (praised as good for color-blind players). → This is exactly Sprint 4's identity work; treat the shelf-literal direction as the leading candidate. CTR is a launch gate after 2026-11-23 — identity quality is not cosmetic, it is the 4th KPI.

### F8 — Reviewer's offer
If we send a game-over screenshot or a short video, it will give sharper feedback on the restart flow.

## Director directives (binding)
1. Verify F3 and log decision 005 (semantics + honest wording) — do this first, it may affect generator gates.
2. Fold F1, F2, F4, F5, F6 into Sprint 3 scope with measurable ACs; F1+F2 are priority (clarity of core loop beats everything).
3. F7 becomes the Sprint 4 identity brief's leading direction; prepare 2 more identity candidates for contrast before committing.
4. Do not regress existing AC2.x work; build on it.
5. Report triage in the next sprint report.
