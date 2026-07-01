[Topic: comp-first-network]
# Your First Component Network

frees has a library of ~130 **components** — reusable, parameterized blocks of physics (pumps, pipes, heat exchangers, resistors, gears, cooling coils …) with typed **ports**. You instantiate them, wire the ports together, and frees expands the network into ordinary scalar equations solved by the same Newton/Tarjan pipeline as everything else. There is no separate "simulation mode": components and plain equations mix freely in one document.

## Water through a pipe

```run
{ Supply -> pipe -> return: what pressure is lost to friction? }
Source  SUP(fluid$=Water, mdot=2 [kg/s], P=300000 [Pa], T=298 [K])
Pipe    LINE(fluid$=Water, L=50 [m], D=0.05 [m], rough=0.0001)
Sink    RET()

connect(SUP.out, LINE.in)
connect(LINE.out, RET.in)

dP = SUP.out.P - RET.in.P     { probe: frictional pressure drop, Pa }
```

Solve (F2) and read `dP` in the Solution panel. Three things happened:

1. **Instantiation** — `Pipe LINE(...)` stamped a copy of the `Pipe` template, filling in its parameters. Every parameter is named (`L=50`), and unit annotations work exactly as in plain equations.
2. **Connection** — each `connect` statement tied two ports into a node: pressures equalize, mass is conserved, enthalpy is carried through.
3. **Probing** — dotted **port members** (`SUP.out.P`, `LINE.in.mdot`) are ordinary solver variables. You can read them, plot them, or pin them with a boundary condition like `RET.in.P = 100000 [Pa]`.

## No causality, by design

Notice what you did *not* write: no "input" or "output" designation, no calculation order. The network is **acausal** — the `Pipe` doesn't know whether it is computing a pressure drop from a flow or a flow from a pressure drop. Fix any consistent set of boundary values and the solver finds the rest, exactly like swapping the unknown in an ordinary frees equation. That is the same declarative idea you met in *Your First Solve*, lifted to whole systems.

## Named outputs

Many components compute results you'll want directly — a compressor's power, an exchanger's duty. These are exposed as **named outputs** on the instance:

```
Compressor CMP(fluid$=R134a, eta=0.72, model$=isentropic)
...
W_comp = CMP.W        { compressor power, W }
```

Every component's ports, parameters, equations, and outputs are documented on its page in the **Reference** — see the A–Z index, or browse by library on *The Component Library* page.

[Related: comp-connections, comp-library, gs-declarative]

[Topic: comp-connections]
# Connections & Junctions

There are two ways to wire a network. Both expand to exactly the same equations — pick whichever reads better.

## Style 1 — connect statements

A `connect` statement ties the listed ports into one **node**. It takes any number of endpoints, so branching is native:

```
connect(PUMP.out, RAD.in, BYPASS.in)   { flow splits after the pump }
```

At a node, frees emits the **junction rules** for the ports' domain (see *Domains & Fluid Families*): the *across* variables equalize (e.g. one pressure), and the *through* variables sum to zero (e.g. Σṁ = 0 — what flows in flows out). For fluid streams the specific enthalpy `h` rides along convectively: equal at a split or pass-through. Merging streams at different states needs an explicit mixer component (`Mixer`, `LiquidMixer`, `MixingBox`, …), which flow-weights the enthalpy properly.

Loops close the same way — connecting the last component back to the first is legal and is how closed circuits (refrigeration loops, coolant circuits) are built.

## Style 2 — shared stream names

For simple series chains there is a terser form: bind ports **positionally** to named streams. Two instances that name the same stream are connected.

```
Source SUP(s1, fluid$=Water, mdot=2, P=300000, T=298)
Pipe   LINE(s1, s2, fluid$=Water, L=50, D=0.05, rough=0.0001)
Sink   RET(s2)
```

