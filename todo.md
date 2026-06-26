# frEES — Acausal Component-Based System Modeling
## Code-Based Improvement Plan & Engineering Report

**Prepared for:** Advisory Board (Mechanical, Thermal, Fluids, HVAC, Control, Automotive/EV)
**Scope of this report:** *Code/text-based* component modeling only. The graphical (Diagram-window) front end is **explicitly deferred** and is not covered here.
**Status:** Design complete; **Phase 0 done, Phase 1 mostly done** — flow-resistance functions; the full core component layer; standard library (13 components, **strict no-default parameters**); Rankine/Brayton/refrigeration cycles; the fan-duct operating point; branching (Splitter/Mixer/HX); **derived-property member access** (`s.T`/`s.x`/…) with per-port stream→fluid inference; and **Phase 1.5 `connect()` + loop-closure** (free-ported instances, native branching, union-find cycle handling) are shipped and green. Only the frontend-coupled §6 state-circuit binding (cycle plots) remains in Phase 1; the §8.5/§8.7 robustness gap is now **closed for single-unknown property inversions** — property-argument seeding (valid base point), range-aware FD-Jacobian perturbation (no NaN-poisoned columns), and a `prop$`-scoped univariate bracketing fallback (crosses the two-phase dome where `dT/dh≈0`) are shipped — the fully-derived Rankine now solves seed-free — leaving only a hypothetical genuine **N×N SCC of coupled property inversions** for the solver, which no shipped example yet hits (see §15 for live status & findings). This document is the agreed reference for Phase 0–6 delivery. **Phase 0 is complete and has been retired from the active plan** (record preserved in §15.0). Revision **R1** incorporates the advisory review; **R3** folds in a multi-domain component catalog (§16), the `model$` variant-selector mechanism (§5.5), and solver-robustness picks (Phase R) from a 1-D system-simulation library survey (see §0).

---

## 0. Revision Log — Advisory Review Response (R1)

Two advisory reviews (multidomain architecture, solver mechanics, UX) judged the design theoretically sound and well-scoped but **under-specified on (a) numerical robustness and (b) text-paradigm traceability**. We concur. R1 adds four workstreams, all reflected in the body below:

1. **Solver robustness (new §8.5–8.10):** automatic variable scaling/equilibration; a shape-preserving pre-fit + analytic-derivative strategy for datasheet Jacobians (the central review question); homotopy/continuation and event handling for phase-change and choked/regime-transition discontinuities; an `inStream`-equivalent for reversing flow; a high-index-DAE topological guard; purely numerical linearization feeding the existing control suite.
2. **Acausal correctness:** reversing-flow enthalpy via `stream_h(...)` upwind blending; physical bounding/branch selection for multi-root compressible & two-phase states.
3. **UX & diagnostics (new §14):** source-mapped error reporting (component-level, never mangled scalar names); a read-only auto-generated topology view (Mermaid *text*, itself code, distinct from the deferred interactive Diagram editor); editor language support (autocomplete/hover/inline unit diagnostics); a `PROBE` construct separating measurement from model; bulk CSV datasheet ingestion; transient state/causality override.
4. **Domain reach (§9):** aerospace/cryogenic validation targets and a zoned regenerative-cooling channel component.

**Points retained as deferred (with rationale):** full Pantelides high-index reduction (we add a *detector + parasitic-compliance* remedy instead, §8.9); symbolic network linearization (impossible over CoolProp tables — we go purely numerical, §8.10); the interactive drag-and-drop Diagram editor (the R1 topology view is read-only Mermaid text, within the code-based remit).

**Revision R2 (scope correction):** removed the Software-Defined-Vehicle / virtual-ECU / FMU framing — frEES is an **off-board, design-time analysis tool**, not a real-time or embedded execution target. The linearized plant feeds frEES's *existing* control suite; a plain `(A,B,C,D)` matrix export (JSON/text) is provided for users who wish to take the model elsewhere. Real-time execution, hardware-in-the-loop, and fixed-step embedded code generation are explicitly out of scope (§8.10, §13).

**Revision R3 (multi-domain reach & solver picks):** a structured cross-study of an established 1-D multi-domain system-simulation component library (thermal, thermal-hydraulic, two-phase/refrigerant, HVAC/air-conditioning, mechanical, electrical, battery, ICE, HEV/EV) sharpened three things, all folded into the phases below:
1. **The component-variant mechanism (new §5.5):** the reference confirms the central design lesson behind the *"one component, many models"* question — the **component icon is decoupled from its physics submodel**, and every component carries a *fidelity ladder* of interchangeable models (e.g. a compressor as isentropic-η → volumetric-η → performance map → variable-displacement). frEES adopts this as a `model$` **variant selector** on `COMPONENT`, with per-variant required-parameter validation. This is the single highest-leverage enabler and gates the domain catalog.
2. **A concrete multi-domain component catalog (new §16),** with each component's variant ladder and frEES dependency, mapped onto Phases 2/3/5/6. It supplies the **electrical**, **mechanical**, **battery**, **ICE**, and **HEV/EV** breadth the EV-thermal flagship needs, plus refrigerant multi-zone heat exchangers and psychrometric HVAC coils.
3. **Solver-robustness picks (Phase R, extending §8.5–8.7):** a readable reference design for a **box-constrained, nominally-scaled Newton with backtracking line search and a rich failure taxonomy**, plus a **stiff variable-order BDF integrator with WRMS error-weight norms** and **discrete-state / zero-crossing event handling** for the `DYNAMIC` engine. These map one-to-one onto frEES's already-recorded §8.5/§8.6/§8.7 gaps (findings 8–9) and gate credible thermal/electrical/battery transients.

**Note on scope filter:** only *physics-fidelity* variants are imported. The reference's causal-plumbing variants (separate submodels per port orientation / flow direction) are **redundant in frEES** — the acausal Newton/Tarjan solver handles direction, so one frEES `COMPONENT` collapses several causal submodels.

---

## 1. Executive Summary

frEES is today a declarative **equation solver** (ANTLR parse → matrix/CALL expansion → unit check → Tarjan SCC blocking → Newton with step-halving), augmented with a transient ODE engine (`DYNAMIC`), a control-systems suite (`tf`/`ss`/`lqr`/`bode`/`c2d`/`pidtune`), a CAS (Symja), a curve **digitizer** + unit-tagged `TABLE`/`Interpolate2D`, and first-order **uncertainty propagation**. Over recent work it also gained complete thermo-fluid physics libraries: real-fluid properties (CoolProp), cubic EOS (SRK/PR), NASA-7 ideal-gas thermochemistry, combustion (adiabatic flame temperature, Kp chemical equilibrium, mixtures, kinetic-theory transport), compressible flow (isentropic/shock/Rayleigh/Fanno/Prandtl–Meyer), and heat exchangers (ε-NTU/LMTD/fin efficiency), alongside psychrometrics.

This plan adds an **acausal, multi-domain, component-based system-modeling layer** on top of that foundation. A *component* is a reusable, parameterized template of acausal equations with typed **ports**; instantiating and connecting components **expands into scalar equations** that flow through the *existing* solver unchanged. The theoretical basis is a **pseudo bond graph** (the formalism underlying Modelica.Fluid and established commercial 1-D multi-domain system simulators).

**Thesis.** This turns frEES into a declarative **system/network modeler** — power cycles, refrigeration/HVAC, flow networks, EV thermal management — that occupies the 0-D lumped, multi-domain, steady-and-transient band, while remaining transparent (every component is visible, editable, unit-checked equations) and web-based. It is, in effect, *EES + the Simscape/Simulink plant-to-control workflow in one document*, achieved with a thin parser/expander layer plus a short list of constitutive functions — **not** a new solver.

**Cost/leverage.** A corpus survey (advisory-library cross-check, §9) confirms the **largest** class of systems (power cycles, refrigeration/AC, HVAC psychrometric trains, heat-exchanger networks) is buildable with **already-shipped physics**; flow networks need **one** new friction function; the EV/mechatronic frontier needs **two** new port-domains (electrical, mechanical) but **no new core physics**.

---

## 2. Theoretical Foundation — The Pseudo-Bond-Graph Model

### 2.1 Bond-graph essentials (the reference frame)
A bond graph represents a physical system by **power flow**. Each bond carries an **effort** `e` and a **flow** `f` whose product is power (`e·f = W`); structural elements are the **0-junction** (common effort, `Σf=0`), **1-junction** (common flow, `Σe=0`), **R** (dissipative), **C** (stores `q=∫f`), **I** (stores `p=∫e`), sources **Se/Sf**, and power-conserving transducers **TF/GY**. Causality is assigned afterward (SCAP) to make the graph computable.

### 2.2 Why frEES is a *pseudo* bond graph (honest positioning)
The fluid port pairs pressure `P` (across) with **mass** flow `ṁ` (through). `P·ṁ` is **not** power, and a flowing stream is a **multibond** carrying mass + energy together, with specific enthalpy `h` riding as a **convective "stream" variable**. Two consequences, both standard for thermo-fluid systems:

