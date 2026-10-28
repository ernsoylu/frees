# CR-SCHEMATIC-01 — Configurable, bidirectional modeling workspace

Status: scope confirmed; first complete design proposal delivered. Draft date: 2026-10-26. Scope confirmed: 2026-10-28. Split into phases 01a–01d plus a triggered backlog: 2026-10-28 (section 10). Repository baseline: `51a2ea2`. 01a delivered and closed 2026-10-28 (on `b9ca60b`); canvas decision D13 in section 7.4. 01b–01d not yet approved.

## 1. Recommendation and intended outcome

Evolve Schematic into a visual modeling workspace inside the existing FREES application. A user must be able to build, inspect, connect, configure, diagnose, solve, and explain a model through the canvas, with equivalent changes reflected in the equation editor. Users who start in the editor must get the same model on the canvas without rebuilding it.

Keep the Rust/WASM solver, FREES language, Mantine styling, CodeMirror editor, Dockview workspace, existing component catalog, and browser project storage. Extend the model metadata and editing APIs before implementing destructive visual editing. A new canvas library alone cannot provide safe bidirectional behavior.

Use a hybrid visual language: recognizable engineering symbols, readable instance names, explicit typed ports, and optional compact result badges. Offer detailed cards when configuring and compact symbols when explaining large systems. Keep the physical topology readable without requiring hover or selection.

“Fully configurable” means control over layout, visible information, units, symbols, routes, groups, panels, presets, and project views. Configuration must never silently change the physical equations, connector domain, or solver result. “Bidirectional” means source ↔ visual model editing and navigation, not changing an equation result by typing over its displayed value.

Proposed product scope: all domains FREES already supports, including thermal, electrical, mechanical, translational, signals/control, and the different fluid connector families. Use the supplied humid-air system as the primary usability example and the existing EV thermal-management fixture as the cross-domain example.

## 2. Evidence and current gaps

