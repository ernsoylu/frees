# TODO

* If I use any of the constants, formatted view shoukd show the notation of that constant instead of value itself
* Sonar cloud gate have failed need to work on code  (investigate fresh report after this push)

## Done — branch `chemistry-rocket-library`

* [x] Periodic table (`PeriodicTable`) + chemical-formula parser (`ChemicalFormula`) — molar mass of any formula incl. parentheses (C8H18, Ca(OH)2, Al2(SO4)3).
* [x] `MolarMass(token)` implemented (was documented but missing) — resolves an ideal-gas species, a CoolProp fluid, or a chemical formula → kg/mol. Case-preserving (formula tokens travel as string args because `Expr.Call` lowercases its name).
* [x] Expanded `IdealGas` species: added OH, H, O, N, N2O and fuels C8H18, C12H26, CH3OH, C2H5OH (+ liquid-water formation enthalpy) with molar mass, formation enthalpy, entropy, cp(T).
* [x] `HeatingValue(fuel, 'LHV'|'HHV')` [J/kg] and `StoichAFR(fuel)` [-] (`Combustion`), built on formation enthalpies + formula molar masses.
* [x] Unit checker, Evaluator, LatexConverter and AstBuilder taught the new single-token chemistry calls; function catalog + Help reference updated.
* [x] Example: **Sounding Rocket to the Kármán Line** — CH4/LOX vehicle sized to loft a 10 kg payload to 100 km via an implicit mass/Δv solve (uses g#, R#, MolarMass, HeatingValue, units).

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
