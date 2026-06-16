# TODO

## Done — branch `workspace-ui-fixes` (merged to main)

* [x] Right sidebar / Inspector accent recolored to the app theme (primary color → **teal**).
* [x] Spotlight now actually opens apps via the dock instead of only highlighting a tab.
* [x] Spotlight "Create" actions: add parametric table, graph (X-Y), property graph, psychrometric graph, diagram.
* [x] Reset Layout no longer drops the left-bar instance counts (badges reflect existing instances).
* [x] Parametric-table column units appear on X-Y graph axes, with a **Show units** toggle.
* [x] Diagram inspector: removed "Save JSON"; "Export" shows only in Run mode.
* [x] Dock window tabs show an instance-type icon (recognizable when the title is clipped).
* [x] Graphs are size-aware — a ResizeObserver refits the Plotly chart to its tile.

## Done — branch `state-table-blocks`

* [x] Explicit, fluid-aware `STATE TABLE name(vars...) ... FLUID = X ... END` blocks.
  * Grammar: new `STATETABLE` lexer token (matches `STATE TABLE` as one token so a lone `state` variable still parses), `stateTableDef` / `stateTableAttr` rules.
  * Backend: `ast/StateTableDef`, `AstBuilder`, `EquationParser.ParseResult`, `SolveController` `StateTableDto` in Solve/Check responses.
  * **Fluid-aware grouping**: when STATE TABLE blocks are declared, missing-property resolution groups each block's declared variables separately and uses that block's fluid — so a Water circuit's `P1` and an R134a circuit's `P1` no longer collide. Variable names parse as `<prop><circuit-tag><index>` (e.g. `Pw_1`, `Pref_1`). Falls back to the legacy implicit detection when no blocks are declared.
  * Tests: `StateTableParseTest` (multi-circuit parsing, fluid attribute, `state` identifier safety).
* [x] Fluid State tables appear in the left **Tables** instances menu (tagged by fluid), opening the Fluid States window.
* [x] Fluid States window renders one labelled, fluid-aware table per declared circuit (falls back to the single implicit table otherwise).
* [x] Property & psychrometric plot config: a "State table (circuit)" selector overlays just that circuit's states; for property plots it also adopts the circuit's fluid.

## Backlog / follow-ups

* Make each declared STATE TABLE a true multi-instance dock window (currently they share one Fluid States window).
* Make `generateCyclePath` fluid-aware per block (cycle overlay still uses a single detected fluid).
* State variables without a trailing index (e.g. `xrefg`) are not placed into a state row — decide on a convention.