Leading positional arguments bind the ports in the component's declared order (`Pipe` declares `in, out`, so `s1` is its inlet and `s2` its outlet); the trailing `name=value` arguments set parameters. Stream members are addressed directly: `s2.P`, `s2.h`, `s2.mdot`.

A stream name may join at most **two** ports — a third is a hard error, because a silent three-way tie is almost always a mistake. Use a `connect` statement when you need branching.

## Boundary conditions

A network needs enough pinned values to close its degrees of freedom, just like any equation system. Pin port members with plain equations:

```
RET.in.P = 100000 [Pa]      { fix the return pressure }
```

Source/sink components (`Source`, `PressureSource`, `MoistAirSource`, `VoltageSource`, `ThermalSource`, …) are pre-packaged boundary conditions; a bare equation on a port member does the same job when no component fits.

[Related: comp-first-network, comp-domains, comp-troubleshooting]

[Topic: comp-domains]
# Domains & Fluid Families

Every port belongs to a **domain** — the pair of *across* / *through* variables it carries and the junction rule a node enforces:

| Domain | Across (equal at a node) | Through (sums to zero) | Carried along |
| --- | --- | --- | --- |
| **Fluid** | pressure `P` | mass flow `mdot` | specific enthalpy `h` (convective) |
| **Heat** | temperature `T` | heat flow `Qdot` | — |
| **Electrical** | voltage `V` | current `I` | — |
| **Mechanical (rotational)** | speed `omega` | torque `tau` | — |
| **Mechanical (translational)** | velocity `v` | force `F` | — |

The domain is inferred from the members a port carries — you never register it. A port carrying `(P, mdot, h)` is fluid; `(T, Qdot)` is heat, and so on.

## One node, one domain — enforced

A `connect` node must be a single domain. Wiring a heat port to an electrical port is a **hard parse error**, not a warning — frees refuses to build a network that would silently solve the wrong physics.

Crossing domains is what **transducer components** are for: they carry one port *per* domain and the coupling physics inside. `HeatingResistor` has electrical terminals and a heat port (its I²R loss); `LiquidWallHX` has fluid ports and a `wall` heat port; a motor couples electrical to rotational. The pressure-cooker example in the Examples library chains electrical → thermal → two-phase fluid through exactly such components, in one solve.

## Fluid families

Several fluid-like domains share the same `(P, mdot, h)` bond but must never be cross-wired — a pneumatic line makes no sense feeding an oil line. A reserved string parameter, `domain$`, tags each fluid-family connector:

| `domain$` | Family | Typical components |
| --- | --- | --- |
| `fluid` *(default)* | General thermofluid | `Source`, `Pipe`, `Compressor`, `HeatExchanger` |
| `liquid` | Incompressible liquid loops | `LiquidPump`, `LiquidWallHX`, `LiquidMixer` |
| `twophase` | Evaporating / condensing refrigerant | `TwoPhaseCompressor`, `TwoPhaseEvaporatorUA` |
| `gas` | Pneumatics (ISO 6358) | `PneumaticOrifice`, `PneumaticVolume` |
| `oil` | Oil hydraulics | `HydraulicPump`, `ReliefValve` |
| `moistair` | Humid air (HVAC) | `MoistAirSource`, `CoolingCoil`, `MixingBox` |

Connecting mismatched families is, again, a hard error. The built-ins carry the right tag already; your own components opt in with `PARAM domain$ = gas` (see *Writing Your Own Component*).

## Humid air: the W rider

The `moistair` family conserves **two** masses. Its basis is `(P, mdot_da, h, W)`: flow is on a *dry-air* basis (Σṁ_da = 0), and the humidity ratio `W` rides along as a second conserved species — equal across a pass-through connection, flow-weighted only in an explicit `MixingBox`. That rider is what makes a cooling coil able to condense water out of the stream while dry air is conserved. The gas-mixture components use the same pattern for species fractions (`.y`).

[Related: comp-connections, comp-library, humidair]

[Topic: comp-library]
# The Component Library

