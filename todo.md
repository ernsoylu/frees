# frEES — Acausal Component-Based System Modeling
## Code-Based Improvement Plan & Engineering Report

**Prepared for:** Advisory Board (Mechanical, Thermal, Fluids, HVAC, Control, Automotive/EV)
**Scope of this report:** *Code/text-based* component modeling only. The graphical (Diagram-window) front end is **explicitly deferred** and is not covered here.
**Status:** Design complete; implementation not yet started. This document is the agreed reference for Phase 0–6 delivery. Revision **R1** incorporates the advisory review (see §0).

---

## 0. Revision Log — Advisory Review Response (R1)

Two advisory reviews (multidomain architecture, solver mechanics, UX) judged the design theoretically sound and well-scoped but **under-specified on (a) numerical robustness and (b) text-paradigm traceability**. We concur. R1 adds four workstreams, all reflected in the body below:

1. **Solver robustness (new §8.5–8.10):** automatic variable scaling/equilibration; a shape-preserving pre-fit + analytic-derivative strategy for datasheet Jacobians (the central review question); homotopy/continuation and event handling for phase-change and choked/regime-transition discontinuities; an `inStream`-equivalent for reversing flow; a high-index-DAE topological guard; purely numerical linearization feeding the existing control suite.
2. **Acausal correctness:** reversing-flow enthalpy via `stream_h(...)` upwind blending; physical bounding/branch selection for multi-root compressible & two-phase states.
3. **UX & diagnostics (new §14):** source-mapped error reporting (component-level, never mangled scalar names); a read-only auto-generated topology view (Mermaid *text*, itself code, distinct from the deferred interactive Diagram editor); editor language support (autocomplete/hover/inline unit diagnostics); a `PROBE` construct separating measurement from model; bulk CSV datasheet ingestion; transient state/causality override.
4. **Domain reach (§9):** aerospace/cryogenic validation targets and a zoned regenerative-cooling channel component.

**Points retained as deferred (with rationale):** full Pantelides high-index reduction (we add a *detector + parasitic-compliance* remedy instead, §8.9); symbolic network linearization (impossible over CoolProp tables — we go purely numerical, §8.10); the interactive drag-and-drop Diagram editor (the R1 topology view is read-only Mermaid text, within the code-based remit).

**Revision R2 (scope correction):** removed the Software-Defined-Vehicle / virtual-ECU / FMU framing — frEES is an **off-board, design-time analysis tool**, not a real-time or embedded execution target. The linearized plant feeds frEES's *existing* control suite; a plain `(A,B,C,D)` matrix export (JSON/text) is provided for users who wish to take the model elsewhere. Real-time execution, hardware-in-the-loop, and fixed-step embedded code generation are explicitly out of scope (§8.10, §13).

---

## 1. Executive Summary

frEES is today a declarative **equation solver** (ANTLR parse → matrix/CALL expansion → unit check → Tarjan SCC blocking → Newton with step-halving), augmented with a transient ODE engine (`DYNAMIC`), a control-systems suite (`tf`/`ss`/`lqr`/`bode`/`c2d`/`pidtune`), a CAS (Symja), a curve **digitizer** + unit-tagged `TABLE`/`Interpolate2D`, and first-order **uncertainty propagation**. Over recent work it also gained complete thermo-fluid physics libraries: real-fluid properties (CoolProp), cubic EOS (SRK/PR), NASA-7 ideal-gas thermochemistry, combustion (adiabatic flame temperature, Kp chemical equilibrium, mixtures, kinetic-theory transport), compressible flow (isentropic/shock/Rayleigh/Fanno/Prandtl–Meyer), and heat exchangers (ε-NTU/LMTD/fin efficiency), alongside psychrometrics.

This plan adds an **acausal, multi-domain, component-based system-modeling layer** on top of that foundation. A *component* is a reusable, parameterized template of acausal equations with typed **ports**; instantiating and connecting components **expands into scalar equations** that flow through the *existing* solver unchanged. The theoretical basis is a **pseudo bond graph** (the same formalism underlying Siemens Amesim and Modelica.Fluid).