1. The `(P, ṁ)` pair is a **pseudo bond** (relaxes `e·f = power` while keeping junction algebra) — exactly the choice established 1-D thermo-hydraulic/thermal system libraries make.
2. **Energy conservation is enforced explicitly by component equations** (and a mixing junction's flow-weighted enthalpy balance), not implicitly by the junction. This is precisely why Modelica.Fluid introduced the `stream` connector.

### 2.3 Structural mapping onto frEES
| Bond-graph concept | frEES realization |
|---|---|
| 0-junction (common effort, `Σf=0`) | a **connection node**: `P` equal, `Σṁ=0` (and `T` equal, `ΣQ̇=0` on heat nodes) |
| 1-junction (common flow, `Σe=0`) | a series element with a pressure drop across it |
| R / C / I | pipe-valve (ΔP–ṁ) / tank-thermal-mass / fluid-inertance-inertia |
| Se / Sf / TF-GY | pump-fan source, boundary stream, turbine→shaft transducer |
| acausal bond → causality assignment | acausal equations → **Tarjan + Newton** perform the causalization |
| integral causality on C/I | `DYNAMIC` `der(X)` states (transient mode) |

### 2.4 Positioning vs. established tools
| Axis | Modelica | Causal 1-D suite | GT-SUITE | **frEES (this plan)** |
|---|---|---|---|---|
| Causality | Acausal DAE | Causal (bond-graph) | 1-D FV flux network | **Acausal algebraic** |
| Primary regime | Transient DAE | Transient DAE | Transient 1-D CFD | **Steady-state (+ `DYNAMIC` ODE)** |
| Connection rule | `connect`: across=, flow Σ=0 | port causality | spatial flux | **across=, flow Σ=0 (+ shared-name)** |
| Spatial physics | lumped | lumped | **1-D gas dynamics** | **0-D control volumes** |
| Engine | DAE + symbolic tearing | var-step integrators | explicit/implicit FV | **existing Newton/Tarjan + DYNAMIC** |
| Form factor | large compiled toolchain | large GUI suite | large GUI suite | **web app, all equations visible** |

frEES deliberately holds **0-D / lumped / multi-domain / acausal**, the band in which a small, transparent, teachable tool beats heavyweight suites for design-point analysis, trade studies, and instruction.

---

## 3. The Connector Model & Domain Registry

### 3.1 Ports and the per-domain junction rules
A *port* bundles an `(across, flow)` pair (plus convective riders). Adding a domain means registering its pair and conservation rule:

| Domain | across (effort) | flow | convective rider | node rule |
|---|---|---|---|---|
| **Fluid** (pseudo) | `P` | `ṁ` | `h` (and optional composition) | `P` equal, `Σṁ=0`, `h` per split/mix |
| **Heat** (pseudo) | `T` | `Q̇` | — | `T` equal, `ΣQ̇=0` |
| **Electrical** (true) | `V` | `I` | — | `V` equal, `ΣI=0` |
| **Mechanical-rotational** | `ω` | `τ` | — | `ω` equal, `Στ=0` |
| **Signal/control** | value | — | — | directed (sensor→controller→actuator) |

`h` at a connection is **equal at a split/pass-through** and **flow-weighted at a mix** (`Σṁ h` energy balance, written by an explicit mixing component). `Q̇` (a heat *rate* in W) is itself the conserved energy flow; `ΣQ̇=0` conserves heat at a thermal node.

### 3.2 Connection semantics — shared-name vs. `connect`
Two surface syntaxes, same expansion:

- **Shared stream name** (terse, ideal for 2-port series chains): reusing a stream name in two components connects them. A *branch* (3+ ports on a node) cannot be expressed by name-sharing alone (it equates `ṁ` too), so it needs an explicit Splitter/Mixer.
- **`connect(a, b, …)`** (Modelica-style, native branching): emits `across` equalities and the single `Σflow=0` for the node — so splitters fall out for free; only mixing (flow-weighted enthalpy) needs a component.

**Recommendation:** implement `connect` as the core (correct for branching from day one), keep shared-name as shorthand for series links.

### 3.3 Worked branching case — regenerative Rankine, open feedwater heater
Topology: turbine extraction (a *split* of mass at the FWH pressure) and an open FWH (a *mix* of extraction steam + feedwater whose "exit = saturated liquid" constraint determines the extraction fraction `y`).

**Connector form** — the split is a bare `connect`; only the FWH carries an explicit energy balance:
```
Turbine   HP(eta=0.88)
Turbine   LP(eta=0.88)
Condenser C1
Pump      P1(eta=0.80)
FWH_open  F1
Pump      P2(eta=0.80)
Boiler    B1

connect(HP.out, LP.in, F1.steam)  # split: P,h equal; ṁ: HP.out = LP.in + F1.steam
connect(LP.out, C1.in)
connect(C1.out, P1.in)
connect(P1.out, F1.water)
connect(F1.out, P2.in)
connect(P2.out, B1.in)
connect(B1.out, HP.in)

HP.in.P = 8e6 ;  HP.in.T = 773
F1.steam.P = 7e5
C1.out.P = 1e4 ; C1.out.x = 0
F1.out.x = 0                      # sat. liquid -> Newton finds the extraction fraction y
HP.in.mdot = 50
```
| | Shared-name | Connector |
|---|---|---|
| Split (extraction) | explicit Splitter component | **free** (3-way `connect`) |
| Mix (open FWH) | explicit component | explicit component (the `stream` nuance) |
| Mass balance at nodes | hand-tracked fractions | **automatic (`Σṁ=0`)** |

---

## 4. Component Definition Language (the code types)

### 4.1 Block grammar
A `COMPONENT … END` block, analogous to the existing `FUNCTION`/`TABLE`/`DYNAMIC` blocks (so it slots into the ANTLR grammar and the `ProcDef` registry):

```
COMPONENT TypeName(port1, port2, ...)        # ports (domain inferred or annotated)
  PARAM name = default                       # parameters with defaults
  PARAM fluid$ = Water                        # string parameter
  local = <expression>                        # component-local variable (auto-mangled per instance)
  out.member = <expression>                   # acausal equation over port members
  Output = <expression>                       # named result -> instance.Output
END
```

**Instantiation** (looks like a CALL but resolves against the component registry):
```
TypeName inst(streamA, streamB, key=val, fluid$=Water)
```

**Port-member references** use a dotted accessor `stream.member` (`s2.P`, `s2.h`, `s2.mdot`), mapped internally to flat solver variables (e.g. `s2$P`) and displayed back as `s2.P`. Locals and named outputs are mangled per instance (`inst.local`, `inst.Output`).

Two R1 statements complete the surface language:
```
PROBE name = <expression>            # measurement separated from the model (§14.4); never affects DOF
h_up = stream_h(in.h, out.h, mdot)   # acausal upwind enthalpy for reversal-capable nodes (§8.8)
```

### 4.2 Standard-library component bodies (representative code types)
**Turbine** (fluid→shaft transducer; isentropic + efficiency, named power output):
```
COMPONENT Turbine(in, out)
  PARAM eta = 0.85,  fluid$ = Water
  s_in  = Entropy(fluid$, P=in.P, h=in.h)
  h_s   = Enthalpy(fluid$, P=out.P, s=s_in)        # isentropic outlet
  out.mdot = in.mdot
  out.h    = in.h - eta*(in.h - h_s)
  W        = in.mdot*(in.h - out.h)                # -> T1.W
END
```
**Pump** (incompressible work):
```
COMPONENT Pump(in, out)
  PARAM eta = 0.7,  fluid$ = Water
  v = Volume(fluid$, P=in.P, h=in.h)
  out.mdot = in.mdot
  out.h    = in.h + v*(out.P - in.P)/eta
  W        = in.mdot*(out.h - in.h)
END
```
**Throttle / expansion valve** (isenthalpic), **Boiler/Heater** (isobaric duty), **Mixer/Splitter** — one to three equations each. **Combustor**, **Nozzle**, **ElectricHeater**, **Pipe**, **HX** are given in §5.

### 4.3 `connect` expansion (what the solver receives)
A `connect(p1, …, pN)` over fluid ports `pk` emits, at a node:
```
p1.P = p2.P = ... = pN.P                  # across equalities (N-1 equations)
(+ p1.mdot) + (+ p2.mdot) + ... = 0       # one Σṁ = 0  (sign: into-component positive)
# enthalpy: equal for a pass-through/split; an explicit mixer writes Σṁ·h for a mix
```
These flat scalar equations join the normal pipeline (unit check → Tarjan → Check/DOF → Newton). The expander is a small **node-resolution pass** added alongside the existing matrix/CALL expansion.

---

## 5. Multi-Stream & Multi-Domain Components

### 5.1 Two-stream heat exchanger (4 fluid ports + internal `Q` coupling)
No mass crosses; one shared `Q` couples both energy balances (reuses the shipped ε-NTU library):
```
COMPONENT HX_eNTU(hot_in, hot_out, cold_in, cold_out)
  PARAM UA,  hot$ = Water,  cold$ = Water
  hot_out.mdot  = hot_in.mdot  ;  hot_out.P  = hot_in.P
  cold_out.mdot = cold_in.mdot ;  cold_out.P = cold_in.P
  Th = Temperature(hot$,  P=hot_in.P,  h=hot_in.h)
  Tc = Temperature(cold$, P=cold_in.P, h=cold_in.h)
  C_h = hot_in.mdot  * Cp(hot$,  P=hot_in.P,  h=hot_in.h)
  C_c = cold_in.mdot * Cp(cold$, P=cold_in.P, h=cold_in.h)
  Cmin = min(C_h, C_c) ;  Cmax = max(C_h, C_c)
  eps = hx_effectiveness('counterflow', UA/Cmin, Cmin/Cmax)
  Q   = eps * Cmin * (Th - Tc)
  hot_out.h  = hot_in.h  - Q/hot_in.mdot
  cold_out.h = cold_in.h + Q/cold_in.mdot
END
```

### 5.2 Heat transferred outside (pipe loss, heater, cooler)
**(a) Baked-in duty** (`PARAM Q` or `PARAM UA, T_amb`) — simplest. **(b) Exposed heat port** for thermal networks / shared walls:
```
COMPONENT Pipe_Qloss(in, out, wall)          # wall = HEAT port (T, Qdot)
  PARAM fluid$ = Water,  UA
  out.mdot = in.mdot ;  out.P = in.P
  Tf = Temperature(fluid$, P=in.P, h=(in.h + out.h)/2)
  wall.Qdot = UA*(Tf - wall.T)               # +out of fluid
  out.h = in.h - wall.Qdot/in.mdot
END
Ambient   amb(T = 300)                        # thermal effort source (Se)
connect(line.wall, amb.port)                  # T equal, ΣQ̇ = 0
```

### 5.3 Cross-domain components
- **Electrical kettle / water boiler** (electrical→thermal transducer):
```
COMPONENT ElectricHeater(in, out, plug)       # plug = ELECTRICAL port (V, I)
  PARAM fluid$ = Water,  R_elem
  plug.I = plug.V / R_elem                     # Ohm's law (R element)
  Q = plug.V * plug.I                          # electrical power -> heat
  out.mdot = in.mdot ;  out.P = in.P
  out.h = in.h + Q/in.mdot                      # heats / boils (two-phase outlet via energy balance)
END
```
  *Time-to-boil* = the transient form: a thermal-capacitance **C** element → `DYNAMIC` `m·cp·der(T) = Q − Q_loss`.
- **Combustor** (chemical→thermal; reuses combustion lib; streams carry **composition**):
```
COMPONENT Combustor(fuel_in, air_in, gas_out)
  PARAM fuel$ = CH4
  gas_out.mdot = fuel_in.mdot + air_in.mdot
  phi = phi_from(fuel_in.mdot, air_in.mdot, fuel$)
  T_out = AdiabaticFlameTempEq(fuel$, phi, T_react, gas_out.P)
  gas_out.comp$ = <equilibrium products>
  gas_out.h     = mix_enthalpy(gas_out.comp$, T_out)
END
```
- **Adiabatic pipe** (dissipative **R**; needs the new `friction_factor`):
```
COMPONENT Pipe_adiabatic(in, out)
  PARAM fluid$ = Water,  L, D, rough
  out.mdot = in.mdot ;  out.h = in.h
  rho = Density(fluid$, P=in.P, h=in.h)
  V   = in.mdot/(rho*pi#/4*D^2)
  f   = friction_factor(Re(rho,V,D,fluid$), rough/D)
  out.P = in.P - f*(L/D)*rho*V^2/2
END
```
- **Convergent–divergent nozzle** (enthalpy→kinetic; reuses compressible-flow lib; uses **stagnation** state):
```
COMPONENT CDNozzle(in, out)
  PARAM fluid$ = Air,  k = 1.4,  A_throat, A_exit, P_amb
  out.mdot = in.mdot
  M_exit = mach_A_Astar(A_exit/A_throat, k, 'supersonic')
  out.P  = in.P0 / P0_P(M_exit, k)
  T_exit = in.T0 / T0_T(M_exit, k)
  V_exit = M_exit * SoundSpeed(fluid$, T=T_exit, P=out.P)
  thrust = in.mdot*V_exit + (out.P - P_amb)*A_exit
END
```

### 5.4 Two stream-port extensions surfaced by these cases
1. **Composition** on the stream (reacting/mixture flows) — reuses `comp$` + `mix_*` already shipped.
2. **Stagnation/velocity** for compressible components — reuses `P0_P`/`A_Astar`/`M2_shock` already shipped.
The base port stays `(P, h, ṁ)`; specialized components carry the extra quantities as locals/port riders.

### 5.5 Component variant selection — the `model$` mechanism (R3)
**The "one component, many models" problem.** A single physical component is modeled many ways at different fidelities — a compressor as *isentropic-efficiency*, *volumetric-efficiency*, *performance-map*, or *variable-displacement*; a battery as *internal-resistance*, *Thévenin RC*, or *electrochemical*; a friction interface as *Coulomb*, *Stribeck*, or *LuGre*. The established system-modeling answer is to **decouple the component (its ports and role in the network) from its physics submodel**, and let the user pick the submodel per instance. frEES adopts this directly:

```
COMPONENT Compressor(in, out)
  PARAM model$ = isentropic            # variant selector
  VARIANT isentropic   REQUIRE eta, fluid$
    s_in  = Entropy(fluid$, P=in.P, h=in.h)
    h_s   = Enthalpy(fluid$, P=out.P, s=s_in)
    out.h = in.h + (h_s - in.h)/eta
  VARIANT volumetric   REQUIRE eta_v, disp, rpm, fluid$    # ṁ from displacement & ρ
    rho      = Density(fluid$, P=in.P, h=in.h)
    out.mdot = eta_v * disp * (rpm/60) * rho
    ... isentropic head on top ...
  VARIANT map          REQUIRE map_mdot, map_eta           # digitized performance maps (§7)
    out.mdot = map_mdot(out.P/in.P, rpm)
    eta      = map_eta(out.P/in.P, rpm)
    ...
  out.mdot = in.mdot                    # shared (non-variant) equations
  W        = in.mdot*(out.h - in.h)
END
Compressor C1(s1, s2, model$=map, map_mdot=..., map_eta=..., rpm=3000)
```

**Semantics.** The expander emits **only the selected variant's body** plus the shared equations. `REQUIRE` lists the parameters that variant needs; supplying a parameter the chosen variant doesn't use, or omitting one it does, is a **hard error** (consistent with the strict no-default-parameters rule, finding 15.1). An unknown `model$` value is a hard error listing the valid variants.

**Why this is the keystone (gates the §16 catalog).** Every domain in the catalog ships its components as fidelity ladders, so without `model$` each ladder would fork into N separate `COMPONENT` types. The grammar addition is small (a `VARIANT … REQUIRE …` block inside `COMPONENT`, selected at expansion time before the existing clone/substitute pass), and it reuses the datasheet-map machinery (§7) for the `map` variants. **Build this first in Phase 2.**

**✅ SHIPPED** (grammar `VARIANT … [REQUIRE …] … END` + `model$` selector; `ComponentDef.Variant`; `ComponentExpander` selection — see §15.2 finding 10). A `REQUIRE` name is a variant-scoped parameter (auto-declared, no default), required only when its variant is selected, so a `map` compressor never demands the isentropic variant's `eta`. Unknown `model$`, a missing selector, or a missing required parameter of the selected variant are all hard errors. Tests: `core/ComponentVariantTest` (6, green); full backend suite green.

---

## 6. Binding to Fluid States & Cycle Plotting (reuse of existing machinery)

### 6.1 A stream **is** a state
`(fluid, P, h)` fully determines a thermodynamic state — exactly what frEES `STATE TABLE` points are (`StateTableDef = {name, variables, fluid}`; `CyclePathResolver` back-fills missing properties via CoolProp and traces the T-s/P-h path). In a flowsheet, **each stream is a state point** and `ṁ` is extra payload the plotter ignores.

### 6.2 The flowsheet supplies what the plotter currently guesses
| `CyclePathResolver` heuristic today | Supplied exactly by the component model |
|---|---|
| state **fluid** (declared in STATE TABLE) | known per stream from `fluid$`/`STREAM` |
| cycle **ordering** (from state numbers) | the `connect`/shared-name graph |
| **process type** between states (guessed) | the component defines it (boiler/HX isobaric, pump/turbine isentropic+η, throttle isenthalpic) |

So binding = letting the expander emit, per fluid-circuit, a `StateTableDef`-equivalent plus an ordered `{streamA→streamB, process}` edge list; `CyclePathResolver` then draws **exact** cycle curves instead of heuristics. Legacy numbered-state documents remain untouched (fallback path).

### 6.3 Multiple circuits for multi-fluid systems (radiator example)
A circuit = a **connected component of the stream graph, keyed by fluid**. A radiator couples coolant and air through **heat only** (no mass crossing), so the stream graph has two connected components → **two `StateTableDef`s → two property diagrams**, auto-partitioned. Because a multi-stream component knows both streams *and* `Q`, the expander can also emit the **T–Q̇ composite/pinch diagram** (the natural HX plot). Generalizes to N circuits (combined cycle: gas + steam + cooling water).

---

## 7. Datasheet-Defined Components

### 7.1 Digitizer → TABLE → component body
A datasheet curve is a constitutive **equation that happens to be interpolated**. The existing curve **digitizer** produces unit-tagged `TABLE` blocks; a component references them via `Interpolate`/`Interpolate2D`:
```
TABLE FanDP(Q [m^3/s], N [rpm]) [Pa]   # digitized pressure-rise map
  ... points ...
END
TABLE FanAmp(Q [m^3/s], N [rpm]) [A]   # digitized current map
  ... points ...
END

COMPONENT Fan(in, out)
  PARAM rpm,  fluid$ = Air,  eta = 0.6
  rho = Density(fluid$, T=in.T, P=in.P)
  Q   = in.mdot / rho
  dP  = FanDP(Q, rpm)                   # datasheet pressure rise
  I   = FanAmp(Q, rpm)                  # datasheet current
  out.mdot = in.mdot
  out.P    = in.P + dP
  out.h    = in.h + dP/(rho*eta)
END
```

### 7.2 The fan–duct operating point is the *solve*, not a graphical intersection
```
Fan  F1(a, b, rpm=1450, fluid$=Air)
Duct D1(b, c, L=100, D=0.3, rough=0.00015, fluid$=Air)
a.P = 101325   a.T = 293
c.P = 101325
```
collapses to one nonlinear equation `FanDP(Q) = f(Q)·(L/D)·ρV²/2` in the single unknown `Q`, which the **existing Newton (with numerically-differentiated table interpolation)** solves directly — the curve intersection engineers draw by hand. Outputs (`dP_op`, `I_op`, `P_elec = V·I`, `η_sys = Q·dP/P_elec`) come from the same solve (the **electrical** payoff). Two conveniences worth building in: **affinity-law speed scaling** from one digitized curve (`Q∝N`, `ΔP∝N²`, `P∝N³`), and **inverse use** (pin `Q_op`, solve for `D`, `L`, or `rpm` — acausal).

The pattern generalizes to **any** datasheet component (pump head curves, compressor maps, valve Cv, motor torque–speed, battery OCV–SOC): *digitize → TABLE → reference in component → Newton finds the operating point.*

---

## 8. Solver Integration & Analysis Modes

### 8.1 Expansion pass (the only genuinely new machinery)
For each instance: clone the body equations → substitute ports → actual streams, params → values, locals/outputs → `inst.local`; resolve `connect`/shared-name nodes into `across`-equalities + `Σflow=0`; **emit flat scalar equations** into the equation list (the same place matrix/`SolveLinear`/CALL ops already expand). Everything after — unit check, Tarjan blocking, Check (DOF), Newton — is **unchanged**.

### 8.2 Steady ↔ transient from one network
Bond-graph causality identifies states: **C** stores `q=∫f` (tank mass, thermal energy, charge), **I** stores `p=∫e` (fluid inertance, rotational inertia). The expander **auto-classifies** storage variables and emits `der(X)` equations for the existing `DYNAMIC` solver. The *same* model runs **steady** (drop storage → Newton operating point) or **transient** (storage → ODE integration: time-to-boil, warm-up, tank drain). *Limit:* index-1 DAEs (states + algebraic constraints), the lumped-system sweet spot; high-index kinematic loops (Pantelides reduction) are out of scope.

### 8.3 Linearization → state-space → control (headline synergy)
Around a solved operating point, linearize the component network (numerically via the Jacobian the solver already forms, or symbolically via Symja) into `(A,B,C,D)` — inputs = sources/actuators, outputs = sensor port variables, states = the C/I storage. The **entire shipped control suite then applies** (`ss`/`tf`/`bode`/`step`/`margin`/`lqr`/`place`/`c2d`/`pidtune`). This delivers the Simscape→Simulink workflow in one document: *build physical plant → auto-linearize → design/tune controller → close the loop with `DYNAMIC`*. A **signal/control domain** (sensors, controllers, modulated actuators) makes closed-loop mechatronics native.

### 8.4 Uncertainty & hierarchy
Component parameter tolerances (datasheet `UA`, `η`, `Cv`) propagate through the operating-point solve to KPIs via the existing first-order/RSS propagation; the same Jacobian yields **sensitivity ranking**. Components compose into **subsystems** (HX + pump + valve = "cooling loop") that expose ports — hierarchical bond graphs that scale to plant-level models.

### 8.5 Automatic variable scaling (equilibration) — *mandatory; benefits all of frEES*
A multidomain Jacobian mixes `P~10⁵ Pa`, `ṁ~10⁻² kg/s`, `h~10⁵ J/kg`, `I~10⁻³ A`, which is severely ill-conditioned. Before each Newton factorization the solver applies **per-variable nominal scaling** (domain-aware defaults — `P` by 10⁵, `ṁ` by a network-characteristic flow, etc.) plus **row/column equilibration** so all unknowns and residuals are `O(1)`. Added to the existing `NewtonSolver` as a scaled Newton step, it improves conditioning for the *whole tool*, not only components.

### 8.6 Jacobian for datasheet / nonlinear maps — *direct answer to the review's central question*
Raw piecewise-linear `Interpolate2D` has kinked (or zero) numerical derivatives that stall step-halving. Strategy:
1. **Pre-fit at table-build time; never raw-interpolate inside Newton.** Digitized points are fitted *once* into **C¹ shape-preserving** forms via the existing `CurveFitter`: **monotone cubic (PCHIP)** for monotone curves (fan/pump head, valve `Cv`) — preserves monotonicity with no overshoot — and **penalized/shape-preserving B-splines** for 2-D maps (compressor, efficiency). The component evaluates the smooth fit.
2. **Analytic derivative of the fit feeds the Jacobian** — closed-form `∂/∂Q` supplied as that variable's Jacobian column, not finite-differenced across breakpoints.
3. **Scaled finite differences** (relative + absolute, sized to each variable's nominal magnitude per §8.5) for the remaining black-box entries (e.g. CoolProp).
4. **Bounding & branch selection** clamp iterates to physical ranges (`x∈[0,1]`, `T>0`, supersonic `M≥1`) and pick the physical root via the existing regime selectors (`mach_A_Astar(...,'supersonic')`, etc.).

Net: a datasheet map enters the solver as a **smooth, analytically-differentiable curve with a unique operating point**, not a jagged lookup.

### 8.7 Phase change, choking & regime transitions (stiff convergence)
- **Saturation-dome discontinuities** (evaporator/condenser): a **homotopy/continuation** mode pulls Newton into the basin — a parameter `λ` morphs a relaxed start (ideal-gas / single-phase surrogate) into the full real-fluid network. Offered as a solver option for cycles that fail a cold start (step-halving alone is insufficient at phase boundaries).
- **Choked/compressible multi-root** (`CDNozzle`): bounded Newton + the regime selector avoid non-physical (imaginary-Mach) roots; choking (`A=A*`, `M=1`) is handled as a branch event.
- **Friction laminar↔turbulent** and other `if/max/min` switches register as **events in the `DYNAMIC` solver** so the integrator restarts cleanly at the discontinuity instead of crashing on a derivative jump.

### 8.8 Reversing flow & acausal enthalpy (`inStream` equivalent)
Convective `h` is well-defined only with a known flow direction; in reversal-capable networks (natural-convection loops, dampers, redundant cooling) `ṁ` can change sign. We provide a built-in `stream_h(in_h, out_h, mdot)` that **selects the upstream enthalpy by the sign of `ṁ` with smooth (tanh) blending near the zero crossing** — the frEES analogue of Modelica's `inStream()`/`actualStream()`. This keeps the model truly acausal and prevents discontinuity crashes when `ṁ→0` in transients. Default series components assume forward flow (correct and cheaper for steady design points); reversal-capable nodes opt into `stream_h`.

### 8.9 High-index DAE guard (topological)
Acausal topologies can reach index ≥ 2 purely from connections — **rigidly coupling two `C` elements** (two thermal masses tied directly), **two `I` elements** (two inertias on a solid shaft), or an incompressible pump filling a rigid pipe (pressure becomes an algebraic constraint → water-hammer territory). Rather than fail silently in Tarjan with a singular matrix, the `ComponentExpander` runs a **structural index check** that detects rigidly-coupled storage elements and emits a **descriptive compile-time error** naming the offending components and the standard remedy — insert a **parasitic-compliance component** (a small capacitance/spring/damper, shipped in the library). Full Pantelides index reduction stays out of scope for v1; this guard converts a silent numerical failure into an actionable message.

### 8.10 Linearization for the control suite (off-board, design-time)
Symbolic differentiation of property libraries (CoolProp = interpolated Helmholtz tables) is impossible, so **network linearization is purely numerical**: reuse the **scaled finite-difference Jacobian the Newton solver already forms** at the operating point to extract `(A,B,C,D)` (CAS is retained only for closed-form algebraic sub-models). Robust perturbation scaling (§8.5) guards conditioning. The state-space model feeds frEES's **existing control suite** (`ss`/`tf`/`bode`/`lqr`/`place`/`c2d`/`pidtune`) for design-time analysis and tuning, and can be emitted as a plain `(A,B,C,D)` matrix set (JSON/text) for use elsewhere.

**Scope boundary (R2):** frEES is an **off-board, design-time** modeling and analysis environment — steady operating points plus **variable-step** `DYNAMIC` transients. It is **not** a real-time or embedded execution target: real-time / fixed-step code generation, hardware-in-the-loop, and virtual-ECU/SDV deployment are explicitly out of scope. There are therefore no real-time execution constraints on the architecture.

---

## 9. Application Catalog & Readiness (advisory-corpus grounded)

**Key:** ✅ buildable now (shipped physics) · 🟡 small constitutive add · 🔶 new port-domain/element (physics already in engines)

| Domain | Components | Status |
|---|---|---|
| **Power cycles** | pump, turbine, compressor, boiler, condenser, HX/regenerator, throttle, open/closed FWH, reheat, combustor, nozzle | ✅ |
| **Refrigeration / heat-pump / auto-A/C** | compressor (isentropic η; `η_v` map 🟡), condenser, evaporator, expansion valve/TXV/capillary (isenthalpic; TXV superheat-control 🟡), receiver, IHX | ✅ |
| **HVAC / psychrometric** | cooling coil (sensible+latent+bypass factor), heating coil, humidifier, mixing box/economizer, fan, duct, VAV | ✅ (cooling tower / Merkel 🟡) |
| **Flow networks** | pump/fan curve (datasheet), pipe/duct (Darcy), valve/orifice (`Cv`/`K`), nozzle/diffuser, plenum/tank | 🟡 (need `friction_factor`, `K`, `Cv`); nozzle ✅; tank ✅ via `DYNAMIC` |
| **EV powertrain / battery thermal** | battery ECM (`V=V_oc(SOC)−R₀I`; `Q̇=I²R₀−I·T·dV_oc/dT`; `dSOC/dt=−I/3600Q₀`), lumped battery thermal, motor/inverter (η-map), cold plate, radiator, chiller, cabin HVAC | 🔶 elec + mech domains; thermal/HX ✅ |
| **Aerospace / propulsion (extended, R1)** | rocket regenerative-cooling channel (compressible-flow array ↔ thermal-mass wall, **zoned**), turbopump, cryogenic/supercritical propellant lines | 🟡 zoned multi-stream; cryo/supercritical EOS validation |

**Extended validation (R1):** confirm CoolProp/cubic-EOS behavior at **cryogenic and supercritical** boundaries (LOX/LH₂/LCH₄). The regenerative-cooling channel is a **zoned** multi-stream component — discretized into a few axial cells (zones, *not* a CFD grid) — coupling the shipped compressible-flow and HX libraries to a wall thermal mass; it stress-tests the pseudo-bond model at its scope edge.

**Systems buildable now (✅):** ideal/non-ideal Rankine (+reheat, +open/closed FWH regeneration), Brayton (+intercooler, +regenerator), combined cycle (HRSG), vapor-compression refrigeration/heat-pump/automotive A/C, HX networks, single-zone HVAC psychrometric trains, combustion/flame, nozzle/propulsion.
**One small-add away (🟡):** pump-pipe / fan-duct networks, chilled-water plants, cooling-tower loops, VAV systems.
**Flagship multi-domain (🔶):** **EV battery thermal management** — battery ECM → cold plate → coolant pump → chiller (VCR) / radiator → cabin HVAC, with motor/inverter heat loads. Every constitutive law already exists; needs only the electrical + mechanical port-domains and a few digitized maps.

---

## 10. Phased Implementation Plan (code-based)

> Each phase is independently shippable, fully tested against textbook/corpus values (validation methodology in §12), and leaves the existing engines untouched.

### 10.0 Phase status at a glance

| Phase | Title | Status | Outstanding work |
|---|---|---|---|
| **0** | Constitutive function gaps | ✅ **complete** | — (shipped; see §15.0). *Removed from the active plan.* |
| **1** | Core component layer (fluid, steady) | 🟢 **essentially complete** | only §6 state-circuit binding (cycle plots, frontend-coupled) |
| **R** | Solver robustness & diagnostics | 🟡 **partial** | single-unknown property path shipped; remaining: §8.5 scaling/equilibration, box-constrained + backtracking Newton, stiff BDF + event handling, source-mapped diagnostics, Mermaid topology, high-index guard |
| **2** | Multi-domain ports + variant selector | ✅ **complete** | all 4 domains + `model$` selector shipped, and **cross-domain composition demonstrated** (electrical→thermal transducer solves end-to-end, §15.2.14). Remaining component *breadth* (motor/inverter η-map, more transducers) folded into Phase 6; storage elements into Phase 3 |
| **3** | Transient mode (storage → `DYNAMIC`) | ⬜ **not started** | C/I storage auto-classification; capacitive volume / thermal-mass / SOC states; stiff integrator + events |
| **4** | Plant → control coupling | ⬜ **not started** | numerical linearization → `(A,B,C,D)` → control suite; signal domain + controller components |
| **5** | Datasheet component wrappers | ⬜ **not started** | shape-preserving map pre-fit; compressor/pump/fan curves; valve `Cv`; `η_v` & efficiency maps |
| **6** | Domain breadth & flagship system | ⬜ **not started** | full §16 catalog (battery, motors, ICE, HEV/EV, refrigerant multi-zone HX, psychrometrics); EV battery thermal-management flagship |

*(The detailed per-domain component catalog that feeds Phases 2/3/5/6 is §16.)*

### Phase R — Solver robustness & diagnostics (cross-cutting, R1 + R3) — 🟡 **partial**
Not a sequential phase but a robustness spine, prioritized because everything else depends on it.

**Shipped (single-unknown property path, finding 9):** property-argument seeding (valid base point, §8.5a); range-aware FD-Jacobian perturbation (no NaN-poisoned columns, §8.5b); `prop$`-scoped univariate bracketing across the two-phase dome + the NaN-not-converged correctness fix (§8.7c). The fully-derived Rankine solves seed-free.

**Remaining:**
- **Box-constrained, nominally-scaled Newton (R3, extends §8.5/§8.6).** Give every unknown a `[min, max, nominal]` triple and every residual a nominal scale, then take a **scaled** Newton step inside the box. Per-variable nominals come from the unit checker's dimensions (`P~10⁵`, `T~300`, `h~10⁵`, `ṁ~1`, `I~10⁻³`, `V~1`); bounds keep CoolProp/EOS arguments inside their valid range (the documented `P=-nan` root cause, finding 8). This is the load-bearing §8.5 equilibration fix and the prerequisite for stiff real-fluid + electrical networks.
- **Backtracking line search + failure taxonomy (R3, §14.1).** Replace bare step-halving with a backtracking line search that detects *local-minimum*, *singular-Jacobian* (perturb-and-retry), *out-of-bounds*, and *max-iteration* outcomes as **distinct** results — feeding component-level diagnostics ("`Pump1` under-specified") instead of a generic "did not converge".
- **Source-mapped diagnostics (§14.1); read-only Mermaid topology (§14.2); high-index structural guard (§8.9).**
- **With Phase 3 (transient):** a **stiff variable-order BDF integrator with WRMS error-weight norm** `ewt=1/(rtol·|y|+atol)` (R3) — thermal masses + electrical RC + battery are stiff; the current explicit `DYNAMIC` path stalls. Either a compact SDIRK/BDF or a JNI-bound stiff solver (the CoolProp pattern). Plus **discrete-state / zero-crossing event handling** (R3, §8.7): components declare an integer mode + switching function; the integrator detects crossings and restarts the step (friction stick↔slip, flow reversal, valve/diode on↔off). Prefer **smooth (tanh) regularization** where accuracy allows (already used by `stream_h`, §8.8); reserve true events for genuine on/off. Also `stream_h` reversing-flow (§8.8); causality override (§14.6).
- **With Phase 4 (control):** purely numerical linearization feeding the existing control suite, plus a plain `(A,B,C,D)` matrix export (§8.10).
- **With Phase 5 (datasheets):** shape-preserving pre-fit + analytic-derivative Jacobian (§8.6); CSV ingestion (§14.5).
- **As needed:** homotopy/continuation mode (§8.7) for genuine N×N coupled property inversions (no shipped example hits it yet).

**Acceptance:** an ill-scaled multidomain network (P, ṁ, I together) converges with scaling on and fails without; a singular/over-specified component yields a component-named diagnostic (not a mangled scalar); a datasheet-fed fan-duct converges from a cold start; a stiff thermal+electrical transient integrates without step collapse; a reversing-flow loop integrates through `ṁ=0`; a friction stick-slip / valve switching transient restarts cleanly at the event.

### Phase 1 — Core component layer (fluid domain, steady) — 🟢 **essentially complete** (see §15)
Grammar (`COMPONENT … END` + instantiation + dotted member access), AST/registry, the expansion pass, `connect(...)` + loop-closure (Phase 1.5), and the full standard fluid library (Pump, Turbine, Compressor, Boiler, Condenser, Throttle, Pipe, Fan, Duct, FanCurve, Splitter, Mixer, HeatExchanger, Source, Sink, Nozzle — strict no-default parameters) are **shipped and green**; Rankine/Brayton/refrigeration cycles and the fan-duct operating point reproduce hand-written values with zero unit warnings.
- ⏳ **State-circuit binding** (§6) — *the one remaining item:* stream→state adapter; per-fluid `StateTableDef` (fluid grouping already available via `streamFluids()`); `CyclePathResolver` taught member-name states + per-edge process. **Frontend-coupled** (see §15.2.6) — best done with frontend cycle-plot wiring.

### Phase 2 — Multi-domain ports + the variant selector (R3-enriched)
- ~~**`model$` variant mechanism (§5.5) — build first.** The `VARIANT … REQUIRE …` block + selection-at-expansion pass; per-variant required-parameter validation; reuse for the datasheet-map variants. Gates every fidelity ladder in §16.~~ ✅ **shipped** (`ComponentVariantTest`, see §15.2.10).
- ~~**Heat port `(T, Q̇)`** + primitives (§16.1): conduction, convection, radiation, thermal source/ambient.~~ ✅ **shipped** (domain-aware `connect`: `T` equal, `ΣQ̇=0` Kirchhoff balance; `ComponentThermalTest`, see §15.2.11). Remaining: contact resistance, thermal sensor, two-stream HX with exposed wall, baked-in-duty components.
- ~~**Electrical port `(V, I)`** + primitives (§16.5): R, source, ground; **battery ECM (R-int)** stub.~~ ✅ **shipped** (domain-aware `connect`: `V` equal, `ΣI=0` Kirchhoff; `ComponentElectricalTest`, see §15.2.12). Remaining: L/C (Phase 3 storage), diode/switch, ElectricHeater (kettle/boiler), motor/inverter η-map transducer.
- ~~**Mechanical-rotational port `(τ, ω)`** + primitives (§16.4): torque/speed source, rotational damper, ground, gear-ratio TF.~~ ✅ **shipped** (domain-aware `connect`: `ω` equal, `Στ=0` Kirchhoff; `ComponentMechanicalTest`, see §15.2.13). Remaining: inertia/spring (Phase 3 storage), friction/clutch (Phase 3 events), planetary gear, translational `(F,v)` port, turbine→shaft / motor-generator transducers (Phase 6).
**Acceptance:** ✅ **met** — a `model$`-selected compressor picks the right variant body and rejects wrong/missing params; all three new node rules validated (`ΣQ̇=0`, `ΣI=0`, `Στ=0`); a battery-through-R0 circuit and a torque-driven gear train solve; **and a cross-domain transducer (`HeatingResistor`, electrical→thermal) composes the electrical and heat networks in one solve** (`ComponentCrossDomainTest`, §15.2.14) — the steady-state core of the EV battery-thermal pattern.

### Phase 3 — Transient mode (storage → `DYNAMIC`, R3-enriched)
- C/I storage elements; auto-classification of states; `der(X)` emission. Concrete storage components (§16.2/§16.6): **capacitive fluid volume / accumulator**, **lumped thermal mass** (`m·cp·der(T)=ΣQ̇`), **battery SOC** (`dSOC/dt=−I/3600Q₀`) + battery thermal node.
- **Stiff integrator + event handling (Phase R).** Requires the stiff BDF (thermal/electrical/battery stiffness) and zero-crossing events for **friction (Stribeck/LuGre)** and **clutch** stick↔slip, **flow reversal**, **valve/diode** switching (§16.4/§16.5).
**Acceptance:** kettle time-to-boil and a tank fill/drain integrate correctly; a battery warm-up (`I²R₀` self-heat → thermal node) integrates stably under the stiff solver; a clutch lock-up event restarts cleanly; steady limit recovers the Phase-1 operating point.

### Phase 4 — Plant → control coupling
- Numeric (and Symja-symbolic) linearization of a solved network → `(A,B,C,D)`; hand-off to `ss`/`tf` and the control suite; signal domain + PID/state-feedback/observer controller components; closed-loop simulation via `DYNAMIC`.
**Acceptance:** a tank-level or superheat loop: auto-linearized plant → `pidtune`/`lqr` → closed-loop `DYNAMIC` meets a step-response spec.

### Phase 5 — Datasheet component wrappers (R3-enriched)
- Shape-preserving map pre-fit (§8.6) feeding the `map` variants (§5.5). Pump/Fan/Compressor curve components (digitizer + `Interpolate2D`) + affinity-law scaling; valve `Cv`/orifice; **compressor `η_v` (volumetric-efficiency) and performance-map variants**; **motor torque-speed / efficiency map**; **battery OCV-SOC curve**. These are the `map`/`volumetric` rungs of the §16 ladders.
**Acceptance:** a datasheet fan reproduces §7's operating point; affinity scaling matches the fan laws; a map-variant compressor matches its digitized map; inverse solve (find `rpm` for target `Q`) converges.

### Phase 6 — Domain breadth & flagship system (R3-enriched, catalog → §16)
Build out the §16 catalog, each component as a `model$` ladder:
- **Refrigerant / HVAC:** AC compressor (isentropic-η → volumetric-η → map → variable-displacement), **multi-zone / moving-boundary evaporator & condenser** (subcool/two-phase/superheat zones), **TXV** (superheat-controlled), receiver/accumulator, **psychrometric cooling/heating coil** (sensible + latent + bypass factor).
- **Electrical & battery:** battery **ECM ladder** (R-int → 1RC/2RC Thévenin → electrochemical) with **thermal coupling** (`Q̇=I²R₀ − I·T·dV_oc/dT`) at cell↔pack scope; ultracap; **electric machine ladder** (η-map → PMSM dq → flux-map) + inverter η-map.
- **ICE & powertrain:** **mean-value / map engine** (BSFC/torque map + FMEP friction); **turbocharger** (compressor-map + turbine-map + shaft); **friction (Stribeck/LuGre)**, **clutch** (incl. dual-clutch), gear / planetary; **vehicle longitudinal road-load**; transmission (AT/DCT/fixed-ratio).
- **HEV/EV supervisory:** rule-based → **ECMS** energy-management; drive-cycle source (reuse `TABLE`).
- **System glue:** subsystem/hierarchy support; system-level uncertainty/sensitivity.
**Acceptance:** an EV pack-cooling loop (battery ECM + thermal node → cold plate → pump → chiller/radiator, with motor/inverter heat loads) reaches a steady operating point and a transient warm-up profile; a vapor-compression A/C loop with multi-zone evaporator/condenser + TXV solves; KPI sensitivity ranking produced.

---

## 11. Architecture Impact — Files

**New (backend):**
| Artifact | Purpose |
|---|---|
| ANTLR grammar rule (`Frees.g4`) | `COMPONENT … END` + instantiation + `connect` |
| `ast/ComponentDef.java` | component template (ports, params, locals, outputs, body) |
| `parser/ComponentExpander.java` | clone/substitute/mangle + node resolution → scalar equations |
| `props/.../components/` standard library | built-in `COMPONENT` definitions |
| `props/FrictionFactor.java` (+ helpers) | Colebrook/Moody, minor losses, Cv (Phase 0) |
| `parser/DomainRegistry.java` | per-domain `(across, flow)` + junction rule |
| `core/Linearizer.java` | operating-point → `(A,B,C,D)` (Phase 4) |
| `core/SolverScaling.java` | per-variable nominal scaling + Jacobian equilibration (§8.5) |
| `parser` `VARIANT`/`REQUIRE` block | `model$` component-variant selection at expansion (§5.5, R3) |
| `core` bounded/scaled Newton + backtracking | `[min,max,nominal]` box, line search, failure taxonomy (Phase R, R3) |
| `core/ode/` stiff BDF integrator + `EventHandler` | WRMS-norm BDF + zero-crossing/mode events for `DYNAMIC` (Phase R, R3) |
| `core/Homotopy.java` | continuation solver mode for phase-change/stiff starts (§8.7) |
| `props/StreamUpwind.java` | `stream_h` reversing-flow enthalpy, tanh-blended (§8.8) |
| `parser/StructuralIndexCheck.java` | high-index / rigid C-I detector + messages (§8.9) |
| `parser/ProvenanceMap.java` | scalar-equation → component/port source mapping (§14.1) |
| `api/TopologyGraph.java` | Mermaid emitter from the component edge list (§14.2) |
| `core/StateSpaceExport.java` | numerical `(A,B,C,D)` extraction + plain matrix (JSON/text) export (§8.10) |
| `CurveFitter` extension | PCHIP / shape-preserving B-spline pre-fits for maps (§8.6) |

**Modified (backend, established 3-site + plotting):** `ast/Evaluator.java`, `units/UnitChecker.java`, `parser/FunctionRegistry.java`, `parser/AstBuilder.java`, `parser/EquationParser.java`, `api/CyclePathResolver.java`, `ast/StateTableDef.java`.

**Reused unchanged:** `core/EquationSystemSolver` (Newton/Tarjan), `core/ode/*` (`DYNAMIC`), control suite, CAS (Symja), digitizer/`TABLE`/`Interpolate2D`/`CurveFitter`, uncertainty propagation, CoolProp/EOS/NASA-7/combustion/compressible/HX/psychrometric libraries.

---

## 12. Validation Strategy
- **Per-component unit tests** cross-checked against advisory-corpus references (the practice already used for the shipped libraries: Çengel for cycles/compressible flow; Kays & London / Kakaç for ε-NTU; Cantera/GRI-Mech for thermochemistry; Çengel Table A-28 for equilibrium Kp).
- **End-to-end flowsheet tests** (mirroring the existing `CycleExamplesTest` harness): each component-built cycle must (i) reproduce the hand-written equation example's numbers and (ii) derive units with **zero warnings** (`solver.checkUnits`).
- **Mode-consistency tests:** transient steady-state limit recovers the Phase-1 operating point; linearized plant step response agrees with a small-signal `DYNAMIC` run.
- **Regression:** full backend suite green at every phase boundary; frontend `tsc` + Vite build green.

---

## 13. Scope Boundaries & Risk

**In scope (this report):** 0-D/lumped, multi-domain, acausal, steady + index-1 transient, datasheet-driven, control-coupled, **text/code-based** component modeling.
**Out of scope:** the **Diagram-window graphical front end (deferred by direction)**; spatial CFD/FEM; high-index DAE index reduction; finite-rate chemical kinetics; power-electronics switching; **real-time / fixed-step embedded code generation, hardware-in-the-loop, and virtual-ECU/SDV deployment** (frEES is an off-board, design-time tool — R2).

| Risk | Mitigation |
|---|---|
| Grammar/expander complexity (new block + node resolution) | Mirror the proven `FUNCTION`/`TABLE`/`DYNAMIC` block + matrix-expansion patterns; expansion output is plain equations the solver already handles |
| Acausal DOF mis-specification by users | The existing Check (zero-DOF + equation↔variable matching) gates Solve; component count makes DOF explicit |
| Newton robustness on stiff networks (table interpolation, branch nodes) | Reuse step-halving + good initial guesses; datasheet curves are monotone (unique operating point) |
| Enthalpy at mixing junctions (the `stream` nuance) | Handled explicitly by mixer components (flow-weighted `Σṁ·h`), documented |
| Compressible/reacting streams exceed `(P,h,ṁ)` | Carry stagnation/composition as component locals/riders; reuse shipped compressible/mixture libraries |
| High-index DAE in transient mode | §8.9 structural detector + shipped parasitic-compliance components; index-1 boundary documented |
| Ill-conditioned multidomain Jacobian (mixed P/ṁ/h/I scales) | §8.5 automatic per-variable scaling + equilibration (mandatory) |
| Non-convergence on user datasheet maps | §8.6 shape-preserving pre-fit (PCHIP/B-spline) + analytic derivatives + bounding/branch selection |
| Phase-change / choking discontinuities | §8.7 homotopy/continuation + `DYNAMIC` event handling + regime selectors |
| Reversing flow breaks convective enthalpy | §8.8 `stream_h` upwind with tanh blending through `ṁ=0` |
| Opaque "flat equation" errors | §14.1 source-mapped, component-level diagnostics; mangled names never exposed |
| Topology unreadable past ~10 components | §14.2 read-only Mermaid view + §14.3 editor autocomplete/hover/inline diagnostics |
| State-space ill-conditioning for the control suite | §8.10 scaled numerical Jacobian; design-time hand-off to the internal control suite only |

---

## 14. User Experience & Diagnostics (text paradigm) — *R1*

> The reviews correctly flag that *blind* acausal text modeling fails past ~10 components. These diagnostics keep the code-based workflow tractable without the deferred interactive Diagram editor.

### 14.1 Source-mapped diagnostics (no mangled names)
The `ComponentExpander` **tags every emitted scalar equation with provenance** (instance, original component equation, port, source line). The Check/DOF analyzer then reports at the **component level**: *"Component `Pump1` is under-specified — `out.h` is unbound (energy balance missing)."* or *"Over-determined at the node connecting `HP.out, LP.in, F1.steam`."* Mangled scalar names (`a$P`) never surface to the user.

### 14.2 Read-only topology view (Mermaid text)
From the `ComponentDef` AST + connection edge list, frEES emits a **Mermaid flowchart (text)** of the component graph — ports as nodes, `connect`s as edges, per-fluid circuits color-grouped — renderable in the web app for instant visual validation of the script. It is **read-only and itself code (Mermaid markup)** — a diagnostic, explicitly distinct from the deferred interactive Diagram editor.

### 14.3 Editor language support
A CodeMirror language extension for the `COMPONENT` grammar: **autocomplete** (`connect(Fan.` → `in`, `out`; instance/param names), **hover** (a port shows its domain `(across, flow)` and units; a component shows its ports/params), and **inline unit diagnostics** — `UnitChecker` warnings rendered as inline squiggles in the editor rather than buried in a console.

### 14.4 `PROBE` — measurement separated from model
A `PROBE name = <expression>` statement declares a derived quantity (efficiency, duty, margin) **anywhere**, without editing component bodies: `PROBE Pump1.eta = Pump1.W / (Pump1.in.mdot * g * H)`. Probes never affect DOF; they are pure outputs — the modern modeling tenet of separating instrumentation from the physical model.

### 14.5 Bulk datasheet ingestion
`TABLE`/map data accepts **pasted CSV** (plus a small ingest helper) directly from manufacturer datasheets — including 2-D grids (compressor maps) — instead of manual point-by-point entry; the digitizer remains the path for image-only curves.

### 14.6 Transient state / causality override
When the expander auto-classifies `C`/`I` storage states (§8.2), the user can **override the chosen state** (e.g. force fluid temperature rather than wall temperature as the integrated variable) via a `STATE`/`der` annotation, with the structural check validating that the override is consistent.

---

## 15. Implementation Status & Findings — Phase 0 + Phase 1 (2026-06-26)

> Live status of the build on branch `feat/component-system-modeling`. This
> section is the source of truth for what is shipped vs pending and records the
> findings that refine the plan above. **Phase 0 complete; Phase 1 + Phase 1.5
> (`connect()` + loop-closure) complete bar the frontend-coupled §6
> state-circuit binding.**

### 15.0 Phase 0 — flow-resistance vocabulary (shipped, green)
`props/FlowResistance`: `friction_factor(Re, eps/D)` (Darcy — exact 64/Re laminar, iterated Colebrook–White turbulent, continuous transitional blend), `reynolds(rho, V, D, mu)`, `minor_loss(K, rho, V)`. Wired through the 3-site pattern under a new "Flow Networks" `FunctionRegistry` category; validated against the Moody chart (`props/FlowResistanceTest`). Pending (low priority): a fitting-`K` table and `valve_cv`.

### 15.1 Shipped & validated (Phase 0 + Phase 1, full backend suite green)
- **Flow networks:** real-fluid **Pipe** (Darcy–Colebrook + CoolProp ρ/μ) and **Fan** (drooping dP(Q)); incompressible **Duct/FanCurve** (constant ρ). The **fan-duct operating point** is found by the existing Newton solver (acceptance ii) — turbulent duct, fan rise within shut-off head, mass conserved (`core/ComponentNetworksTest`).
- **Branching:** **Splitter** (common P/h, split ṁ), **Mixer** (flow-weighted enthalpy balance), and a 4-port **HeatExchanger** coupling two circuits through a shared ε-NTU duty (~200 kW, energy-balanced) — `core/ComponentBranchingTest`. This delivers the node-resolution capability without the `connect(...)` surface syntax (Phase 1.5). The expander now also substitutes a string PARAM used as a function argument (e.g. the HX arrangement) to its literal.
- **Strict parameters (no defaults):** the 13 library components carry **no parameter defaults** — every PARAM (fluid, length, efficiency, UA…) must be supplied at instantiation or it's a hard parse error, so a model that forgets `fluid$` fails loudly instead of silently running as water. (The optional-default *language feature* stays for user components.) Same strict-over-convenient principle as the state-table rule.
- **Derived-property member access (finding 15.2.4, done):** a top-level stream member beyond `(P, h, mdot)` — `s3.T`, `s1.x`, `s.s`, `s.v`, `s.rho`, `s.cp`… — is rewritten to the matching CoolProp call on the stream's `(P, h)` (so `s3.T = 753 [K]` ⇒ `Temperature(fluid, P=s3.P, h=s3.h) = 753`, inverted by the solver). Each stream's **fluid is inferred per-port** from the attached components and **propagated to a fixpoint** through fluid-less pass-throughs (Boiler/Condenser/Throttle/Splitter/Mixer), so a whole circuit shares one fluid while a multi-fluid HX keeps hot/cold separate. `ComponentExpander.streamFluids()` exposes this map — **the port-level fluid association §6 needs is now built.**
- **Grammar:** `COMPONENT … END` (with `PARAM`), instantiation `Type inst(streamA, streamB, key=val)`, and the dotted port-member accessor (`in.P`, `out.h`, `HP.out.h`, `T1.W`) via a new `DOT` token + `MemberAtom`. `componentDef`/`componentInst` sit at **top level** (not inside `statement`) so the sealed `Statement` hierarchy is untouched.
- **AST & expander:** `ComponentDef`/`ComponentInst` records; `ComponentExpander` clones each instance body with three rewrites — port `port.member`→`boundStream$member`, bare local/output→`inst$name` (per-instance namespacing, exactly like MODULE), parameter→value — emitting flat scalar equations the **existing Newton/Tarjan solver consumes unchanged**. String (fluid) parameters are baked into the encoded `prop$` property-call names, so two instances can carry different fluids.
- **Connection model = shared-name** (see finding 15.2.1): ports bind to *stream* names; two instances naming the same stream are connected because they share the flat stream variables (`s$P, s$h, s$mdot`). A series chain conserves mass/energy with **no extra equations**.
- **Standard library** (`ComponentLibrary`, authored in `COMPONENT` source, parsed once; a user definition of the same name overrides the built-in): **Pump, Turbine, Compressor, Boiler, Condenser, Throttle, Pipe, Fan, Duct, FanCurve, Splitter, Mixer, HeatExchanger, Source, Sink, Nozzle**. `Source` is an inlet boundary that fixes the entering state `(fluid$, mdot, P, T)` — `h` computed forward via `Enthalpy(P,T)`, no inversion; `Sink` is a terminal that reads the arriving stream into named readouts (`sink.mdot/P/h`) without pinning anything, so it never over-determines a chain (`ComponentConnectTest.sourceAndSinkBoundariesBracketAnOpenChain`). `Nozzle` is a CD ideal-gas nozzle: inlet stream = chamber/stagnation state, `PARAM k,R,A_throat,A_exit,P_amb,T0`; supersonic exit Mach from the area ratio → exit static P/T/V, `out.h=in.h−V²/2`, thrust — all forward, CoolProp-free (`ComponentNozzleTest`).
- **Validation** (CoolProp live where noted): **Rankine** `eta_th=0.332` (matches the hand-written example), **Brayton** (real air), **R134a refrigeration**, **fan-duct operating point**, **split/mix**, **two-stream HX** — all solve end-to-end with **zero unit warnings**. Tests: `parser/ComponentExpansionTest`, `core/ComponentCyclesTest`, `core/ComponentNetworksTest`, `core/ComponentBranchingTest`, `props/FlowResistanceTest`.

### 15.2 Findings (these refine the plan above)
1. **Closed-loop mass-balance redundancy — RESOLVED for connect-based loops (Phase 1.5).** Closing a cycle makes the per-component conservation equations linearly dependent — the loop's Σṁ (and, in the `connect` model, the loop's P/h equalities) are redundant — so a naive closed cycle is **over-determined by one per quantity** and frEES's zero-DOF Check rejects it. **Shipped fix:** `ComponentExpander.expandConnects` runs a **union-find over the connection graph** (seeded with each 2-port instance's internal in↔out link, so a series loop registers as a cycle); a `connect` whose endpoints are already connected **closes a loop and emits nothing** — its P/h equalities are dropped by spanning-tree emission and its Σṁ is dropped as the redundant loop balance. A pump+pipe ring with an anchored inlet now solves at zero DOF (`ComponentConnectTest.connectClosesALoopWithoutOverDetermining`). *(The open-chain modelling — pump inlet specified directly — still works and remains the simplest option.)* **Uncovered case + a recorded dead end:** a *closed* loop running **through a 3+-port node** (Splitter/Mixer) is not handled, and the obvious quick fix is wrong. Branching/recycle networks *without* an explicit ring-closure already solve correctly (the per-stream union-find is seeded only from 2-port pass-throughs; a Mixer's second inlet is correctly left as a fed input — `ComponentConnectTest.connectBranchesAndRemergesThroughThreePortNodes` is the regression guard). **Tried and reverted:** seeding the union-find by unioning any two port streams that co-occur in a component body — this *under-determines* branching networks, because a parallel split→merge already forms a UF cycle, so the final branch `connect` is misread as loop-closing and its node equalities (which feed the Mixer's 2nd inlet) get dropped. The correct fix is a bigger redesign: **per-member spanning forests** (separate P / h / ṁ union-finds) plus a model of which members each component body propagates to which ports, so only the truly-redundant per-member equation at a genuine ring closure is dropped. No shipped example needs it.
2. **Branching + `connect(...)` — SHIPPED (Phase 1.5).** Shared-name covers series; explicit Splitter/Mixer cover branching; and now the terse **`connect(a, b, …)`** surface syntax ties free-ported instances (instantiated with params only, ports bound to synthetic `inst$port` streams) into a node — **P and h equal, mass conserved** (2-way → ṁ equality; 3+-way → Σ outlet = Σ inlet, inlet/outlet read from the port name). Direction that can't be inferred at a branch is a hard error (`ComponentConnectTest.connectWithUndeterminableDirectionAtBranchIsRejected`), not a silent wrong sign. Bare stream names work as endpoints too. Fluid propagates across connect edges (connected streams share a fluid) so derived properties resolve on a connector-style flowsheet. Tests: `ComponentConnectTest` (series, 3-way split, loop closure, bare streams, error).
3. **`result.variables()` is keyed by display name** (dotted, e.g. `s1.mdot`, `h1.duty`), not the internal flat `$` name — relevant to the §14.1 source-mapped diagnostics (the user already never sees `s1$mdot`).
4. **Derived-member access — DONE (was: not yet rewritten).** `s.T`/`s.x`/`s.s`/`s.v`/`s.rho`/`s.cp`/… now rewrite to CoolProp calls; users can write `s3.T = 753 [K]` directly (see 15.1). *Caveat surfaced:* a derived-property boundary makes **enthalpy an implicit unknown** (the solver inverts `Quality`/`Temperature` for `h`), so `h` starts at the default guess (1.0 J/kg, below CoolProp's range) and **needs a realistic seed** — the seeded derived-Rankine solves to `eta=0.33`. The explicit-`Enthalpy` form computes `h` forward and needs no seed. This is the same §8.5 gap as finding 5.
5. **Multiscale ill-conditioning confirms §8.5 is load-bearing.** The real-fluid fan-duct (P≈10⁵, ṁ≈1, h≈10⁵) and any **implicit-enthalpy** boundary (finding 4) stall plain Newton from the default unit guesses (variables start at 1.0 → CoolProp NaN); explicit-forward cycles only converge because their pressures/enthalpies are computed directly. *Mitigation shipped:* incompressible Duct/FanCurve; GUI/`VariableSpec` seeding for implicit cases. *Plan impact:* the §8.5 automatic per-variable scaling / domain-aware nominal guesses (P~10⁵, h~10⁵, ṁ~1) is the true fix and should land **early in Phase R** — it now blocks two distinct features (real-fluid networks, derived-property boundaries).
6. **§6 state-circuit binding — port-level fluid association now built; the rest is frontend-coupled.** `ComponentExpander.streamFluids()` gives the per-fluid stream grouping §6 needs (sub-item (a) done). Remaining: (b) teach `CyclePathResolver` the `stream.member` naming + per-edge process type (the expander knows each component's process: pump/turbine isentropic+η, boiler/HX isobaric, throttle isenthalpic), and (c) frontend cycle-plot wiring. `CyclePathResolver` currently keys on a property+index convention (`T1`, `P_2`) and the diagram renders frontend-side, so (b)+(c) are best done together with frontend validation.
7. **Members on a fluid-less stream are opaque riders (design choice, possible footgun).** To let generic components reuse member names like `.x`/`.v`/`.s` as ordinary variables, derived-property rewriting fires **only when the stream has a fluid**. So `s1.T = 300` on a stream with no attached fluid component is silently a plain variable, not a temperature. *Risk:* a user who forgets to attach a fluid gets a silent rider instead of a property. *Possible improvement (aligns with strict-over-warn):* warn when a member name collides with a known property letter on a fluid-less stream, or require a stream's fluid to be declarable explicitly (`STREAM s1 [Water]`).
8. **§8.5 is NOT just initial guesses — the FD Jacobian is the real blocker (investigated, partially attempted, reverted).** Tried domain-aware initial guesses (per-variable dimensions from the unit checker + per-`prop$`-argument indicator seeding: `p`→10⁵, `h`→10⁵, `s`→2×10³, `t`→300) plus positive lower bounds on CoolProp pressure/temperature arguments. *Result:* it gives unknowns physical *starting* values, but **does not** make the stiff implicit-property cases (real fan-duct, derived-Rankine, even a single `Temperature(P,h)=T` inversion) converge — they still diverge to `P=-nan`. **Root cause:** the solver's **finite-difference Jacobian perturbs CoolProp inputs (P, h) into invalid regions**, returning NaN derivative columns; `NewtonSolver` then forms a NaN step and `clamp(NaN)=NaN`, so bounds can't rescue it. *Secondary pathologies:* `Quality(P,h)` has a flat/undefined derivative outside the two-phase dome; enthalpy has a fluid-specific lower limit (can't be bounded at 0 since it's reference-dependent and may be negative). *Conclusion:* the guess slice was reverted (it fixed nothing measurable and touched the core solver); the genuine §8.5/§8.6 fix is **(a) bounded / range-aware FD perturbation** (never step a CoolProp argument outside its valid box when probing the Jacobian), **(b) row/column equilibration**, and **(c) §8.7 homotopy** for phase boundaries. This is a real workstream, not a quick win. Implicit-property boundaries therefore keep needing seeds for now (mitigation in place: explicit-`Enthalpy` forward forms and incompressible components avoid the issue). *Kept from the attempt:* `friction_factor` no longer throws on a zero-flow iterate (committed separately).
   *Diagnostic process (for whoever resumes §8.5):* an experiment ladder isolated the cause — (1) full derived-Rankine failed with `h=1` NaN ⇒ tried dimensional guesses; (2) only **pressures** got dimensioned (probed `UnitChecker.variableDims()`), enthalpies never ground through `prop$` calls ⇒ added per-`prop$`-argument indicator seeding; (3) the start became physical but the solve still diverged ⇒ added positive P/T lower bounds; (4) a **minimal single `Temperature(P,h)=T` inversion** still diverged identically with and without seeds, pinpointing the FD Jacobian (not the guess) as the cause. Reproduce with a one-state `Sink` component + `s1.P`, `s1.T` boundaries. The next implementer should start at the `NewtonSolver` FD-perturbation step (clamp each perturbed CoolProp argument into its valid range before the property call) rather than at the guess layer.
9. **§8.5 resolved into three independent modes; two are now shipped, the third is §8.7 (corrects finding 8).** A controlled experiment ladder on single `Temperature(P,h)=T` inversions (supercritical 30 MPa = monotonic; subcritical 8 MPa = dome-crossing; with/without seed) separated three *distinct* failure modes that finding 8 had conflated:
   - **(a) Invalid base point.** A property argument left at the default guess 1.0 (1 Pa / 1 J/kg, below every fluid's table floor) makes the *first* residual NaN — the solve never starts. **Shipped fix:** `EquationSystemSolver.seedPropertyArgumentGuesses` reads the encoded `prop$…$p$h` indicators and seeds each bare argument variable to a domain nominal (`p`→10⁵, `t`→300, `h`→10⁵, `s`→10³, `x`→0.5, …) **only** when it still sits at `DEFAULT_GUESS` (user/GUI guesses always win). This makes the **monotonic** supercritical/single-phase inversion `Temperature(P,h)=T` converge **from a default guess** (red→green: `PropertyArgumentSeedingTest`). *This corrects finding 8's "seeding fixed nothing" — that judgment was made only on the dome-crossing case (mode c), which seeding genuinely cannot fix; seeding does fix the monotonic class.*
   - **(b) NaN-poisoned Jacobian.** A finite-difference probe can step a CoolProp argument outside its valid box (especially via the cancellation-escape ×10⁴ growth loop, which a near-flat derivative triggers), returning a NaN derivative column ⇒ `clamp(NaN)=NaN` step. **Shipped fix:** `NewtonSolver.computeJacobianColumn` now does **range-aware perturbation** — clamps the probe into the variable's `[lo,hi]` box (dividing by the *actual* step), **flips forward→backward** when a probe lands in a non-finite region, **caps** the growth so it never marches into an invalid region, and **guarantees a finite column** (no-sensitivity ⇒ 0, never NaN). Hardening only — full suite stays green; it is the prerequisite substrate for (c).
   - **(c) Two-phase dome plateau — SHIPPED (§8.7, single-unknown).** Crossing the saturation dome, `dT/dh≈0` (temperature is flat across the dome), so the inversion is non-monotonic and Newton's gradient vanishes even with a valid seed and a finite Jacobian — yet the residual is **monotonic and sign-changing overall**. **Shipped fix (two parts):** (i) `EquationSystemSolver.tryUnivariateBracketingSolve` — a last-resort, **single-equation/single-unknown** bracketing root-find (expanding NaN-skipping sample sweep → bisection) added to the block-solve fallback ladder *after* the transformed-guess retry and *before* block-merge; it is **scoped to blocks whose equation contains a `prop$` call** (so ordinary algebra still honours the Newton iteration-limit stop criterion) and only commits a root that drives the residual within `1e-6` relative tol (never masks a wrong/extraneous root). (ii) A correctness fix in `NewtonSolver.withinResidualTolerance`: a **non-finite residual is no longer mistaken for convergence** (`NaN > tol` is false, so an invalid guess was previously accepted as "solved" — this also let the transformed-guess retry return a bad value and pre-empt the bracketing). The canonical subcritical 8 MPa liquid→superheated inversion now **converges from a plain default guess** (red→green: `PropertyArgumentSeedingTest.subcriticalInversionAcrossDomeConvergesFromDefaultGuess`; verified that disabling the bracketing fallback re-breaks it, i.e. it is genuinely the crossing mechanism). *Validated on a coupled cycle:* the **fully-derived Rankine** (`ComponentCyclesTest.rankineWithDerivedPropertyBoundariesSolves`) now solves **seed-free** (`eta_th=0.332`) — its manual `s1..s5$h` seed was removed. Tarjan separates each stream's `Temperature/Quality(P,h)` inversion into its own 1×1 `prop$` block (`P` is fixed upstream, work terms read the already-solved `h`), so the bracketing aid resolves every state independently — including `s1`/`s5` on the dome and `s3` superheated above it. *Remaining §8.7 scope (now narrower):* only a **genuine N×N SCC** — two property inversions mutually coupled inside one block so they cannot be torn into 1×1 — would still need a past-the-dome seed; generalising the bracket to that case (continuation/homotopy or a quality-bracketed sub-solve) is the open extension, but no shipped example currently hits it.
10. **Component physics-variant selector (`model$`) — SHIPPED (Phase 2 first increment, §5.5, R3).** The "one component, many models" mechanism: a `COMPONENT` may carry several `VARIANT name [REQUIRE p1, p2, …] … END` bodies and a `PARAM model$` selector that picks one; the chosen variant's equations expand alongside the shared (non-variant) body. **Implementation (4 sites):** (a) grammar — `VARIANT`/`REQUIRE` keywords + a `componentVariant` rule (nested `… END`) added as a `componentItem` alternative; (b) `ast/ComponentDef` — a `Variant(name, require, body)` record + `variants` field + `variant(name)` lookup; (c) `parser/AstBuilder` — `buildComponentVariant`, and **`REQUIRE` names are auto-declared as variant-scoped `Param`s** (no default, trailing `$` ⇒ string) so they need not be repeated as `PARAM`; (d) `parser/ComponentExpander` — `selectVariant` reads `model$`, `effectiveBody()` = shared + selected variant, and the param loop makes a parameter **required only when its variant is selected** (a parameter listed in an *unselected* variant's `REQUIRE` is optional, so a `map` compressor never demands the isentropic `eta`). **Strict errors:** declaring variants without a `model$` selector; an unknown `model$` value (lists valid variants); a missing required parameter of the selected variant (names the variant). **Decision:** the built-in library Compressor was **not** converted to variants (would change its `eta`-only API and break cycle tests) — variants stay a language feature for now; converting/extending built-ins to ladders is Phase 5/6 work. Tests: `core/ComponentVariantTest` (8, green); full backend suite green. *This is the keystone that gates the §16 catalog — every domain ladder now expressible as one component.*
11. **Heat port `(T, Q̇)` + domain-aware `connect(...)` — SHIPPED (Phase 2, §3.1/§16.1, R3).** `connect(...)` is now **domain-aware**: a node equates its *across* variables (fluid → `P, h`; heat → `T`) and conserves its *flow* (fluid → `ṁ` pass-through / signed branch balance; **heat → `Σ Q̇ = 0`, a Kirchhoff balance over all ports, each `Q̇` signed into its component** — like the electrical node). **The expander classifies each node from the members its streams carry** (`ComponentExpander.streamMembers`, collected per stream from component bodies): `mdot` present ⇒ fluid (default — every existing fluid connect is unchanged), else `qdot`/`t` ⇒ heat. **Key correctness fix:** `seedComponentLinks` (the loop-closure seed) now only links a 2-port component when **both** ports are fluid — a heat 2-port (conduction/convection) must *not* equate its ends (they sit at different temperatures), which the fluid pass-through seed would have wrongly done. New library primitives (pure algebra, CoolProp-free): **ThermalSource** (fixed-T boundary `Se`), **Conduction** (`Q=kA/L·ΔT`), **Convection** (`Q=htc·A·ΔT`), **Radiation** (`Q=εσA(T⁴−T⁴)`). Tests: `core/ComponentThermalTest` (conduction between two fixed temperatures; a 350 K surface losing heat to 300 K surroundings by parallel convection+radiation at a 3-way heat node — validates n-way `ΣQ̇=0` and the radiative nonlinearity). Full backend suite green (fluid connects unaffected). *This is the first new port-domain — the pattern (across-set + flow-rule keyed by stream members) generalises directly to the electrical `(V,I)` and mechanical `(τ,ω)` domains next.*

12. **Electrical `(V, I)` port — SHIPPED (Phase 2, §3.1/§16.5, R3).** The second new port-domain, and a near-mechanical reuse of the heat pattern (finding 11): the domain classifier was generalised from a boolean (`isHeatNode`) to a 3-way `nodeDomain` (`mdot`⇒fluid, `qdot`⇒heat, `i`⇒electrical; across-member fallback `t`⇒heat, `v`⇒electrical), with a per-domain `acrossMembers` table and a shared `kirchhoffBalance(streams, flowMember)` (Σflow=0) covering **both** heat (`qdot`) and electrical (`i`). An electrical node equates potential `V` and balances current `ΣI=0` — each `I` signed into its component, like a 2-terminal element where `a.I + b.I = 0`. New library primitives (pure algebra, CoolProp-free): **VoltageSource** (`p.V−n.V=E`), **Resistor** (Ohm), **Ground** (`port.V=0`, the network reference), **Battery** (R-int ECM: `V_term = Voc + R0·p.I`, i.e. terminal voltage sags under load, + delivered power `W`). Tests: `core/ComponentElectricalTest` (a 12 V/0.1 Ω battery feeding a 2 Ω load through its internal resistance; a 3 Ω+2 Ω voltage divider validating a mid-node, series current, and node KCL). Full backend suite green. *Confirms the across-set + flow-rule abstraction: a new domain is now ~a row in `acrossMembers` + the flow member. The mechanical `(τ, ω)` domain is the same shape (across `ω`, flow `Στ=0`).* The battery R-int is **static** — SOC integration (`dSOC/dt=−I/3600Q₀`), RC branches, and thermal coupling are Phase 3 (need `DYNAMIC`).

13. **Mechanical-rotational `(τ, ω)` port — SHIPPED; the 4-domain port infrastructure is now complete (Phase 2, §16.4, R3).** The fourth and final Phase-2 domain, added as one row in `nodeDomain`/`acrossMembers` (`tau`⇒mechanical, across `w`) + the `kirchhoffBalance(..., "tau")` case — confirming the abstraction. A mechanical node equates angular velocity `ω` and balances torque `Στ=0` (each `τ` into its component). New library primitives (pure algebra): **TorqueSource**, **SpeedSource**, **RotationalDamper** (`τ=c·Δω`), **MechGround** (`ω=0` reference), and **Gear** — an ideal transformer (TF) element: `ω_in = ratio·ω_out`, `τ_out = −ratio·τ_in` (trades speed for torque, conserves power). Tests: `core/ComponentMechanicalTest` (a torque-driven damper reaching `ω=T/c`; a 2:1 gear train validating the speed/torque trade and power conservation). Full backend suite green. **Only rotational was shipped** — translational `(F, v)` is deferred because its velocity member would clash with the electrical `v` (potential); a distinct member name is the small open decision. *Usage gotcha recorded:* instantiating with positional args (`Type T(a, b, k=v)`) binds those names as **shared streams** (shared-name connection), not as a re-declaration of ports — for `connect`-wired components, instantiate with **parameters only** (`Type T(k=v)`) so the ports stay free.

14. **Cross-domain composition — SHIPPED; Phase 2 acceptance met (§16.5/§16.1).** A `HeatingResistor(p, n, heat)` is the first **cross-domain transducer**: an electrical port pair dissipating `I²R` plus a heat port emitting `−Q`. A single component spanning two domains "just works" because domain classification is **per-node** (each port's stream is classified where it connects — the electrical ports to an electrical node, the heat port to a heat node) and the body is plain equations bridging them. Test `core/ComponentCrossDomainTest`: a 10 V/5 Ω element (20 W) wired to a conduction-to-ambient path solves the **electrical (`ΣI=0`) and thermal (`ΣQ̇=0`) networks together in one Newton system** — the element runs 1 K above a 300 K ambient. This is the steady-state core of the EV battery-thermal flagship and confirms the multi-domain layer composes, not just coexists. Full suite green. *(No expander change was needed — cross-domain fell out of the per-node classifier, which is the design working as intended.)*

   **First library ladder shipped on it:** the standard-library **`Compressor`** is now a variant ladder — `model$ = isentropic` (default; mass flow set by the network — *backward-compatible*, the prior single-body API) and `model$ = volumetric` (`REQUIRE eta_v, disp, rpm`: pins `ṁ = η_v · V_disp · (rpm/60) · ρ_suction`, the shared isentropic-η head computes the discharge). Existing Brayton/R134a cycles (which pass only `eta, fluid$`) stay green; the volumetric path is validated on live CoolProp R134a (`ComponentVariantTest.libraryCompressorVolumetricVariantDeterminesMassFlow`). The `map` rung is left for Phase 5 (needs a digitized map TABLE).

### 15.3 Immediate next steps (revised ordering)
- **Solver robustness (§8.5/§8.7) — single-unknown path now fully shipped** (finding 9). All three single-inversion modes are fixed: (a) invalid base point → property-argument seeding; (b) NaN-poisoned Jacobian → range-aware FD perturbation; (c) two-phase dome → `prop$`-scoped univariate bracketing fallback + the NaN-not-converged correctness fix (`PropertyArgumentSeedingTest`, full suite green). The fully-derived Rankine now solves **seed-free** (its manual seed was removed), confirming coupled cycles work whenever Tarjan tears the per-stream inversions into 1×1 `prop$` blocks. **Remaining solver work (narrow):** only a genuine **N×N SCC** of mutually-coupled property inversions would still need a seed — no shipped example hits it yet; generalising the bracket to that case (continuation/homotopy) is deferred until one does. Row/column equilibration (§8.5) stays a worthwhile general conditioning add but is not a gate.
- ~~**Component variant selector (`model$`)** — Phase 2 first increment~~ **SHIPPED** (finding 10); ~~**thermal `(T, Q̇)` port**~~ **SHIPPED** (finding 11); ~~**electrical `(V, I)` port**~~ **SHIPPED** (finding 12); ~~**mechanical `(τ, ω)` port**~~ **SHIPPED** (finding 13): torque/speed source, rotational damper, ground, ideal gear TF (`ComponentMechanicalTest`). ~~**cross-domain transducer**~~ **SHIPPED** (finding 14): `HeatingResistor` composes the electrical + thermal networks in one solve — **Phase 2 is now complete** (4 domains + `model$` selector + cross-domain composition). **Next: Phase 3 — storage → `DYNAMIC`.** The C/I storage auto-classification + `der(X)` emission unlocks the transient half of every domain at once: **thermal mass** (`C·dT/dt=ΣQ̇`), **capacitive fluid volume** (`dm/dt=Σṁ`), electrical **L/C**, and the **battery SOC + RC + self-heating** dynamics — i.e. the transient EV-flagship. This needs the storage→`DYNAMIC` path (and, per Phase R, a stiff integrator for the mixed time constants).
- **State-circuit binding (§6)** → emit per-fluid `StateTableDef` (fluid grouping already available via `streamFluids()`) + ordered process edges; teach `CyclePathResolver` + frontend cycle-plot rendering. *(The remaining Phase 1 item — finding 6.)*
- ~~**Phase 1.5 — `connect()` surface syntax** and **loop-closure handling**~~ **SHIPPED** (findings 1 & 2): free-ported instances + `connect(a, b, …)` (P/h equal, mass conserved, name-inferred branch direction) + union-find loop-closure that drops the redundant cycle equations. `ComponentConnectTest`. *Remaining sub-item:* loop detection through 3+-port splitter/mixer nodes (only 2-port pass-through internal links are currently seeded into the union-find).
- Remaining standard-library components: ~~Nozzle~~ ✅ **done** and ~~Source/Sink boundary~~ ✅ **done**. `Source` real-fluid inlet `(fluid$,mdot,P,T)`→forward `h`; `Sink` readout terminal. `Nozzle` (CD, ideal-gas isentropic): inlet stream taken as the chamber/stagnation state (`in.P`=P0), `PARAM k,R,A_throat,A_exit,P_amb,T0`; reads supersonic exit Mach off the area ratio (`mach_A_Astar`), then exit static P/T/V, `out.h = in.h − V²/2` (stagnation-enthalpy conservation), and thrust — all forward, no CoolProp. The "stagnation stream rider" need is met by treating the inlet as stagnation + T0 param (kinetic riders are instance locals, per §5.4).
- Optional: explicit stream-fluid declaration / fluid-less property-name warning (finding 7); fitting-`K` table and `valve_cv` (Phase 0 leftovers).

---

## 16. Multi-Domain Component Catalog (R3) — feeds Phases 2/3/5/6

> Derived from a structured cross-study of an established 1-D multi-domain system-simulation component library. Each component is a **`model$` fidelity ladder** (§5.5). Status key: ✅ physics already in frEES (CoolProp / ε-NTU / compressible / Newton) · 🟡 small constitutive add · 🔶 needs a new port-domain (Phase 2). "Dep" = the enabler it waits on: **V** = `model$` selector, **T/E/M** = heat/electrical/mechanical port, **S** = storage+stiff ODE (Phase 3).

### 16.1 Thermal (Phase 2 heat port `(T, Q̇)`) — ✅ **port + primitives shipped**
| Component | Variant ladder | Status | Dep |
|---|---|---|---|
| Conduction / convection / radiation | `Q=kA/L·ΔT` · `Q=hA·ΔT` · `Q=εσA(T⁴−T⁴)` | ✅ shipped | T ✅ |
| Contact resistance / forced-convection variant | `model$` ladder on convection | 🟡 | V |
| Lumped thermal mass | 1-node → n-node wall (`C·dT/dt=ΣQ̇`) | 🔶 | T+S |
| Thermal source / ambient | fixed-T boundary | ✅ shipped | T ✅ |
| Thermal sensor | — | 🟡 | T |

### 16.2 Thermofluid & heat exchangers (Phase 2/3/5)
| Component | Variant ladder | Status | Dep |
|---|---|---|---|
| **Multi-zone / moving-boundary HX** | ε-NTU (have) → n-cell discretized → 3-zone (subcool/two-phase/superheat) | 🟡 | V |
| Capacitive **volume / accumulator** | rigid → compressible → two-phase receiver | 🟡 | S |
| Valve / orifice / control valve | `Cv` → `K` → choked-flow | 🟡 | V |
| Two-phase pipe pressure drop | Darcy (have) → Lockhart-Martinelli / Friedel | 🟡 | V |

### 16.3 Air conditioning / HVAC (Phase 5/6)
| Component | Variant ladder | Status | Dep |
|---|---|---|---|
| **AC compressor** | isentropic-η ✅ → **volumetric-η** (`ṁ=η_v·V_d·N·ρ`) ✅ → **map** → **variable-displacement** | ✅/🟡 | V (selector shipped; isentropic+volumetric rungs done on the std `Compressor`) |
| **Evaporator / condenser** | micro-channel tube-fin · plate-fin · brazed-plate; single-zone → multi-zone | 🟡 | V |
| **Thermostatic expansion valve (TXV)** | fixed orifice → superheat-controlled | 🟡 | V |
| **Psychrometric coil / moist-air** | cooling coil (sensible+latent+bypass) · heating coil · humidifier · economizer | 🟡 | — (psychrometrics shipped) |
| Receiver / accumulator / TXV bulb | — | 🟡 | S |

### 16.4 Mechanical (Phase 2/3 mechanical port `(τ,ω)`) — ✅ **rotational port + primitives shipped**
| Component | Variant ladder | Status | Dep |
|---|---|---|---|
| Torque source / speed source / rotational damper / ground | — | ✅ shipped | M ✅ |
| **Gear ratio** (ideal TF) | ideal ✅ → with efficiency/thermal | ✅ shipped (ideal) | M ✅ |
| Inertia / spring | rotational | 🔶 (need Phase 3 storage) | M+S |
| **Friction** | Coulomb → viscous → **Stribeck → LuGre** (presliding) | 🔶 | M+S (events) |
| **Clutch** | locked/slipping torque transfer; dual-clutch | 🔶 | M+S (events) |
| Planetary gear train | ideal → with efficiency/thermal | 🔶 | M |
| Translational `(F, v)` port | — | 🔶 (member-name clash with electrical `v` to resolve) | M |

### 16.5 Electrical (Phase 2 electrical port `(V, I)`) — ✅ **port + R/source/ground shipped**
| Component | Variant ladder | Status | Dep |
|---|---|---|---|
| Resistor / voltage source / ground | — | ✅ shipped | E ✅ |
| L / C / current source / diode / switch | — | 🟡 (L,C need Phase 3 storage) | E |
| **Electric machine** | η-map transducer → **PMSM dq** → flux-map → loss/thermal-coupled | 🔶 | E+M+V |
| **Inverter / power electronics** | efficiency-map | 🔶 | E |
| Solenoid / reluctance actuator | magnetic-circuit | 🔶 | E+M |

### 16.6 Battery (Phase 6)
| Component | Variant ladder | Status | Dep |
|---|---|---|---|
| **Battery ECM** | **R-int** ✅ (static, `V=Voc−I·R0`) → **1RC/2RC Thévenin** → electrochemical; cell ↔ pack | 🟡 | E ✅ / S (SOC+RC need Phase 3) |
| **Battery thermal coupling** | self-heat `Q̇=I²R₀ − I·T·dV_oc/dT` → thermal node | 🔶 | E+T+S |
| Ultracapacitor / current-limit unit | — | 🔶 | E |

### 16.7 Internal combustion (Phase 6)
| Component | Variant ladder | Status | Dep |
|---|---|---|---|
| **Mean-value / map engine** | BSFC/torque map (+ FMEP friction) | 🟡 | V |
| **Turbocharger** | compressor-map + turbine-map + shaft (VG / two-stage) | 🟡 | V+M |
| Crank-angle-resolved cylinder | Wiebe (have) + Woschni heat transfer | 🟡 | S (stretch / likely out of scope) |

### 16.8 HEV / EV system (Phase 6)
| Component | Variant ladder | Status | Dep |
|---|---|---|---|
| Vehicle longitudinal road-load | rolling + aero + grade | 🔶 | M/S |
| Transmission | AT / DCT / fixed-ratio | 🔶 | M |
| **HEV supervisory energy management** | rule-based → **ECMS** | 🟡 | V |
| Driver / drive-cycle profile | PI driver, cycle source | ✅ | — (`TABLE`) |

### 16.9 Build sequence (waves)
1. **Wave A — enablers:** `model$` selector (§5.5) + thermal `(T,Q̇)` port and §16.1 primitives. Unlocks multi-zone HX and shared-wall coupling.
2. **Wave B — refrigerant/HVAC:** compressor variants, multi-zone evaporator/condenser, TXV, psychrometric coils → a complete A/C / refrigeration loop on already-shipped physics.
3. **Wave C — electrical + battery:** `(V,I)` port + R/L/C + battery ECM + thermal coupling + motor/inverter η-map → the **EV battery-thermal flagship**.
4. **Wave D — mechanical + powertrain:** `(τ,ω)` port + inertia/spring/damper + friction(Stribeck/LuGre) + clutch/gear + mean-value engine + road-load.
5. **Wave E — advanced:** turbocharger maps, ECMS energy management, crank-resolved cylinder (if ever).

The algorithmically novel pieces (worth a dedicated derivation) are: **LuGre/Stribeck friction**, **clutch stick-slip torque transfer**, **two-phase pressure drop**, **battery multi-RC Thévenin**, and **PMSM dq flux-map**. Everything else is one-to-three-equation constitutive bodies the existing expander already handles.

---

## Appendix A — Pre-existing Open Items (not part of this report)
Retained from prior planning; unrelated to the component work above.
- **Spreadsheet app, Phase 5 (Plot data source / diagram cell references):** plots integration pending; diagram-cell references are deferred with the rest of the diagram track.
- **Spreadsheet app, Phase 6.5 (`=FREES("x")` custom formula):** stretch goal, deferred (FortuneSheet formula-parser extensibility unverified).
- **Control follow-ons:** `hsvd`/`balred`/`modred` model reduction (reuse `balreal`); `dare` robustness via ordered real Schur; friendly precondition messages for `gram`/`balreal`.