The standard library ships twelve domain libraries. This page is a map, not a catalog — every component's authoritative page (ports, parameters, variants, governing equations) lives in the **Reference**; find it by name in the A–Z index.

| Library | What's in it |
| --- | --- |
| **fluid** | General thermofluid: `Source`/`Sink`, `Pipe`, `Valve`, `Nozzle`, `Pump`, `Fan`, `Compressor`, `Turbine`, `HeatExchanger`, `Mixer`/`Splitter`, map-driven turbomachines (`CompressorMap`, `PumpMap`, `FanCurve`) |
| **liquid** | Incompressible coolant loops: `LiquidSource`, `LiquidPump`, `LiquidOrifice`, `LiquidWallHX`, `LiquidMixer` |
| **twophase** | Evaporating/condensing refrigerant circuits: `TwoPhasePressureSource`, `TwoPhaseCompressor`, `TwoPhaseEvaporatorUA`, `TwoPhaseCondenserFloat`, `TwoPhasePipe` (Lockhart–Martinelli), `TXVSuperheat`, `ThreeZoneHX`, `BoilingVessel` |
| **ac** | Packaged air-conditioning / chiller-level blocks built on the two-phase set (e.g. `Chiller`) |
| **moistair** | Humid-air HVAC: `MoistAirSource`/`MoistAirSink`, `CoolingCoil`, `HeatingCoil`, `Humidifier`, `MixingBox`, `MoistAirWallHX` |
| **pneumatic** | ISO 6358 compressible gas lines: orifices, volumes, sources |
| **hydraulic** | Oil-hydraulic power: pumps, orifices, accumulators, `ReliefValve` |
| **heat** | Lumped heat transfer: `ThermalSource`, `ThermalMass`, `Conduction`, `Convection`, `Radiation`, `ContactResistance`, `HeatSource`, `MassGen` (self-heating mass) |
| **electrical** | Circuits & storage: `VoltageSource`, `Ground`, resistors (`HeatingResistor` couples to heat), `Capacitor`, `Inductor`, battery blocks with SOC, `FuelCellStack` (PEMFC) |
| **mechanical** | Rotational & translational 1-D mechanics: `Inertia`, `TransMass`, springs, dampers, `Gear`, `Planetary`, `Clutch`, `Friction`, grounds and sources |
| **powertrain** | Vehicle-level: `MeanValueEngine`, `Transmission`, `GradeRoadLoad` |
| **control** | Sensors and controllers that close loops on a network (e.g. `PIThermostat`, `ThermalSensor`, `FlowSensor`) |

Three conventions hold across the whole library:

- **No hidden defaults.** Every physical parameter must be given explicitly at instantiation — a missing one is an error, never a silent assumption.
- **Naming tells you the family.** `Liquid*`, `TwoPhase*`, `Pneumatic*`, `Hydraulic*`, `MoistAir*` prefixes mark the fluid family (and its `domain$` tag).
- **Fidelity is selectable, not duplicated.** Where one machine has several physics levels (a compressor with isentropic-η, volumetric, or map-based models), it is *one* component with a `model$` selector — see *Fidelity Variants*.

[Related: comp-variants, comp-first-network, ref-index]

[Topic: comp-variants]
# Fidelity Variants (model$)

Real projects move through fidelity levels: a first-cut cycle needs only an isentropic efficiency; the sized design wants the volumetric model; the calibrated digital twin wants the manufacturer's map. In frees that is **one component, many models** — a `model$` parameter selects which physics body is expanded:

```
{ concept study }
Compressor CMP(fluid$=R134a, eta=0.72, model$=isentropic)

{ sized design: same component, higher fidelity }
Compressor CMP(fluid$=R134a, eta=0.72, model$=volumetric,
               eta_v=0.92, disp=6.5e-5, rpm=2900)
```

Because the component and its ports don't change, **the network around it doesn't change either** — you upgrade fidelity by editing one line, not rewiring the model.

## Per-variant required parameters

