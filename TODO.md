# TODO

## Done — branch `workspace-ui-fixes`

* [x] Right sidebar / Inspector accent recolored to the app theme (primary color → **teal**; removed hardcoded blue chrome).
* [x] Spotlight now actually opens apps (Editor, Tables, Plots, Fluid States, Digitizer, Diagram, Solution, Inspector) via the dock instead of only highlighting a tab.
* [x] Spotlight "Create" actions added: add parametric table, add graph (X-Y), add property graph, add psychrometric graph, add diagram.
* [x] Reset Layout no longer drops the left-bar instance counts — badges now reflect existing instances (tables/plots/diagrams), not just open windows.
* [x] Parametric-table column units now appear on X-Y graph axes automatically, with a **Show units** toggle in the plot configuration menu.
* [x] Diagram inspector: removed "Save JSON"; "Export" shows only in Run mode.
* [x] Every dock window tab now shows an instance-type icon so apps are recognizable when the tab title is clipped.
* [x] Graph instances are size-aware — a ResizeObserver refits the Plotly chart to its tile (no scrollbars when shrunk, no empty margins when grown).

## Next branch — explicit, fluid-aware STATE TABLE blocks

* Fluid States table is not shown in the Tables instances on the left menu. (Resolve together with the STATE TABLE redesign below — fluid states become first-class table instances.)
* Replace implicit fluid-state capture with explicit user-defined `STATE TABLE` blocks. Currently P, T, h … are auto-detected into a single state table, which is not robust for multi-fluid / multi-circuit plants (e.g. a geothermal plant with Water, R134a and Air, or two unmixed water circuits).

  User should declare states explicitly, e.g.:

  ```
  STATE TABLE WaterCircuit1(Pw1, Pw_2, ...)
    FLUID = Water
  END

  STATE TABLE RefrigerantCircuit5(Pref_1, Pref_2, xrefg, Tref1)
    FLUID = R134a
  END
  ```

  Decisions locked: fluid is declared with a `FLUID =` attribute line inside the block; numbers are still captured automatically but grouped per declared block. Each state table is **fluid-aware** — all CoolProp-derived properties in the same block share one fluid. Update property-plot and psychrometric-plot configuration options to be state-table / fluid aware.

  Backend touch points: `Frees.g4` grammar (new `stateTableDef` rule + keyword), `ast/StateTableDef`, `AstBuilder`, `EquationParser.ParseResult`, `SolveController` DTOs + response building + `groupStateKnowns`. Frontend: `api.ts` types, `StatesTab.tsx`, `plots/stateTable.ts`, `PlotConfigModal.tsx`.
