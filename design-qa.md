# Design QA — two-card mobile home

Reference: user-provided mobile mockup with two side-by-side ADJ/RTC cards.

## Result

PASS — no open P0, P1, or P2 issues.

## Checks

- [x] Home contains exactly two primary cards in one two-column grid.
- [x] ADJ and RTC use distinct production WebP illustrations.
- [x] Existing `pickMode('ADJ')` and `pickMode('RTC')` entry points are preserved.
- [x] Thai and English labels, line capacities, and accessible card labels are present.
- [x] Green is used for the primary card action and capacity emphasis.
- [x] Both columns use `minmax(0, 1fr)` and have a small-screen rule at 360 px.
- [x] Employee identity and a compact “change employee” action remain available without adding a third card.
- [x] Existing `empInfo` and `masterInfo` nodes remain available to the current JavaScript.
- [x] No scanner, Firebase, offline queue, document, or desktop export logic was changed.
- [x] HTML/CSS passes `git diff --check`; both image assets resolve in the branch.

## Preview note

The cloud browser cannot load the workspace-local preview URL in this environment. Visual comparison used the supplied target plus direct inspection of both production assets, and runtime risk was checked at the existing DOM/JavaScript integration points.