Each variant declares the parameters it needs (`REQUIRE`), validated only when that variant is selected. Choosing `model$=volumetric` without `disp` is an immediate, named error; the same parameter is not even accepted noise for `model$=isentropic`. The reference page of every multi-model component lists its variants and their requirements under **Model Variants**, and the Component Wizard shows and requires exactly the parameters the selected variant needs.

Variants of your own components use the `VARIANT ... REQUIRE ... END` construct — see *Writing Your Own Component*.

[Related: comp-authoring, comp-library, comp-wizard]

[Topic: comp-authoring]
# Writing Your Own Component

When the library lacks a device — or you want your own correlation inside one — define a component in the document with `COMPONENT ... END`. The header parentheses declare the **ports** (in the order positional binding will use); `PARAM` lines declare parameters; everything else is acausal equations over port members, locals, and outputs.

```run
COMPONENT Heater(in, out)
  PARAM fluid$, Q
  out.mdot = in.mdot
  out.P    = in.P
  out.h    = in.h + Q / in.mdot
  T_out    = Temperature(fluid$, P=out.P, h=out.h)   { named output }
END

Source SUP(fluid$=Water, mdot=0.5 [kg/s], P=200000 [Pa], T=290 [K])
Heater H1(fluid$=Water, Q=50000 [W])
Sink   RET()
connect(SUP.out, H1.in)
connect(H1.out, RET.in)

T_supply = H1.T_out          { read the named output }
```

The rules:

- **Ports** carry whatever members your equations reference. Use `(P, mdot, h)` members and the port is a fluid port; use `(T, Qdot)` and it is a heat port — domain inference is automatic (see *Domains & Fluid Families*).
- **Parameters** — a trailing `$` marks a string parameter (`fluid$` is special: it names the stream's fluid for property calls and per-port fluid inference). `PARAM x = value` gives *your* component a default; the standard library deliberately never uses them.
- **Locals and outputs** — any bare name in the body is instance-private (auto-namespaced, like `MODULE` locals). Reading it from outside as `inst.name` makes it a named output.
- **Fluid family** — a component for a non-default family opts in with `PARAM domain$ = gas` (or `oil`, `moistair`, `liquid`, `twophase`), so the connector guard protects your lines too.
- **Composition** — a component body may instantiate other components and `connect` them: build a subsystem once, stamp it many times.

## Variants

Split fidelity levels with `VARIANT` blocks. Equations outside any variant are shared; each variant adds its own, and `REQUIRE` names the parameters it validates:

```
COMPONENT MyFan(in, out)
  PARAM fluid$, model$ = simple
  out.mdot = in.mdot                  { shared by every variant }
  VARIANT simple
    out.P = in.P + 250
  END
  VARIANT curve REQUIRE dP0, kQ
    out.P = in.P + dP0 - kQ * in.mdot^2
  END
END
```

`MyFan F1(fluid$=Air, model$=curve, dP0=300, kQ=1.5e4)` selects and validates the `curve` body.

[Related: comp-variants, comp-domains, functions]

[Topic: comp-transient]
# Steady ↔ Transient from One Network

A component network describes physics, not a moment in time — the **same wiring** yields a steady operating point or a transient, depending on whether you wrap it in a `DYNAMIC` block.

## Storage components carry the states

Time enters through **storage** components: `ThermalMass` (heat capacity), `MassGen` (self-heating mass), `Inertia` / `TransMass` (mechanical), `Capacitor` / `Inductor` (electrical), `Accumulator` (hydraulic), battery SOC, `BoilingVessel` (two-phase mass + energy). Each contributes a state derivative and an initial condition (its `T0`, `omega0`, `SOC0`, … parameter). Solved without a `DYNAMIC` block, the network settles to its steady operating point; add one and the states integrate in time:

```
{ A 4 kW battery module on a cold plate, warming its thermal mass }
MassGen     BATT(C=60000, Qgen=4000, T0=305 [K])
LiquidWallHX PLATE(fluid$=EG50, UA=800)
connect(PLATE.wall, BATT.port)
{ ... coolant loop around PLATE ... }

DYNAMIC warmup (method = ida, time = 0 .. 600, points = 601)
END
```

An **empty** `DYNAMIC` body is enough — the storage components inject their `der(...)` equations and initial conditions automatically. The block produces an ODE Table (Tables tab) with every state and stream member as columns you can plot, and the trajectory accessors (`FinalValue('...')`, `MaxValue('...')`, `TimeAt('...', v)`) read results back into the analytic solve.

## Scheduling inputs over time

Equations inside the `DYNAMIC` body may reference `time`, which is how time-varying inputs are expressed — ramp a compressor's capacity, step a heat load:

```
DYNAMIC pulldown (method = ida, time = 0 .. 600, points = 1201)
  CHLR.frac = 0.05 + 0.95 * min(time/5, 1)   { capacity ramp over 5 s }
END
```

Starting a ramp from a small floor (here 5%) rather than zero keeps the first step well-conditioned — see *Troubleshooting Networks*.

## Choosing the integrator

Component transients are usually **DAEs** — differential states coupled to a large algebraic network. Use `method = ida` (SUNDIALS implicit DAE integrator) for those; it is the default choice for anything with fluid loops. A pure-ODE network (thermal RC chains, mechanical trains) also runs on the stiff `ode23s` / `ode15s` methods described in *Transient / ODE Systems (DYNAMIC)*.

[Related: dynamic-ode, comp-linearize, comp-troubleshooting]

[Topic: comp-linearize]
# From Plant to Controller (LINEARIZE)

A transient network is a **plant**; the control suite wants it as state-space matrices. The `LINEARIZE` block numerically linearizes a named `DYNAMIC` block about its operating point and hands you `(A, B, C, D)`:

```
LINEARIZE plant (block = warmup, a = A, b = B, c = C, d = D)
  INPUT  Q_load
  OUTPUT BATT.port.T
END
```

- **States** are the `DYNAMIC` block's `der()` variables (the storage components' states).
- **INPUT** names the exogenous inputs to perturb; **OUTPUT** the observed quantities — both accept dotted member accessors like `BATT.port.T`.
- The matrix names in the header default to `A`, `B`, `C`, `D`.