Reviewed the supplied screenshot, current source and tests, project serialization, generated component catalog, and the existing [FREES Figma atlas](https://www.figma.com/design/SHIyfVVicYxMCbXqzedk8Z?node-id=11-1485). Inspected the modeling page metadata and rendered connected-schematic frame. The atlas is a capture of earlier behavior; it is not a specification for the proposed redesign. Its [repository inventory](figma-atlas/README.md) documents Roboto/Fira Code, Mantine tokens, and dark/light modes that new designs should reuse.

| Finding | Evidence | Implication |
| --- | --- | --- |
| Existing useful interaction | `web/src/schematic/SchematicTab.tsx` already has drag, pan/zoom, click/keyboard wiring, port dropdowns, shift selection, nudging, source reveal, SVG export and readouts. | Extend the existing product behavior; do not describe these as entirely new capabilities. |
| Selection suppresses context | Nonactive nodes use opacity `0.45`; unrelated wires use `0.28`. Clicking also pins a floating readout and reveals source. | Separate selection, inspection, source navigation, and explicit path isolation. Normal selection must retain readable context. |
| Geometry becomes inconsistent after dragging | Node coordinates include saved offsets, but circuit rectangles and Fit use original layout geometry. `routeEdge` receives positioned endpoints but `layout.nodes` as obstacles. | Compute bounds, containers and routing obstacles from the same current geometry. Reproduced in the browser; see the baseline below. |
| Routing is limited | `layout.ts` searches five possible middle lanes, tests the middle segment, and falls back to its first choice. | It does not guarantee full-path obstacle avoidance or useful route editing. |
| Visual edits mostly append source | `App.tsx` wires `onEmitStatement` to editor insertion; the canvas does not provide general rename/delete/reconnect/parameter edits. | Need source-aware transactions and one consistent undo contract. |
| Connection DTOs represent resolved topology | `api.ts` carries domain, endpoint sets, connector/fluid and stream aliases. It lacks authored connection IDs and exact source ranges. | A displayed branch is not necessarily one deletable `connect(...)` statement. Preserve connection provenance. |
| Identity exists but is insufficient for precise edits | Check supplies scoped names, types and lines. Nested instances deliberately reveal the parent instantiation. | Add instance/definition distinction, precise source references and identity reconciliation across rename. |
| Port preview is heuristic | `wiring.ts` infers domains from library and port names; custom/unknown ports are permitted for engine validation. | Use authoritative port contracts for compatibility, custom connectors and complete disconnected-port rendering. |
| Encapsulation is only a starting point | `encapsulation.ts` constructs a new function block and appends it; it does not replace the original subgraph. Tests assert generated strings. | A safe “Create subsystem” command needs engine-checked syntax, dependency capture, unique boundary mappings and an atomic replacement. Do not claim the existing action is a complete refactoring. |
| Persistence saves offsets only | Project v3 stores `{instance: {dx,dy}}`; viewport, routes, labels, views and groups are absent. | Version the visual document and migrate old positions without changing model semantics. |
| Mobile has no schematic destination | `MobileLayout.tsx` exposes equations, workspace, plots, tables and terminal. | A responsive schematic requires navigation changes as well as canvas gestures. |

**Browser baseline, 2026-10-28.** `web/e2e/schematic-baseline.spec.ts` reproduces these findings in the built app (revision `51a2ea2` plus that spec; Chromium 151, Playwright 1.62.1, 1440 × 960 window, rebuilt WASM). It runs on the humid-air model, the 26-component EV example and a 100-instance chilled-water floor (the model drawn in Figma frame 26, built inline by the spec). It asserts that the models solve, every instance is drawn, auto-fit and Fit after a drag frame every instance, a dragged node stays in its circuit frame, no wire runs under a component, hover dims nothing, a click keeps the canvas in front while selecting the declaration in the editor, an unchecked document is not reported as broken, and labels at auto-fit are at least 12 px tall (all but the first two since the fixes below); the defects are measured and attached to the run as `evidence.json` and screenshots, so the spec stays green while 01a changes the numbers. Run it with `npm run build && npx playwright test e2e/schematic-baseline.spec.ts --project=chromium`.

| Requirement | Measured on humid-air (5 instances) | Measured on EV (26 instances) | Measured on the dense floor (100 instances) |
| --- | --- | --- | --- |
| VIEW-06 selection context | Hovering FAN faded all 4 other nodes to opacity 0.45 and 3 of 5 wires. **Fixed 2026-10-28:** nothing is dimmed; the hovered or selected node and its own wires are emphasised. | Was 25 nodes and 31 of 32 wires; fixed. | Was 99 nodes and 144 of 147 wires; fixed. |
| SYNC-09 linked selection | Clicking FAN moved the Editor tab in front of the Schematic, hiding the canvas. **Fixed 2026-10-28:** a click selects the node and its declaration in the editor without changing tabs or focus; the readout card's reveal action navigates explicitly. | Fixed for LIQ. | Fixed for FC7. |
| VIEW-01 Fit | After FAN was dragged 420 × 260 px, Fit left FAN outside the view. **Fixed 2026-10-28:** Fit frames the drawing bounds (the same bounds SVG export uses), so the dragged node stays in view; a drag or pan now stops auto-fit. | Same for LIQ; fixed the same way. After auto-fit in the 816 px schematic pane the smallest instance label was 5 px tall. **Fixed 2026-10-28:** below 12 px on screen, nodes collapse to a 12 px name chip. | Auto-fit could not contain the layout: `fitTo` was clamped at `MIN_ZOOM = 0.25`, so 14 nodes (Z10–Z16, E10–E16) sat below the view. **Fixed 2026-10-28:** Fit is unclamped and frames all 100; labels were then 3 px; the name chip now holds them at 12 px (two crowded mid-row names are shortened with "…"). |
| VIEW-05 circuit frames | The dragged FAN lay outside every circuit frame. **Fixed 2026-10-28:** a frame grows to enclose any member dragged past it, keeping its padding and title row, and never shrinks; Fit and export include the grown frame. | Same for LIQ; fixed. | Same for FC7; fixed. |
| WIRE-08 routing obstacles | Before any drag, the `COIL.out → HP.re_in` loop ran underneath COIL and HP, so only two stubs showed (63 wire samples inside component boxes). After the drag: 153 samples, crossing COIL, FAN, HP and SUP. **Fixed 2026-10-28:** routes test every segment past the port stubs against every component box, the endpoints' own included, using live positions; 0 samples before and after the drag. | Before any drag, wires ran under BCP, CABIN, CHLC, CHLR, MCP and RAD1–3 (110 samples). Fixed: 0. | Before any drag, 1,898 samples fell inside 63 of the 100 component boxes. Fixed: 0. |
| RUN-01 run states | After a reload and before any Check, the canvas says "connections not shown — the document has errors" for a valid document. `topologyStale` treats "no connections yet" as an error. **Fixed 2026-10-28:** an unchecked document now shows "connections appear after Check"; the error notice is kept for a check that ran without producing topology. | Same. | Same. |
| CFG-03 persistence | The dragged offset survives reload exactly. Not a defect; kept as a regression check for the v3 migration. | Same. | Same. |

**Re-recorded at 01a close, 2026-10-28** (`b9ca60b` plus the 01a changes, same browser and window). The spec now has 22 tests: the per-model checks above plus one per 01a slice, AC-01 and a dark/light visual regression run in CI. All pass. On all three models: 0 dimmed nodes on hover, 0 wire samples inside components after a drag, no node outside the view or its frame after Fit, the dragged offset unchanged after reopen, and labels at least 12 px at auto-fit. The dense floor keeps WIRE-04's recorded residual: 2 unmarked wire contacts and short shared c7/c40 lanes. Per-slice evidence is in `NEXT_STEPS.md`.

Relevant existing assets: `readouts.ts`, `palette.ts`, `symbols.ts`, `componentText.ts`, ComponentWizard/UA/map builders, `modelRevision.ts`, project conflict/recovery behavior, and seven schematic unit-test files. Reuse these where their contracts remain valid.

## 3. Comparable products and what to adopt

Research checked on 2026-10-26 using public first-party documentation. This is a workflow comparison, not a hands-on product benchmark or a claim that FREES can import these products' models.

| Product | Documented behavior | Recommendation for FREES |
| --- | --- | --- |
| Simulink | Contextual modeling tools, property inspector, model hierarchy, normal diagram editing, and visible edit-time diagnostics. [Editor documentation](https://www.mathworks.com/help/simulink/slref/simulinkeditor.html) | Adopt context-sensitive commands, a stable inspector and issue-to-object navigation. Preserve FREES' acausal connections; generic signal arrows must not imply physical flow direction. |
| OpenModelica / OMEdit | Diagram and text views, component-library insertion, connector editing, variable browsing and diagram animation. [OMEdit guide](https://openmodelica.org/doc/OpenModelicaUsersGuide/latest/omedit.html) | Adopt equivalent source/diagram access, subsystem navigation and result-driven visualization. Keep handwritten expressions accessible. |
| DWSIM | Dockable object editor, flowsheet, results and stream tables, object palette, log, and saved panel arrangement. [Interface guide](https://dwsim.org/help/main/11-main-interface.html) | Adopt a single workspace linking equipment, stream properties and diagnostics. Use FREES' existing Dockview panels and tables. |
| draw.io | Editable connector waypoints, exact waypoint coordinates, line jumps and distinct join shapes. [Connector waypoint guide](https://www.drawio.com/docs/manual/connectors/waypoints-connectors/) | Adopt precise route manipulation and clear crossing/junction graphics. A drawn bend remains presentation data; a physical junction remains model data. |

The recommendation is a synthesis: engineering semantics from FREES, modeling interactions informed by Simulink/OMEdit, process inspection informed by DWSIM, and route controls informed by draw.io.

## 4. Workspace and interaction model

Default desktop arrangement:

- Existing application header: project/file actions, save status, Check, Solve/Stop and model status.
- Schematic header: model/subsystem breadcrumb, Source / Split / Schematic view switch, search, named-view selector.
- Compact command bar: Undo/Redo, Add, Select, Pan, Connect, Probe, Annotate, Arrange, View and Export. Labels/tooltips accompany icons; less-used actions live in menus.
- Left dock: **Library / Model tree** tabs. Search, favorites, recent components and domain filters. Collapsible.
- Center: canvas, optional grid, clear labels, connection handles, optional minimap and zoom/fit controls.
- Right dock: **Properties / Results / Appearance** for the selected object, with an always-available Source action. With no selection, show model/view settings.
- Bottom drawer: **Problems / Watch / Run history**. Collapsed by default; opening it resizes the canvas instead of covering equipment.

Proposed width defaults: 240 px library and 320 px inspector, independently resizable. At narrower widths open one side panel at a time. Use the available panel width, not only the browser width, to choose the layout. Split view uses the existing dock system and preserves the canvas viewport when opened.

Single click selects and updates the inspector. Hover gives a short tooltip. Double click opens a subsystem or the component's properties, as appropriate. Source navigation is an explicit action; optional linked selection can highlight source without stealing focus. Shift-click extends selection. Escape cancels the current tool before clearing selection. Dragging a block moves it; Select-drag on blank canvas creates a marquee; Space-drag temporarily pans.

## 5. Functional requirements

All numbered requirements describe the target product, not current implementation. Section 10 assigns each requirement to one delivery phase; backlog requirements stay part of the product direction but are not committed until their trigger is met. Each row contains an observable acceptance condition.

### A. Model and source synchronization

| ID | Requirement and acceptance condition |
| --- | --- |
| SYNC-01 | Source and canvas shall represent one model revision. A supported visual semantic edit updates source and triggers Check; a valid source edit updates the canvas without a Solve. No independently editable second physical model is stored in the frontend. |
| SYNC-02 | Support visual insertion, rename, parameter/variant changes, connect, disconnect, reconnect, duplicate, delete and subsystem extraction. Each operation shall have an identifiable source transaction and a reversible result. |
| SYNC-03 | Preserve unrelated equations, comments, whitespace and ordering. Editing `FAN.eta` shall update its actual binding/expression location, not reserialize the entire document or replace an expression with its evaluated number. |
| SYNC-04 | Use scoped identity and precise source ranges. Rename shall update semantic references, visual metadata and dependent bindings without changing same-spelled identifiers in other scopes or prose comments. Case-only renames shall work with FREES' case-insensitive identity. |
| SYNC-05 | Check/solve responses shall carry revision identity. Discard obsolete responses, and never attach values from one revision to topology from another as if current. Retained results must be explicitly labeled as last-run values. |
| SYNC-06 | During invalid/incomplete source edits, retain the last valid drawing with a visible “Source has errors; showing previous model” state. Provide error navigation. Block semantic edits that cannot be safely based on the current source; allow pan, search, inspection and presentation edits. |
| SYNC-07 | Use one ordered undo/redo timeline for committed model and diagram edits within the document. A drag is one undo step; parameter Apply is one step; a reconnect or subsystem extraction is one atomic step. Show the action name. Text-field typing follows normal field/editor undo and cannot unexpectedly undo the whole model. |
| SYNC-08 | Unsupported/generated constructs shall have visible ownership and editability reasons plus Open Source/Open Definition. Do not flatten repeated/generated nodes or silently rewrite shared definitions. Distinguish editing one instance from editing a definition that affects every instance. |
| SYNC-09 | In source/split mode, selection shall link in both directions among source declarations, nodes, ports and authored connections. Selection shall preserve focus unless the user explicitly navigates. |
| SYNC-10 | Equation-only documents shall remain useful: show an empty physical-canvas explanation and offer component insertion, linked equation/variable cards, and a dependency view when dependency metadata exists. Dependency links shall be distinguishable from physical wires and shall not invent physical topology or a solve order for implicit equations. |

### B. Components and library

| ID | Requirement and acceptance condition |
| --- | --- |
| COMP-01 | Search library by name, description, tags and domain; filter by connector compatibility; show built-in, local and project components distinctly. Provide useful empty-search and unavailable-library states. |
| COMP-02 | Add by drag/drop, keyboard placement, double-click, and quick-add search at the pointer/viewport center. Reuse component name/parameter validation. Cancel leaves no declaration or ghost object; insertion keeps the user on the canvas. |
| COMP-03 | Show type, instance name, description, required parameters, defaults, variants, available ports and help before placement. Unconfigured instances may be kept as explicit drafts with missing-field indicators; they shall not masquerade as checked models. |
| COMP-04 | The inspector shall edit literals, expressions, string/fluid selections, variants, map references and existing UA/map-builder inputs. Show unit, bounds when known, binding source and validation message. Apply/Cancel prevents partially typed values from altering the model. |
| COMP-05 | Duplicate/copy/paste shall allocate unique names and preserve selected internal connections and presentation. External connections are not silently recreated. Show unresolved external dependencies and any explicit mapping needed when pasting into another document. Cut deletes only after successful clipboard preparation. |
| COMP-06 | Delete shall report affected connections, parameter bindings, equations, watches and subsystem interfaces. Remove owned connections atomically; never silently delete arbitrary user equations. Offer cancel or explicit retention of unresolved references with diagnostics. Undo restores the whole operation. |
| COMP-07 | Allow rotation, mirroring, symbol/card density, label placement and size within readable limits. Ports move with their correct logical identities; text remains readable and transforms do not change equations. |
| COMP-08 | Allow project-level symbol overrides for built-in/custom components, port-anchor placement and a reusable symbol template. Keep type/domain labels available. Imported SVG shall be sanitized; no executable content or unexpected external fetches. A missing custom symbol falls back to a labeled block. |

### C. Connections, ports and engineering semantics

| ID | Requirement and acceptance condition |
| --- | --- |
| WIRE-01 | Support drag-to-connect and click-port/click-port, with an equivalent searchable port picker for keyboard/touch users. Show a temporary route and compatible destination hints; Escape cancels with no source change. |
| WIRE-02 | Validate domain, connector family, signal role/cardinality and applicable fluid constraints from engine metadata. Distinguish allowed, prohibited and unknown/pending compatibility. A provisional wire must not appear confirmed until the authoritative check accepts it. An incomplete but legal model may still be underdetermined. |
| WIRE-03 | Show disconnected ports, required-port problems, port names/types, and connection multiplicity for built-in and custom definitions before Solve. Hide optional port labels only through explicit view settings, with discoverable hover/focus information. |
| WIRE-04 | Preserve multi-endpoint connection sets as nets/hyperedges with true junctions. Crossing lines are not connected; dots indicate real junctions. A routed bend or line jump shall never become a physical junction. |
| WIRE-05 | Select a wire/branch/net to inspect endpoints, medium, values, ownership and source statements. Support reconnect, disconnect endpoint, delete authored connection and delete whole net as distinct operations where relevant. Explain the affected topology before committing an ambiguous operation. |
| WIRE-06 | Handle explicit `connect(...)`, shared stream names, transitive connections and nested scopes. Removing one of several paths must not falsely show two endpoints disconnected if another source relation still joins them. Shared-stream edits must preserve aliases or preview a deliberate conversion. |
| WIRE-07 | Route orthogonally by default; provide automatic/manual routing, draggable segments, add/remove waypoint, reset route and route lock. Manual bends persist through save/reopen; endpoint movement retains intentional bends where geometrically valid. |
| WIRE-08 | Route against live component/label/container obstacles with clearance. Avoid ambiguous overlapping unrelated wires. Where user locks make a valid route impossible, show the conflict and an actionable reroute/unlock option; do not silently draw through equipment. |
| WIRE-09 | Support inserting a compatible two-port component into a connection with explicit port mapping. For a multi-endpoint net or multi-port component, require branch/interface selection and preview the resulting model. One undo restores the original topology. |
| WIRE-10 | Distinguish signal causality, conventional port orientation, and measured physical flow. Physical-flow arrows require a valid solved quantity and sign convention; show reverse flow correctly and zero/unknown flow without fabricated direction. Display styling cannot change these semantics. |
| WIRE-11 | Offer a named off-page connector for another sheet/view of the same existing net. It shall navigate to its partner and preserve net identity; copying its label alone shall not join unrelated nets. |

### D. Navigation, layout and presentation

| ID | Requirement and acceptance condition |
| --- | --- |
| VIEW-01 | Support mouse/trackpad pan, pointer-centered zoom, pinch, numeric zoom, fit all, fit selection, actual size, home and minimap navigation. Fit shall include moved nodes, labels, routes and annotations, including negative coordinates. Opening an inspector shall not reset manual framing. |
| VIEW-02 | Provide multi-selection, marquee, select all/connected/domain, keyboard traversal, nudging, alignment and distribution. Locking affects movement/presentation only; semantic editing restrictions are separately identified. |
| VIEW-03 | Provide configurable grid/snap, alignment guides, spacing, orientation, background and connection-label density. Sensible defaults shall produce a readable small model without any settings work. |
| VIEW-04 | Offer Arrange Selection, Arrange Circuit and Arrange All, with preview, Apply/Cancel and Undo. Respect locked positions and routes; place new components locally without shuffling the entire model. Automatic layout shall be deterministic for the same input and settings. |
| VIEW-05 | Group by circuit, domain or user-defined visual area, and offer free placement without bands. Multi-domain equipment remains one model instance even when it crosses visual boundaries. Auto-sized containers follow moved children; locked/fixed containers show overflow. |
| VIEW-06 | Normal selection highlights the selected object without making other labels unreadable. Separate commands trace a net, highlight neighbors, isolate a circuit or show an issue path. Clearly indicate hidden items and provide a one-action restore-all command. |
| VIEW-07 | Search instance, type, port, net, parameter, equation and diagnostic. Results include scope and type; selecting a result opens the right sheet/subsystem and centers it without destroying the saved view. |
| VIEW-08 | Offer names/symbols, engineering, debug and presentation presets; users may save named views with camera, visibility, groups, labels and readouts. Preset changes affect presentation only. Device panel preferences remain separate from portable project views. |
| VIEW-09 | Provide text notes, callouts, regions, legends and equation/variable cards linked to real source entities. Rename follows the link; deleted references display a broken-link state instead of silently showing an outdated number. |
| VIEW-10 | Support multiple sheets/views of the same model, with clear canonical identity for repeated visual occurrences. Selecting a duplicate occurrence identifies the same component; deleting an occurrence is distinct from deleting the model component. |

### E. Hierarchy and reusable systems

| ID | Requirement and acceptance condition |
| --- | --- |
| HIER-01 | Browse nested systems using a searchable model tree, breadcrumbs and back/forward navigation. Collapse/expand preserves boundary connections and reports hidden issue counts. Each scope retains its camera and layout. |
| HIER-02 | “Create subsystem from selection” shall preview included declarations/equations, captured parameters, external dependencies and boundary ports. Generate unique exposed-port names even when different children both use `in`/`out`. Reject or request resolution of unsupported captures before altering source. |
| HIER-03 | Extraction shall create an engine-valid reusable definition, replace original instances with one new instance, reconnect boundaries, preserve equivalent equations/results, and move visual metadata atomically. The generated definition and resulting parent model must both be checked. |
| HIER-04 | Edit subsystem interfaces and instance parameter bindings with affected-instance counts. Definition changes that remove/rename ports shall present a connection migration plan. Imported/built-in definitions stay protected; create a local copy to customize them. |
| HIER-05 | Provide reusable project components/templates with name, description, ports, parameter defaults, icon and dependency information. Export/import shall validate naming collisions and missing definitions; retain existing definitions until the user deliberately replaces them. |

### F. Inspection, solving and cross-feature workflows

| ID | Requirement and acceptance condition |
| --- | --- |
| RUN-01 | Reuse global Check/Solve/Stop. Show unchecked, checking, structurally valid, under/overdetermined, running, solved, failed, stopped and stale states distinctly. Structural validity is not a numerical solution. Preserve edits and useful diagnostics on failure/cancellation. |
| RUN-02 | Selection inspector shall show parameter expressions separately from evaluated values, port states, component outputs, inferred units, constraints, warnings and source/definition links. Values unavailable before Solve shall show a reason rather than zero. |
| RUN-03 | Allow users to choose which actual variables appear on components/nets, set compatible display units and precision, and pin watch rows. Selecting a row shall select its component/port and vice versa. Display-unit changes shall not alter stored physical input values. |
| RUN-04 | Offer optional quantitative coloring, line-width encoding and flow arrows with an explicit legend, selected metric, units and scale. Missing/stale/nonfinite values have distinct treatment. Do not compare unlike quantities on one scale or infer a stream quantity that the engine did not produce. |
| RUN-05 | For solved dynamic models, support play/pause, scrub, speed and time readout linked to existing trajectory data and plots. This is recorded-result playback; do not imply a live solve. Show event discontinuities and stop playback if the selected run is unavailable. Respect reduced-motion preferences. |
| RUN-06 | From a component/variable offer Add to Watch, Plot, Table, Fluid State view and applicable analysis tools. Reuse current application windows/configuration and disable incompatible actions with reasons. Parameter changes use the same validation path regardless of which surface initiated them. |
| RUN-07 | Support named scenario inputs and explicit baseline/current run comparison for compatible variables. Every run identifies source revision, scenario, time/sample and solver status. Compare values only when identity and units are compatible; otherwise show unavailable. Scenario changes shall be undoable and visibly mark results stale. |
| RUN-08 | Diagnostics shall identify relevant nodes, ports, nets, equations and source locations where known. Filter by severity/scope; click an issue to reveal the object and explanatory detail. Never fabricate component-specific attribution for a whole-model failure. |
| RUN-09 | Show missing parameters, illegal connections, duplicate names, unresolved references, units issues and structural/free-variable information as actionable messages. Suggested fixes must preview their source changes and be reversible; no automatic mutation to force solvability. |
| RUN-10 | Canvas rearrangement, labeling, visibility and inspection must not trigger Check/Solve or invalidate valid numerical results. Semantic changes do invalidate them. Optional re-solve after parameter Apply shall be explicit, debounced and cancellable. |

### G. Configuration, storage, exchange and accessibility

| ID | Requirement and acceptance condition |
| --- | --- |
| CFG-01 | Persist positions, transforms, routes, labels, annotations, groups, collapsed scopes, sheets, named views, readout bindings and project style overrides. Separate project, view, component-type and per-instance settings; explain precedence and provide scoped reset actions. |
| CFG-02 | Provide appearance defaults for dark/light themes, domain colors/patterns, line widths, symbol style, label precision and panel density. Use color plus shape/label/dash cues; preserve visible focus, error indicators and contrast in user-customized themes. |
| CFG-03 | Save/autosave/recovery and browser multi-tab conflict handling shall include visual edits. Migrate current v3 offsets using the legacy layout basis; reopen the migrated file at equivalent visible positions. Invalid metadata is reported and sanitized without discarding valid source. |
| CFG-04 | Full project export/import is the lossless interchange. Equation-only export/share explicitly identifies visual metadata that will not travel. Sharing a saved view uses a project artifact/link that actually contains it; no silent promise that an equation-only URL includes layout. |
| CFG-05 | Export SVG, PNG and print/PDF for full model, current view or selection. Choose background, scale/page size, legend, values and annotations. Include run/time/staleness context when exporting results. Hide transient selection handles and inspector UI; preserve actual warnings requested in the export. |
| CFG-06 | Round-trip exported projects shall retain source, connectivity and visual configuration. Arbitrary draw.io/Simulink/Modelica/P&ID semantic import is a separate interoperability project, not implied by visual similarity or SVG import. |
| CFG-07 | Core editing shall work offline once app/engine/assets are cached, following existing PWA behavior. Export/import validates file size, schema, finite coordinates, identifier references and embedded visual assets. No external service is required to draw or solve a model. |
| CFG-08 | All core commands need keyboard access, focus indication, accessible names and announcements for validation/connection completion. Provide an equivalent structured component/connection list for nonvisual navigation and editing. Dragging cannot be the only way to connect, move or configure an object. |
| CFG-09 | Desktop and tablet shall support full schematic authoring, including placement, connection editing, hierarchy, parameter editing, analysis and export. Tablet provides large touch targets, click-to-connect and structured-list alternatives. Phone design and phone-specific schematic workflows are explicitly out of scope. |
| CFG-10 | Context menus and keyboard shortcuts shall be discoverable in a searchable command palette/help sheet. Scope shortcuts to the focused surface; editing parameter text must not trigger Delete/Connect/Rotate commands. Remapping must detect browser/application collisions. |
| CFG-11 | Support engineering handoff through project files, named views, annotations and exports. Live multiuser cursors, permissions, review threads and mergeable concurrent editing require a separate shared-storage architecture decision. They are not necessary for cross-domain or cross-feature operation. |

## 6. Menus and tools

Keep global File/Functions/Tools and global execution controls. These menus belong to the schematic surface and expose the same command handlers used by the toolbar, palette and context menus; do not implement separate versions of each operation.

| Menu/tool | Commands | Availability and behavior |
| --- | --- | --- |
| Edit | Undo, Redo, Cut, Copy, Paste, Duplicate, Rename, Delete, Select All, Select Connected | Explain disabled commands. Delete opens impact review only where references or multiple source relationships make the result nontrivial. |
| Add | Component, Local component, Subsystem, Linked equation card, Variable/readout, Note, Region, Off-page connector | Component insertion uses library validation. Regions/notes have no physical meaning. |
| Select | Single, Marquee, Connected network, Same type, Same domain | Clear selection and visible count; modifiers extend/toggle. |
| Pan | Hand tool, temporary Space-pan | Touch/trackpad equivalents; does not select/move components. |
| Connect | Start/cancel connection, Port picker, Insert component in connection | Highlights known-compatible targets and identifies uncertain ones. |
| Arrange | Align left/right/top/bottom/centers, Distribute horizontally/vertically, Rotate, Mirror, Grid/snap, Lock/unlock, Auto-layout selection/circuit/all | Layout preview and Undo. Rotate/mirror only where symbol and anchor transforms are defined. |
| Route | Auto-route, Add/remove waypoint, Straighten selected segment, Reset route, Lock route, Crossing style | Appears for selected connections; cannot create a physical junction by changing appearance. |
| Model | Create subsystem, Open subsystem, Edit interface, Open definition, Save as reusable component | Requires an editable scope and dependency analysis. Show all affected instances for definition edits. |
| Inspect / Probe | Inspect properties, Trace net, Highlight neighbors, Pin value, Add to Watch, Show source, Show definition | Probe records a display binding; no hidden sensor or equation is inserted. |
| Analyze | Plot selected values, Add to table, Show fluid states, applicable sensitivity/optimization/control tools, Compare runs | Reuses existing tool capabilities; disabled reasons distinguish no results from unsupported variables. |
| View | Source/Split/Schematic, Library, Model tree, Inspector, Problems, Watch, Run history, Minimap, Grid, Port labels, Results, Domains, Named views, Restore all | Selection and camera survive panel changes; hidden-object indicators remain visible. |
| Export | SVG, PNG, Print/PDF, Project, Reusable component | Scope/settings preview; source-only export remains in global File and identifies its limitations. |
| Help | Selected component reference, Wiring/domain rules, Shortcuts, Guided first model | Opens the existing help system at the relevant topic. |

Context menus:

- Blank canvas: Add, Paste, Fit all, Grid, Arrange, View settings.
- Component: Properties, Source, Definition, Duplicate, Rename, Rotate/Mirror, Lock position, Probe/Plot, Delete.
- Multiple components: Group visually, Align/Distribute, Duplicate, Create subsystem, Delete.
- Port: Compatible targets, Start connection, Inspect state, Trace net, Disconnect endpoint, Source.
- Wire: Inspect net, Source relationships, Reconnect, Disconnect, Insert component, Route, Label/readout.
- Subsystem: Enter, Interface, Instance parameters, Definition, Reusable component, Source.

Proposed shortcuts: `V` Select, `H` Pan, `C` Connect, `P` Probe, `N` Note, `F` Fit all, `Shift+F` Fit selection, `Esc` cancel/back, arrows nudge, Shift+arrows large nudge, Ctrl/Cmd+Z Undo, Ctrl/Cmd+Shift+Z Redo. Retain FREES' existing Check/Solve shortcuts. Validate these against actual application/browser shortcuts before assignment; show the final bindings in tooltips and help. No single-letter shortcut operates while a text input is focused.

## 7. System changes required

### 7.1 One model, separate presentation

Recommended flow:

```text
Source editor changes ───────────────────────┐
                                            ▼
Canvas semantic command → revision-checked source edit → FREES source document
                                                        │
                                                     Check/parse
                                                        │
                     diagnostics ← semantic model/identity/ports/provenance
                                                        │
                                    canvas + inspector + source links
                                                        │
                                   Solve → revision-tagged run results

Canvas presentation command → visual document/history → project persistence
```

The source document remains the canonical physical model. The parser/engine supplies the authoritative semantic projection; the frontend owns its presentation. Source edits and canvas edits enter the same document transaction/history path. Do not put solver behavior into node renderers or serialize a React Flow graph as a competing physical model.

### 7.2 Engine metadata and safe source editing — required

Extend the existing Check/document-analysis contract, preserving consumers of its current fields:

- Model revision and parse/topology validity independently from numerical/structural solvability.
- Stable editor identity or a tested identity reconciliation scheme, qualified name, written label, parent scope, type and definition identity.
- Separate source references for the instance declaration, definition body, parameter binding, port declaration and authored connection. Include source/file identity and exact ranges, not only line numbers. Specify UTF-8 byte versus UTF-16 editor offsets and test Unicode conversion.
- All ports, including disconnected custom ports, with resolved connector/domain metadata, signal roles, multiplicity and member/units information. Unknown information remains explicitly unknown.
- Authored connection relationships plus the resolved net's provenance: source statement IDs/ranges, shared-stream aliases and endpoint ownership. Preserve hyperedges and transitive connectivity.
- Parameter expression/default/variant metadata before Solve, editability reason and instance-versus-definition ownership.
- Structured diagnostics with severity/code and optional entity/source references. Keep general diagnostics when exact attribution is unavailable.
- Variable/equation dependencies for linked equation cards and the dependency view. Represent implicit equation participation without inventing directed causality.

Use parser-backed ranges to apply minimal text patches through CodeMirror transactions. Validate the expected revision before applying; reject/recompute if another edit intervened. Preserve original text outside targeted ranges. Complex operations first return an edit/impact preview, then apply atomically. Ordinary safe edits should not require a confirmation dialog.

Model extraction, rename, alias disconnect and subsystem replacement require semantic reference analysis. A regex-only implementation is not sufficient for arbitrary scopes, repeated names, multiline declarations, comments and shared streams. Existing scanners can remain fallback navigation aids while authoritative metadata is added.

No numerical solver rewrite is proposed. Extend parsing/metadata and the API boundary; reuse the current validation, equation expansion and solve pipelines.

### 7.3 Presentation state and history — required

Introduce a versioned schematic document in the project format. Recommended fields are stable entity bindings, per-view node geometry/transforms, edge/branch routes, labels, groups/annotations, sheets, collapsed scopes, view settings and readout bindings. Keep transient hover, tool mode and open menus out of saved files. Save device-specific panel placement through the existing workspace mechanism.

Use absolute positions for manually placed nodes; inferred placement is used for new/unplaced nodes. Migration from v3 must calculate the former base layout plus stored offset before introducing a different layout engine. If a reliable legacy identity cannot be resolved, retain the old metadata for recovery and report it; do not silently attach it to another component.

Semantic changes increment the existing model revision; presentation changes increment only document/visual dirty state. Undo must restore coupled source/presentation changes together. Reuse `ModelRevisionTracker`, autosave scheduling and project conflict protections rather than adding parallel mechanisms.

### 7.4 Canvas and layout technology — bounded recommendation

| Option | Fit and cost | Decision |
| --- | --- | --- |
| Continue custom SVG/React | Already installed, preserves current glyphs/export and is sufficient for immediate geometry/readability fixes. Full editor interactions, hierarchy and history remain FREES work. | Use for the initial stabilization; retain if it meets the full interaction/scale tests with less code. |
| React Flow for interaction + custom engineering nodes/edges | Provides customizable nodes/handles and selection/drag interaction. FREES still owns acausal semantics, source edits, net representation and exports. [Custom nodes](https://reactflow.dev/learn/customization/custom-nodes), [accessibility](https://reactflow.dev/learn/advanced-use/accessibility). | Preferred candidate for a bounded full-editor spike, not an automatic migration or dependency added by this draft. |
| ELK/elkjs for automatic layout | ELK supports explicit ports, compound graphs and orthogonal routing. [ELK Layered](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html). React Flow documents external layout engines rather than supplying its own. [Layout guide](https://reactflow.dev/learn/layouting/layouting). | Candidate for explicit auto-layout in a worker. Measure size, latency, fixed-port behavior and quality first; do not relayout the entire model on each drag. |

Spike acceptance: render the humid-air and 26-component EV examples with correct multi-port/net semantics; move/connect/select by keyboard and pointer; preserve appearance on save/export; benchmark the proposed larger-model targets. Compare custom SVG with React Flow on total maintained code and user behavior. Check package license, offline behavior, supported React version, bundle impact and whether any desired examples require commercial assets before committing. No library is assumed to supply obstacle routing, subsystem semantics, source round-tripping or full accessibility automatically.

**Decision 2026-10-28 (D13): keep custom SVG.** The spike ran a React Flow 12.12.0 canvas (MIT, React ≥17) beside the current one on the same build: custom block nodes with handles at the frees port positions, edges drawn by the frees router from React Flow's live positions, minimap and colour mode. Measured with a 40-step pointer drag through CDP:

| Model | Canvas | Frames in the drag | Cost per move | Keyboard move |
| --- | --- | --- | --- | --- |
| humid-air (5 nodes, 5 wires) | SVG / React Flow | 43 / 39 | — | 7 / 4.9 px |
| EV (29 nodes, 32 wires) | SVG / React Flow | 45 / 41 | ≈18 / ≈17 ms | 2.4 / 1.4 px |
| dense floor (118 nodes, 147 wires) | SVG / React Flow | 103 / 100 | ≈43 / ≈42 ms | 1.4 / 0.9 px |

Both canvases ran at a 16.7 ms animation-frame median; the floor's per-move cost is the shared `routeAll`, not rendering. React Flow added 63,211 bytes gzipped (the schematic chunk grew from 14.4 KB to 75 KB) and would replace about 350 lines (drag 101, pan/zoom 78, minimap 70, marquee 38, `viewport.ts` 65). Its adapter was already 115 lines and still lacked label level-of-detail (names unreadable at Fit), frames, areas, guides and snapping, locks and SVG export; it draws blocks as HTML, so export would need a second renderer, and it offers no keyboard connection. Reconsider when 01c's handle-drag connection and edge reconnection would cost more than the code it replaces, or when the 500-component budget (01d) fails in rendering rather than routing. ELK was not evaluated.

For live manual moves, use a route strategy that checks all segments against current obstacles and honors fixed user waypoints. ELK auto-layout is not a substitute for that interaction contract. If routing cannot satisfy user constraints, report the conflict rather than asserting a collision-free result.

### 7.5 Cross-feature integration

Share an entity selection model among Schematic, Inspector, Variable Explorer, Source, Problems, tables and plots. Surface-specific selections may remain pinned; following global selection should be visible and switchable. Reuse current plot/table/analysis configuration dialogs and parameter validation instead of adding a second set of editors inside the canvas.

Component catalog/schema changes should originate in the library/documentation compilation path. `componentCatalog.ts` is generated and must not be manually patched. Rich port contracts should come from the engine/library definition, not a growing port-name heuristic table.

## 8. Change impact map

| Area | Existing entry points | Required work / regression concern |
| --- | --- | --- |
| Canvas and geometry | `web/src/schematic/SchematicTab.tsx`, `layout.ts`, `symbols.ts`, `palette.ts`, `readouts.ts` | Interaction separation, current bounds, routing, display settings, selection, export and component presentation. Preserve units/readouts and semantic domain distinction. |
| Source commands | `wiring.ts`, `declaration.ts`, `encapsulation.ts`, `componentText.ts`, `EquationEditor.tsx` | Reuse generation/validation; replace append-only/regex mutation assumptions with scoped source transactions. Audit all callbacks and editor history. |
| Workspace integration | `App.tsx`, `workspace/WorkspaceDock.tsx`, `MobileLayout.tsx`, existing chrome/command palette | Shared selection, inspector, drawers, focus, pane resizing and tablet entry. Preserve global run actions and other workspace windows. |
| Definitions/catalog | `ComponentWizardModal.tsx`, component helpers, `web/scripts/compile-docs.js`, library parser scripts, generated catalog | Complete metadata, compatible port insertion, variants, local component support. Keep generated artifacts and authored sources aligned. |
| Engine and transport | `crates/frees-core/src/engine.rs`, `engine/prepared.rs`, component definitions/expansion, parser, `web/src/api.ts`, native/WASM adapters | Source ranges, provenance, typed ports, structured diagnostics and compatibility. Check native/WASM DTO parity. |
| Persistence | `project.ts`, `projectStore.ts`, autosave/share/import/export paths | Schema migration, stable visual references, view metadata, bounds/asset validation, old-project opening and conflict protection. |
| Verification | Existing schematic tests, `project.test.ts`, `modelRevision.test.ts`, Playwright journeys, Rust component/DTO tests, corpus/golden fixtures | Add behavior-level coverage for real edits and migrations. Keep both authored and resolved topology assertions. |
| Documentation/design | Existing Figma atlas, help articles, shortcuts and examples | Proposed pages must be labeled separately from captures; document all commands, source ownership and limitations. |

Compatibility risks: losing handwritten source during refactoring; attaching positions/readouts to the wrong renamed instance; changing net membership when removing an apparent wire; invalidating all results on visual changes; broken old project layouts; missing keyboard workflows; introducing bundle/worker load that weakens offline use. Each risk has an acceptance journey below.

## 9. Quality requirements and acceptance journeys

### Measurable quality targets

These are proposed budgets to validate on an agreed reference device/browser, not measured performance claims. Record hardware, browser version, cold/warm cache and model fixture with benchmark results.

- **Integrity:** no silent source loss; canceled operations leave source and visual model unchanged; undo/redo restores exact prior source plus associated presentation. Reopening a saved project preserves semantic and visual state.
- **Legibility:** no unintended component-label overlap in shipped acceptance fixtures at 100% zoom; normal selection preserves readable nonselected labels; explicit junctions/crossings remain distinguishable in grayscale and both themes.
- **Accessibility:** target WCAG 2.2 AA; verify normal text contrast, nontext controls, focus visibility, non-drag alternatives and screen-reader operation. Design touch targets at least 44 × 44 CSS px where practical, and provide a compact accessible list when canvas hit regions overlap. This is a target, not a certification claim. [W3C standard](https://www.w3.org/TR/WCAG22/).
- **Typical model:** 100 components / 200 rendered branches; p95 input-to-feedback under 100 ms and p95 drag/pan frame time under 33 ms on the chosen reference machine. Check/Solve time is measured separately from canvas response.
- **Larger model:** 500 components / 1,000 rendered branches; responsive search and selection under 200 ms p95 after loading. Move auto-layout off the UI thread; aim for completion within 2 seconds and expose cancellation/progress for longer work. Benchmark before committing this supported scale.
- **Synchronization:** indicate checking/pending edits immediately; aim for diagram refresh within 300 ms of a completed applicable Check. Never obscure a slow Check behind a falsely current diagram.
- **Browser/device:** test current supported Chromium, Firefox and Safari on desktop; full tablet touch authoring and 200% browser zoom. Preserve existing PWA/offline behavior.
- **Robustness:** reject nonfinite/excessive visual coordinates, malformed references and executable SVG content. Recover a valid source document even when its presentation metadata is damaged.

### Required end-to-end journeys

| ID | Journey and expected outcome | Requirements covered |
| --- | --- | --- |
| AC-01 | Open the supplied humid-air model; select FAN; all labels remain legible. Move FAN and COIL beyond original bounds; Fit includes them, circuit frames update, and wires avoid moved objects. Save/reopen restores the view. | VIEW-01/05/06, WIRE-08, CFG-03 |
| AC-02 | From empty canvas, insert source, equipment and sink with library/keyboard actions; configure, connect, Check and Solve without needing to type source manually. Generated source is inspectable and valid. Cancel insertion produces no partial declaration. | COMP-01–04, WIRE-01/02, RUN-01 |
| AC-03 | Edit a parameter expression in source; inspect updated binding in canvas. Edit another literal in inspector; verify minimal source diff and stale results. Undo both in order; preserve comments, multiline syntax and unrelated equations. | SYNC-01–07, COMP-04, RUN-10 |
| AC-04 | Rename nested instances with repeated local names and case-only differences; all intended references/layout/readouts follow and unrelated scopes remain unchanged. Include Unicode comments before edited ranges. | SYNC-03/04/08/09 |
| AC-05 | Connect legal fluid ports; reject mismatched electrical/thermal ports; show pending compatibility for unresolved custom ports. An underdetermined but legal partial network remains editable and distinguishable from an illegal wire. | WIRE-01–03, RUN-01/09 |
| AC-06 | Build a three-way junction with two different authored connection paths plus a shared-stream case. Remove one relationship and verify remaining connectivity. Disconnect a specific endpoint; preview and undo the complete change. | WIRE-04–06, SYNC-07 |
| AC-07 | Add waypoints, lock a route, move endpoints and create a line crossing. No bend becomes a junction. Show a conflict if locks prevent clearance; reset route and undo. Export the same topology correctly. | WIRE-07/08, CFG-05 |
| AC-08 | Extract a subsystem with duplicate boundary-port names, parameter expressions and external references. Resolve captures, Check the generated definition/parent and compare outputs with the original within existing solver tolerances. Undo restores original source and geometry. | HIER-01–05, SYNC-07 |
| AC-09 | Copy a subgraph to another document with naming collisions/missing local types. Resolve names/dependencies; preserve internal topology and do not reconnect external wires implicitly. Delete an instance referenced by an equation; show impact and restore via Undo. | COMP-05/06, HIER-05 |
| AC-10 | Start a solve, change a parameter, then receive the older result. Never show old values as current. Introduce source syntax errors; retain the labeled previous canvas and navigate to the error without losing layout. | SYNC-05/06, RUN-01/08 |
| AC-11 | Use the EV fixture to trace coolant, refrigerant and thermal links. Select a component and open related watch/table/plot/state panels. Domain filters do not duplicate equipment or alter the solve. | VIEW-05–08, RUN-02–04/06 |
| AC-12 | Play a dynamic run, scrub to an event, compare a compatible baseline, and export values at the selected time. Values, units, time and run identity agree across diagram and plot; unavailable values are explicit. | RUN-04/05/07, CFG-05 |
| AC-13 | Load v1/v2/v3 projects, including moved/renamed/deleted nodes and malformed visual fields. Save in the new format and reopen. Test browser storage conflict, quota/failure recovery and source-only export warnings. | CFG-01/03/04/06/07 |
| AC-14 | Complete insert/configure/connect/inspect/solve/export using keyboard and the structured connection list. Confirm focus behavior and screen-reader announcements; text editing does not trigger canvas shortcuts. Repeat the full authoring journey on tablet using touch and the connection list. | CFG-08–10 |
| AC-15 | Create named engineering/presentation views and another sheet; add linked annotations and a custom symbol. Change units/theme; reopen/export. Deleting a visual occurrence leaves the physical component intact unless Delete component is chosen. | COMP-07/08, VIEW-08–10, WIRE-11, CFG-01/02/05 |
| AC-16 | Open an equation-only model; show linked variable/equation cards and dependency view without fabricating physical pipes. Rename/delete referenced quantities and expose broken links. Unsupported generated topology provides source access. | SYNC-08/10, VIEW-09 |

Baseline verification performed for this draft: `node v24.20.0 node_modules/vitest/vitest.mjs run src/schematic` — **7 files, 101 tests passed**. The first invocation used the shell's Node 20, below the project's Node >=22 requirement, and failed during jsdom/undici startup before tests ran. Rerunning with the already installed Node 24 passed without dependency or source changes. No screen-reader, full Rust suite or performance benchmark was run for this research-only draft. The browser behaviour of the current schematic was recorded afterwards; see the baseline in section 2.

## 10. Phased delivery

This request is split into four separately approvable phases plus a triggered backlog. Each requirement belongs to exactly one phase. A journey (section 9) gates the phase in which its last requirement lands, so an earlier phase never claims a journey it cannot run. Approving one phase does not commit the next; each phase starts with its own estimate once the previous phase's exit evidence exists.

| Phase | Outcome | Requirements | Exit gate |
| --- | --- | --- | --- |
| **CR-SCHEMATIC-01a** — Readable canvas | The current schematic becomes trustworthy to look at. No engine or source-editing change. Fixes the code-observed defects in section 2: stale bounds and obstacles after a drag, selection dimming, Fit. Migrates v3 offsets because the layout basis changes. Ends with the section 7.4 canvas spike decision (custom SVG or React Flow), measured on the humid-air and 26-component EV fixtures. | VIEW-01, VIEW-02, VIEW-03, VIEW-05, VIEW-06, WIRE-04, WIRE-08, RUN-10, CFG-02, CFG-03 (10) | AC-01; current schematic tests; dark/light visual regression; Playwright baseline evidence re-recorded against the fix; written canvas-technology decision. |
| **CR-SCHEMATIC-01b** — Editing foundation | Engine metadata, authored-connection provenance, typed port contracts, scoped source transactions, revision-tagged responses, one undo timeline and the versioned presentation document. Visual commands limited to connect/disconnect/inspect so the foundation is exercised. | SYNC-01, SYNC-03, SYNC-04, SYNC-05, SYNC-06, SYNC-07, SYNC-08, SYNC-09, WIRE-01, WIRE-02, WIRE-03, WIRE-05, WIRE-06, RUN-01, RUN-08, RUN-09, CFG-01, CFG-04, CFG-06, CFG-07 (20) | AC-04, AC-05, AC-06, AC-10, AC-13; native/WASM DTO parity; no corpus/golden or persistence regression. |
| **CR-SCHEMATIC-01c** — Complete authoring | Library placement, inspector editing, duplicate/delete, route editing, insert-into-connection, subsystems and reusable components, export options, keyboard/touch/structured-list authoring. | SYNC-02, COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06, WIRE-07, WIRE-09, HIER-01, HIER-02, HIER-03, HIER-04, HIER-05, VIEW-04, RUN-02, CFG-05, CFG-08, CFG-09, CFG-10 (20) | AC-02, AC-03, AC-07, AC-08, AC-09, AC-14; full engine-validated round trips; typical-model (100 components) budget met. |
| **CR-SCHEMATIC-01d** — Explain and present | Search, presets and saved views, linked annotations and equation cards, result overlays, cross-feature handoff, flow arrows, symbol density/rotation. | COMP-07, VIEW-07, VIEW-08, VIEW-09, SYNC-10, RUN-03, RUN-04, RUN-06, WIRE-10 (9) | AC-11, AC-16; AC-15 except its sheet and custom-symbol steps; larger-model (500 components) budget measured. |
| **Backlog** — triggered | Not committed. Each item enters a phase only when its trigger is met. | COMP-08, WIRE-11, VIEW-10, RUN-05, RUN-07, CFG-11 (6) | AC-12; the remainder of AC-15. |

| Backlog item | Trigger for scheduling |
| --- | --- |
| COMP-08 custom symbols and SVG import | A supported component has no adequate built-in symbol, or a user project needs a house symbol set. Requires the SVG sanitizer review. |
| WIRE-11 off-page connectors, VIEW-10 multiple sheets | An acceptance fixture cannot meet the legibility target on one sheet after 01a–01d. Ship together; they share net identity. |
| RUN-05 recorded playback | Users need diagram-linked trajectories that the existing plots do not answer. Depends on RUN-04 overlays (01d). |
| RUN-07 scenarios and run comparison | Run identity (revision, scenario, sample) exists end to end in the solve pipeline, not only in the schematic. |
| CFG-11 collaborative handoff beyond files | A shared-storage architecture is approved; until then project files, views and exports are the handoff. |

Ship each phase behind the existing interface or a reversible feature flag if needed. Do not expose unfinished destructive commands as working controls. A phase is complete only when its requirements and their negative/error paths have evidence, not when the first attractive canvas is drawn. No estimates are asserted before 01a's canvas spike and 01b's metadata work establish cost.

## 11. Figma deliverable plan

Create a clearly labeled **Proposed · Schematic workspace** page in the existing atlas unless another destination is requested. Preserve captured/current screens. Reuse `FREES · Mantine` variables, Roboto/Fira Code, application chrome and control conventions. Use editable native layers, auto-layout for panels/menus, and reusable component variants. Annotate engineering values as illustrative unless checked against an actual model/run.

| Frame/flow | Content and interaction coverage |
| --- | --- |
| F01 Overview | Requirements index, navigation and visual legend; links to all flows and source document. |
| F02 Main workspace | Humid-air overview, readable connections, toolbar, library, selection inspector, status and collapsed bottom drawer. |
| F03 Empty to first model | Empty state, quick-add search, library filters, component placement, required-parameter draft and cancel. |
| F04 Component inspector | Parameters, expressions/units, variant/fluid choice, maps/UA entry, validation errors, Apply/Cancel, Results and Appearance tabs. |
| F05 Wiring | Start/preview, compatible/invalid/unknown targets, port picker, accepted/pending connection, junction and crossing examples. |
| F06 Connection editing | Net inspector, authored-source relationships, reconnect/disconnect impact, waypoint tool, route-lock conflict and insert-component mapping. |
| F07 Source and canvas | Split view, linked selection, exact proposed edit preview, invalid source/stale canvas, unsupported/generated node. |
| F08 Arrange and customize | Multi-selection, context menus, alignment, auto-layout preview, circuit/free layout, grid, labels and symbol customization. |
| F09 Subsystems | Tree/breadcrumb navigation, collapsed view, extraction wizard, boundary mapping/dependency capture, definition-versus-instance edits. |
| F10 Diagnostics | Problems drawer, missing input, illegal connector, unit warning, under/overdetermination, whole-model failure and issue navigation. |
| F11 Results | Configurable node/stream badges, quantitative legend, watch rows, plot/table handoff and stale/no-result cases. |
| F12 Dynamic/scenario | Time playback/scrub, selected run, baseline comparison, missing/incompatible results and Stop/failure. |
| F13 Views and export | Saved view/sheet management, off-page navigation, presentation mode, annotations, export options and preview. |
| F14 Persistence | Migration warning, damaged visual metadata recovery, dirty save state, multi-tab conflict and source-only export notice. |
| F15 Responsive/accessibility | Desktop 1440×960 and 1920×1080, narrower dock, tablet 1024×768, tablet portrait 768×1024, light theme, keyboard focus and structured-list editing. |
| F16 Equation visualization | Equation-only onboarding, linked equation/variable cards, dependency view, source ownership and broken-reference state. |
| F17 Tools and menus | Open states for every section 6 menu and context-menu family; shortcut help and disabled reasons. |

Create a state matrix alongside these flows: empty/populated; none/single/multi-selection; source valid/invalid/unsupported; pending/valid/invalid connection; clean/dirty/conflicted; unchecked/checking/running/solved/failed/stopped/stale; missing/finite/nonfinite result; dark/light; pointer/keyboard/touch; source-only/instance/definition ownership. Each relevant state must be visible in a frame or explicitly annotated. An interactive Figma prototype demonstrates representative flows; it is not a functioning solver or proof of round-trip correctness.

Prototype journeys: build → configure → connect → solve → inspect; select → source → edit → stale → re-solve; diagnose → repair → check; select subgraph → extract → enter subsystem; customize → save view → export. Include cancel/back/error branches. Validate typography, clipping, contrast, component hierarchy and links at the target dimensions before handoff.

## 12. Confirmed product decisions — 2026-10-28

1. **Model coverage:** all current engineering domains plus equation/variable visualization. Arbitrary equations are not converted into invented physical components.
2. **Visual language:** hybrid engineering symbols with optional compact result cards.
3. **Device scope:** full desktop and tablet authoring. No phone scope. Tablet designs include touch placement, wiring, routing, configuration and the structured connection list.

Working assumptions unless corrected: “crossfunctional” includes domains and FREES features; shared project files/exports meet initial team handoff needs. Real-time co-editing, new physical solvers, vendor-specific model import, standards-certified P&ID drawing and AI-generated engineering changes are outside this request. Existing supported source constructs remain available in the editor, with clear capability boundaries for visual editing.

## 13. Review record and delivered artifacts

The three product decisions above are confirmed. The [Figma review index](https://www.figma.com/design/SHIyfVVicYxMCbXqzedk8Z?node-id=77-3) opens 27 editable frames/boards on **12 · Proposed schematic workspace**. Captured/current screens remain intact. See the [design handoff](schematic-design-handoff.md) for the frame inventory, all 65 requirement mappings, prototype validation and implementation limits. The mockups and research are delivered; production implementation and acceptance testing remain future work.