**Thesis.** This turns frEES into a declarative **system/network modeler** — power cycles, refrigeration/HVAC, flow networks, EV thermal management — that occupies the 0-D lumped, multi-domain, steady-and-transient band, while remaining transparent (every component is visible, editable, unit-checked equations) and web-based. It is, in effect, *EES + the Simscape/Simulink plant-to-control workflow in one document*, achieved with a thin parser/expander layer plus a short list of constitutive functions — **not** a new solver.

**Cost/leverage.** A corpus survey (advisory-library cross-check, §9) confirms the **largest** class of systems (power cycles, refrigeration/AC, HVAC psychrometric trains, heat-exchanger networks) is buildable with **already-shipped physics**; flow networks need **one** new friction function; the EV/mechatronic frontier needs **two** new port-domains (electrical, mechanical) but **no new core physics**.

---

## 2. Theoretical Foundation — The Pseudo-Bond-Graph Model

### 2.1 Bond-graph essentials (the reference frame)
A bond graph represents a physical system by **power flow**. Each bond carries an **effort** `e` and a **flow** `f` whose product is power (`e·f = W`); structural elements are the **0-junction** (common effort, `Σf=0`), **1-junction** (common flow, `Σe=0`), **R** (dissipative), **C** (stores `q=∫f`), **I** (stores `p=∫e`), sources **Se/Sf**, and power-conserving transducers **TF/GY**. Causality is assigned afterward (SCAP) to make the graph computable.

### 2.2 Why frEES is a *pseudo* bond graph (honest positioning)
The fluid port pairs pressure `P` (across) with **mass** flow `ṁ` (through). `P·ṁ` is **not** power, and a flowing stream is a **multibond** carrying mass + energy together, with specific enthalpy `h` riding as a **convective "stream" variable**. Two consequences, both standard for thermo-fluid systems:

1. The `(P, ṁ)` pair is a **pseudo bond** (relaxes `e·f = power` while keeping junction algebra) — exactly the choice Amesim makes for thermo-hydraulic/thermal libraries.
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
| Axis | Modelica | Amesim | GT-SUITE | **frEES (this plan)** |
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

### Phase R — Solver robustness & diagnostics (cross-cutting, R1) — *lands alongside Phases 1–5*
Not a sequential phase but a robustness spine, prioritized because everything else depends on it:
- **With Phase 1:** automatic variable scaling (§8.5); source-mapped diagnostics (§14.1); read-only Mermaid topology (§14.2); high-index structural guard (§8.9).
- **With Phase 3 (transient):** `stream_h` reversing-flow (§8.8); discontinuity event handling (§8.7); causality override (§14.6).
- **With Phase 4 (control):** purely numerical linearization feeding the existing control suite, plus a plain `(A,B,C,D)` matrix export (§8.10).
- **With Phase 5 (datasheets):** shape-preserving pre-fit + analytic-derivative Jacobian (§8.6); CSV ingestion (§14.5).
- **As needed:** homotopy/continuation mode (§8.7) for phase-change cycles.
**Acceptance:** an ill-scaled multidomain network (P, ṁ, I together) converges with scaling on and fails without; a mis-specified component yields a component-named error (not a mangled scalar); a datasheet-fed fan-duct converges from a cold start; a reversing-flow loop integrates through `ṁ=0` without a discontinuity failure; a phase-change cycle that fails cold-start converges under homotopy.

### Phase 0 — Constitutive function gaps (small scalar functions)
Add via the established 3-site wiring (`Evaluator` eval + `UnitChecker` dims + `FunctionRegistry` metadata), each with unit tests cross-checked against the corpus:
- `friction_factor(Re, rel_rough)` — Colebrook/Moody (laminar + turbulent), the gate for all flow networks.
- `minor_loss(K, rho, V)` and a fitting-`K` table; `valve_cv(...)`.
- `Re(rho, V, D, fluid$)` helper.
**Deliverable:** flow-resistance vocabulary. **Acceptance:** Colebrook `f` matches Moody chart to chart accuracy; pipe ΔP matches a Darcy worked example.