The result is an ordinary set of matrices, so the whole control toolbox applies directly:

```
CALL ss2tf(A, B, C, D : num, den)          { transfer function of the plant }
CALL bode(num, den, omega : mag, phase)    { frequency response }
CALL lqr(A, B, Q_w, R_w : K)               { optimal state feedback }
```

Close the loop back in the time domain with controller components (`PIThermostat` and friends) inside the same `DYNAMIC` network — design in the frequency domain, verify in the transient, all in one document.

[Related: comp-transient, symbolic-cas, plot-code]

[Topic: comp-topology]
# Topology View & Cycle Plots

## The topology view

Every solved component network generates a **read-only schematic** — open the **Topology** tab to see instances as nodes and connections as edges, grouped by domain. It is derived from the expanded network itself, so it is always faithful to what actually solved: if the diagram looks wrong, the model *is* wrong (a missing connection or an unintended tie), which makes it the fastest first check when a network misbehaves. Use the Diagram canvas instead when you want a hand-built, annotated schematic bound to live values.

## Source-mapped diagnostics

Expansion never leaks into your error messages. Diagnostics and residual reports name **components, ports, and streams** (`CMP.out.P`, stream `s2`) — never the internal flattened variables — so a convergence failure points at a device you recognize, and the *Debugging a Solve* workflow (F9 block-solve, residual reading, guess seeding) applies unchanged.

## Cycle overlays on property charts

Stream members are first-class citizens of the plotting system. A `PLOT` block of kind `property` recognizes component stream states, so a refrigeration loop drawn through `s1 … s4` overlays as a cycle path on a P-h or T-s chart:

