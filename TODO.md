# TODO

* Sonar cloud gate have failed need to work on code  (investigate fresh report after this push)

## Done — branch `fix-per-table-solve`

* [x] Fill missing values now populate declared STATE TABLE grids — properties computed by Fill Missing (h, s, v…) join as columns instead of only showing in the Solution window (`plots/stateTable.ts`: signature-based grouping by (tag, index)).
* [x] Robust time conversions — added `minute`, `week`, `ms/us/ns`, plurals and full names to `UnitRegistry` (+ tests).
* [x] Supported unit list + built-in constants reference in Help — new `GET /api/reference` (`ReferenceController`) sourced live from `UnitRegistry`/`ConstantsRegistry`, rendered as a filterable table in the Help "Units & Consistency" section.
* [x] Universal constant library — EES `#`-suffix constants (`pi#`, `e#`, `R#`, `g#`, `Na#`, `k#`, `h#`, `c#`, `sigma#`, `Gc#`, `qe#`) via new `ConstantsRegistry`; grammar `IDENT` accepts `#`; substituted at parse time with SI units. `pi` → `pi#` (no backward compatibility).
* [x] Save project to a user-chosen location — File System Access picker with download fallback (`project.ts` `saveProject`).
* [x] Diagram window has tiny margins (inset around the canvas group).
* [x] Diagram output element: configurable decimal places (per-element `decimals`, inspector NumberInput).
* [x] Diagram inspector no longer duplicates beside the diagram when focus leaves it (non-focused diagrams render no inspector).
* [x] Open project surfaces the first diagram in Run view on load.
* [x] Solutions window hidden by default — never auto-opens; opened only via the View menu / command palette.
* [x] STATE TABLE members must be numbered — a numberless/stateless declared variable (e.g. `xrefg`) now errors at Check/Solve instead of being silently dropped.

## Backlog / follow-ups

* Make each declared STATE TABLE a true multi-instance dock window (currently they share one Fluid States window).
* Make `generateCyclePath` fluid-aware per block (cycle overlay still uses a single detected fluid).

## Future Implementation Ideas, It is not going to implemented now

* REPL and terminal screen
* Change Solutions window Matlab like Variable window.