### Phase 1 — Core component layer (fluid domain, steady) — *the milestone*
- ANTLR grammar: `COMPONENT … END` definition + instantiation statement; `connect(...)`/shared-name; dotted port-member references.
- `ComponentDef` AST record; component registry (alongside `ProcDef`).
- **Expansion pass**: clone/substitute/mangle → scalar equations; node resolution (`across=`, `Σṁ=0`).
- Standard library (fluid): Pump, Turbine, Compressor, Boiler/Heater, Condenser/Cooler, Throttle, Mixer, Splitter, Pipe (Phase 0), HX (4-port ε-NTU), Nozzle, Source/Sink boundary.
- **State-circuit binding** (§6): stream→state adapter; per-fluid `StateTableDef`; `CyclePathResolver` taught member-name states + per-edge process.
**Deliverable:** steady **fan-duct** and **Rankine/Brayton/refrigeration** flowsheets solve end-to-end with auto cycle plots.
**Acceptance:** (i) a 4-component Rankine flowsheet reproduces the hand-written example's numbers; (ii) the fan-duct operating point matches a manual curve-intersection; (iii) zero unit warnings; (iv) full backend suite green.

### Phase 2 — Multi-domain ports & transducers
- Heat port `(T, Q̇)`; two-stream HX with exposed wall; baked-in-duty components.
- Electrical port `(V, I)` + R/source primitives; ElectricHeater (kettle/boiler).
- Mechanical-rotational port `(τ, ω)`; turbine→shaft, motor/generator stubs.
**Acceptance:** a kettle (elec→thermal) and a shaft-coupled turbine-generator chain solve across domains; node rules validated (`ΣQ̇=0`, `ΣI=0`).

### Phase 3 — Transient mode (storage → `DYNAMIC`)
- C/I storage elements; auto-classification of states; `der(X)` emission.
**Acceptance:** kettle time-to-boil and a tank fill/drain integrate correctly; steady limit recovers the Phase-1 operating point.

### Phase 4 — Plant → control coupling
- Numeric (and Symja-symbolic) linearization of a solved network → `(A,B,C,D)`; hand-off to `ss`/`tf` and the control suite; signal domain + PID/state-feedback/observer controller components; closed-loop simulation via `DYNAMIC`.
**Acceptance:** a tank-level or superheat loop: auto-linearized plant → `pidtune`/`lqr` → closed-loop `DYNAMIC` meets a step-response spec.

### Phase 5 — Datasheet component wrappers
- Pump/Fan/Compressor curve components (digitizer + `Interpolate2D`) + affinity-law scaling; valve `Cv`; compressor `η_v` map.
**Acceptance:** a datasheet fan reproduces §7's operating point; affinity scaling matches the fan laws; inverse solve (find `rpm` for target `Q`) converges.

### Phase 6 — Domain breadth & flagship system
- Electrical battery **ECM** (digitized OCV-SOC, `DYNAMIC` SOC + thermal); motor/inverter efficiency-map transducer; chiller composition; cabin HVAC.
- **EV battery thermal-management** system model; subsystem/hierarchy support; system-level uncertainty/sensitivity.
**Acceptance:** an EV pack-cooling loop (ECM + cold plate + pump + chiller/radiator) reaches a steady operating point and a transient warm-up profile; KPI sensitivity ranking produced.

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

## Appendix A — Pre-existing Open Items (not part of this report)
Retained from prior planning; unrelated to the component work above.
- **Spreadsheet app, Phase 5 (Plot data source / diagram cell references):** plots integration pending; diagram-cell references are deferred with the rest of the diagram track.
- **Spreadsheet app, Phase 6.5 (`=FREES("x")` custom formula):** stretch goal, deferred (FortuneSheet formula-parser extensibility unverified).
- **Control follow-ons:** `hsvd`/`balred`/`modred` model reduction (reuse `balreal`); `dare` robustness via ordered real Schur; friendly precondition messages for `gram`/`balreal`.