```
PLOT 'Cycle'
  kind = property
  fluid = R134a
  diagram = 'P-h'
  overlaystates = true
  connectstates = true
END
```

See *Plots in Code (PLOT)* for the full attribute set, and *Fluid State Tables* for the STATE TABLE route to the same overlay.

[Related: diagram, plot-code, state-tables]

[Topic: comp-wizard]
# The Component Wizard

The **Component Wizard** builds an instantiation line for you — useful while you are still learning a component's parameter surface, and for the map-driven components whose setup is more than one line.

Open it from the editor toolbar, pick a component, and the wizard presents:

- **Every parameter with its meaning and unit**, validated as you type — string parameters (`fluid$`) offer the known fluid lists.
- **Variant gating** — selecting a `model$` variant shows (and requires) exactly the parameters that variant `REQUIRE`s, so you cannot assemble an invalid combination (see *Fidelity Variants*).
- **UA from correlations** — for heat-exchanger components, a helper computes the conductance from geometry and film-coefficient correlations instead of a guessed number, and writes the supporting equations for you.
- **Map ingestion** — for map-based machines (`CompressorMap`, `FanMap`, `PumpMap`), paste or import tabulated curve data and the wizard emits the backing `TABLE` block wired to the component's map parameter.

The output is plain frees text inserted at the cursor — the wizard is a typing aid, not a separate model format; everything it writes you could have written by hand.

[Related: comp-variants, comp-library, tables-code]

[Topic: comp-troubleshooting]
# Troubleshooting Networks

Everything in *Debugging a Solve* applies to component networks. This page adds the failure modes specific to them.

## Errors at parse time (by design)

frees rejects a malformed network **loudly, before solving** — a hard error beats a silently wrong answer:

- **Port count mismatch** — a shared-name instantiation must bind *all* ports or *none* (none = wire with `connect`). `Component 'LINE' binds 1 port(s) but COMPONENT Pipe declares 2` means a stream is missing.
- **Mixed domains at a node** — connecting, say, a heat port to a fluid port. Cross domains through a transducer component, never a wire (*Domains & Fluid Families*).
- **Mismatched fluid families** — a `gas` line wired to an `oil` or `moistair` line. Check the components' `domain$` tags.
- **Three ports on one shared stream** — the shared-name form is strictly point-to-point; use a `connect` node for branches.
- **Missing parameters** — library components have no defaults; every parameter (and every `REQUIRE` of the selected `model$` variant) must be supplied.

## Convergence: cold-start patterns

A coupled cycle (a refrigeration loop, a pump network) can be structurally perfect and still diverge from a cold start. Three patterns fix most of it:

1. **Seed the pressure level explicitly.** Give every closed loop one component that *pins* pressure — a `PressureSource`-style feed or a pinned port member (`PUMPOUT.in.P = 200000 [Pa]`). A loop with only relative pressure drops has a floating level the solver must guess.
2. **Don't re-equate mixer pressures.** A mixer's node already equalizes the joining pressures; adding your own `MIX.in1.P = MIX.in2.P` duplicates an equation and makes the Jacobian singular.
3. **Floor the capacity, then ramp.** Starting a compressor or valve at exactly zero flow puts property calls at degenerate states. Hold a small floor (`frac = 0.05`) for the steady solve, or ramp from it in a transient (`frac = 0.05 + 0.95 * min(time/5, 1)`).

## Working method

Build the network **one leg at a time**: source → component → sink, solve, extend. Select a subsystem and press **F9** to solve only it. Diagnostics are source-mapped (component and stream names), so the failing block names the device to look at — and the Topology tab shows you at a glance whether the wiring you *meant* is the wiring you *wrote*. Set guesses on stream members (they appear under their display names, e.g. `s2.P`) in Variable Info exactly as for scalar variables. And inside the vapor dome, remember the two-phase rule: identify a state by quality `x` with `T` *or* `P`, never both.

[Related: debugging, comp-connections, comp-transient]
