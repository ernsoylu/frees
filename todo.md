# frEES — Component Layer: Forward Plan

**What this is.** The component-based system-modeling layer (acausal, multi-domain, pseudo-bond-graph) is **shipped and green (backend)** — ~50 components across fluid / heat / electrical / mechanical, a `model$` variant selector, steady + transient (`DYNAMIC`) operation, plant→control linearization, source-mapped diagnostics, and a Mermaid topology view. That capability is now documented in `README.md` (feature + milestone 11) and `CLAUDE.md` (*Component-Based System Modeling*). This file is the **forward plan only**: the components that are still **missing and in-scope**, phased **from maximum to minimum benefit**.

**How the gap was found.** A component-by-component cross-check against a complete, established 1-D multi-domain system-simulation submodel library (~40 domain libraries, ~14k submodels). frees already mirrors that library's *thermal / electrical / automotive / HVAC* domains well. The check surfaced **two entire fluid-power domains absent from frees**, plus depth gaps in two-phase thermofluid and a few cross-domain components — all buildable on physics frees already ships.

> **Implementation status (2026-06-27): every phase A–G has a shipped, green first slice.** ~25 new components and 6 new constitutive functions added on branch `feat/component-fluid-power-waves`, full backend suite green. New flow domains (pneumatic, hydraulic) reuse the fluid node rule — no new domain registration. Remaining within each phase = the harder fidelity rungs / new-machinery items called out per-phase below (true moving-boundary zone tracking, zero-crossing event handling, ECMS optimizer-in-loop, the full multi-species vector rider). See each phase's **Status** line.

---

## Scope filter (unchanged from the design remit)

frees holds the **0-D / lumped / multi-domain / acausal** band: every component is visible, editable, unit-checked equations expanded into the existing Newton/Tarjan + `DYNAMIC` pipeline. A candidate is **in-scope** only if it is 0-D and acausal. Explicitly **out of scope** (excluded from every phase below):

- **Spatial multibody** (2-D/3-D planar & 6-DOF mechanics, kinematic joints) — not lumped.
- **1-D CFD / wave-action** (method-of-characteristics gas dynamics, acoustics) — spatial/distributed, not 0-D control volumes.
- **AC power-electronic switching** (PWM inverters/rectifiers at switching resolution, reluctance-machine commutation) — fixed-step switching is a different solver regime (steady phasor models *are* in scope, deferred to the bottom).
- **Aerospace flight dynamics** (atmosphere + 6-DOF airframe). *(The ISA-atmosphere property function alone is a cheap standalone add, noted under Phase G.)*

## Reused foundation (no new solver work)

New domains plug into the **same** mechanism the four shipped domains use — register an `(across, flow)` pair + junction rule in `parser/DomainRegistry.java`; storage elements emit `der(member)=…` routed into a `DYNAMIC` block (`core/ode/DynamicSolver.java`, stiff `ode23s`); fidelity rungs are `model$` `VARIANT … REQUIRE …` bodies. The component grammar, expander, `connect`/shared-name closure, unit checker, and diagnostics are all reused unchanged. See `CLAUDE.md` → *Component-Based System Modeling* for the contract.

---

## Phase ordering at a glance (max → min benefit)

| # | Phase | Benefit driver | New physics? | Status |
|---|---|---|---|---|
| **A** | Pneumatic (gas) fluid-power domain | Largest absent application class; opens gas-circuit/actuation modeling | constitutive only (ISO 6358) | ✅ first slice green |
| **B** | Oil-hydraulic fluid-power domain | The reference library's #1 use case; opens hydraulic actuation | bulk-modulus compliance, spool/cavitation | ✅ first slice green |
| **C** | Two-phase / moving-boundary thermofluid depth | Makes the *existing* refrigeration/HVAC/EV-thermal flagship quantitative | constitutive only (Lockhart-Martinelli, zone tracking) | ✅ first slice green |
| **D** | Fuel cell (PEMFC) | One high-value cross-domain component; rounds out the EV/clean-power story | Butler-Volmer polarization | ✅ shipped green |
| **E** | Gas-mixture composition port | Enabler: composition-carrying streams unlock combustion air / exhaust / fresh-air HVAC | species-vector transport on streams | ✅ first slice green (single-species rider) |
| **F** | Powertrain & event-coupled mechanical breadth | Automotive depth (engine map, turbo, clutch, transmission, ECMS) | zero-crossing event handling | ✅ non-event slice green |
| **G** | Fidelity rungs, sensors & niche | Incremental polish; AC-phasor / aftertreatment / GTE-map long tail | small per item | ✅ first batch green |

Each phase is independent and shippable on its own; A–C carry the most benefit-per-unit-effort.

---

## Phase A — Pneumatic (gas) fluid-power domain  ✅ **first slice shipped & green**

**Status (2026-06-27).** Shipped: the **ISO 6358** constitutive function (`props/Pneumatics.iso6358(C, b, Pup, Tup, Pdown)`, choked + subsonic branches, ANR reference, wired across the registry/evaluator/unit-checker 3-site pattern) and the component bodies `PneumaticSupply`, `PneumaticAtmosphere`, `PneumaticOrifice`, `PneumaticServoValve`, `PneumaticVolume` (transient charging), and `PneumaticActuator` (cross-domain pneumatic→translational). A pneumatic port reuses the **fluid** node rule — no new domain registration needed, confirmed by `nodeDomain` classifying `(P, ṁ, h)` as `FLUID`. Validated by `ComponentPneumaticTest` (6 tests: choked/subsonic orifice, choke-independence, servovalve scaling, volume charging transient, actuator force balance); full backend suite green. **Remaining rungs:** signal-driven servovalve opening, dynamic-temperature volume (energy eq vs. isothermal), reversible (acausal) orifice flow, a full moving-boundary cylinder with chamber `der(P)` + piston `der(x)`.

**Why first.** Pneumatics is one of the two largest domains in the reference library and is **entirely absent from frees**, yet all the hard physics — ideal gas, real-gas properties, isentropic/choked compressible flow — is **already shipped**. What's missing is the *domain wrapper*: a pneumatic port and a small component family. Highest new-capability-per-effort with no new solver work.

**Enabler.** Register a **pneumatic port** `(P, ṁ)` carrying gas state (P, T or h, composition optional) in `DomainRegistry` — node rule `P` equal, `Σṁ=0`, energy via the existing stream-enthalpy convention. Reuse the compressible-flow library for the flow laws.

**Components (each a `model$` ladder):**
- **Pneumatic source / reservoir boundary** — fixed `P,T` supply / exhaust to atmosphere.
- **Pneumatic orifice / restriction** — **ISO 6358** (`C`, `b` critical-pressure-ratio) → constant-`Cq` → sonic/subsonic choked. The subsonic↔choked switch is a smooth `model$` body (tanh-blend at the critical ratio, as `stream_h` already does).
- **Pneumatic volume / receiver** *(storage, transient)* — `der(P) = (RT/V)·Σṁ` (charge/discharge), with a heat port for non-adiabatic walls. Same storage pattern as the shipped `Accumulator`.
- **Servovalve / directional valve** — 2-/3-way variable-orifice (signal-driven opening area) built from the orifice law.
- **Pneumatic cylinder / actuator** — gas chamber `(P,V)` × piston area → translational `(F,v)` port (reuses the shipped translational domain). This is the cross-domain payoff: a pneumatic→mechanical actuator solves in one network.

**New physics:** ISO 6358 mass-flow law + critical-pressure-ratio choking (one constitutive function). Everything else is existing compressible flow + the storage/transient and translational-port machinery.

**Acceptance:** a supply→servovalve→cylinder circuit reaches a steady force/position; a reservoir blowdown integrates through the choked→subsonic transition; choked mass flow matches the compressible-flow library; zero unit warnings.

---

## Phase B — Oil-hydraulic fluid-power domain  ✅ **first slice shipped & green**

**Status (2026-06-27).** Shipped (no new backend function — the orifice/relief/pump laws are plain algebra over `sqrt`/`abs`/`tanh`/`pi#`): `HydraulicSupply`, `HydraulicTank`, `HydraulicOrifice` (`ṁ·|ṁ|=CdA²·2ρ·ΔP`), `HydraulicValve` (signal-`u` metering edge), `ReliefValve` (tanh-cracked at `Pcrack`), `HydraulicCylinder` (bulk-modulus chamber `der(P)=(β/V)(ṁ/ρ−A·v)` → translational `(F,v)` port), and `HydraulicPump` (positive-displacement `Q=D·N·η_v`, `τ=D·ΔP/η_m`, coupling the hydraulic port to the rotational `(τ,ω)` port). The hydraulic port reuses the **fluid** node rule. Validated by `ComponentHydraulicTest` (4 tests: orifice metering, relief cracking bracket, speed-driven pump operating point, cylinder holding force). **Remaining rungs:** laminar-transition orifice, gas-charged accumulator, spool flow-force, cavitation `β(P)`, full directional-valve (N-position spool).

**Why second.** Oil-hydraulics is the single largest / origin domain of the reference library and is **absent from frees**. frees already has flow resistance, `Cv`/orifice, and the `Accumulator` compliance pattern — the missing piece is the **hydraulic power domain**: incompressible-with-bulk-modulus pressure–flow plus the spool-valve / cylinder / pump actuation chain that defines the domain.

**Enabler.** A **hydraulic port** `(P, Q)` (volumetric flow `Q`, or keep `ṁ` and divide by ρ) with node rule `P` equal, `ΣQ=0`. The load-bearing new element is a **chamber-compliance storage**: `der(P) = (β/V)·(ΣQ − dV/dt)` (β = effective bulk modulus, optionally pressure/air-entrainment-dependent) — structurally identical to the pneumatic volume and the shipped capacitive elements.

**Components (each a `model$` ladder):**
- **Hydraulic supply / tank / pressure source** — fixed-P or fixed-flow boundary.
- **Orifice / restrictor / metering edge** — `Q = Cd·A·√(2ΔP/ρ)`, smooth signed form at ΔP=0 (reuse the shipped squared-resistance smoothing) → laminar-transition variant.
- **Directional / spool control valve** — 2/3/4-port, N-position; signal-driven spool opens metering edges (built from the orifice law). The bread-and-butter hydraulic element.
- **Relief / pressure / check valve** — cracking-pressure + flow-force variants (smooth-regularized opening).
- **Hydraulic cylinder** — chamber compliance × area → translational `(F,v)` port (two chambers + piston); the actuation payoff.
- **Pump / motor (positive-displacement)** — `Q = D·N·η_v`, `τ = D·ΔP/η_m`; couples the hydraulic port to the shipped rotational `(τ,ω)` port (variable-displacement = a `model$` rung).
- **Hydraulic accumulator** — gas-charged (reuse pneumatic gas law + chamber compliance).

**New physics:** bulk-modulus compliance (`der(P)`), the spool metering-area function, cracking-pressure relief. Cavitation/air-release as an optional β(P) `model$` rung.

**Acceptance:** a pump→relief→directional-valve→cylinder→tank circuit reaches a steady actuator force/velocity; a closed dead-volume compresses per its bulk modulus; relief cracks at its setpoint; pump torque balances the load through the rotational port; steady limit recovers the algebraic operating point.

---

## Phase C — Two-phase / moving-boundary thermofluid depth  ✅ **first slice shipped & green**

**Status (2026-06-27).** Shipped: the Lockhart–Martinelli / Chisholm functions (`props/TwoPhase`: `lm_phi2(X, C)` two-phase multiplier, `lm_martinelli_tt(x, ρ_l, ρ_g, μ_l, μ_g)` turbulent-turbulent parameter, both wired across the 3-site pattern) and the components `TwoPhasePipe` (liquid-alone Darcy × `φ_l²`), `TXVSuperheat` (superheat-controlled expansion valve sensing the evaporator-outlet temperature via a heat-port bulb, `ṁ=Kv·(SH−SH_set)`, `T_sat` from `Temperature(fluid$, P, x=1)`), and `ThreeZoneHX` (3-cell counterflow ε-NTU subsystem, extending the shipped `TwoZoneHX` pattern). Validated by `ComponentTwoPhaseTest` (LM ΔP vs. backend correlations CoolProp-free; TXV metering with R134a saturation; 3-zone energy balance). **Remaining rungs:** true moving-boundary zone-length tracking (`der(L_zone)`), Friedel correlation, quality-split receiver/separator, micro-channel/plate-fin geometry `model$` rungs.

**Why third.** This does not open a new domain — it makes frees's **existing** refrigeration / A-C / EV-thermal flagship *quantitative* instead of lumped ε-NTU. Pure constitutive adds on shipped CoolProp two-phase properties; lowest risk in the plan; directly serves frees's current users.

**Components (each a `model$` ladder; all built on shipped physics):**
- **Moving-boundary / multi-zone evaporator & condenser** — ε-NTU (have) → **n-cell discretized** → **3-zone** (subcool / two-phase / superheat) with tracked zone-length fractions. Heat-exchanger geometry variants (micro-channel tube-fin · plate-fin · brazed-plate) as `model$` rungs feeding the area/UA.
- **Two-phase pipe pressure drop** — Darcy (have) → **Lockhart-Martinelli** → **Friedel**; void-fraction model for the static head.
- **Thermostatic / electronic expansion valve (TXV/EEV)** — the shipped `ExpansionValve` (fixed orifice, isenthalpic) → **superheat-controlled** rung (bulb superheat sets the opening area; closes the evaporator superheat loop).
- **Receiver / accumulator / liquid separator** — two-phase volume with quality-split outlets (liquid vs. vapor draw).

**New physics:** Lockhart-Martinelli / Friedel two-phase ΔP correlations; moving-boundary zone-fraction equations. No new ports, no new solver machinery.

**Acceptance:** a vapor-compression loop with a 3-zone evaporator + 3-zone condenser + superheat-controlled TXV solves and matches a textbook design point; two-phase ΔP matches the correlation reference; the steady superheat loop converges to the TXV setpoint.

---

## Phase D — Fuel cell (PEMFC)  ✅ **shipped & green**

**Status (2026-06-27).** Shipped `FuelCellStack(p, n, heat)` — a cross-domain component reusing the electrical `(V,I)` + heat `(T,Q̇)` ports. The cell voltage is the standard polarization curve `V_cell = E0 − (RT/αF)·ln(i/i0) − i·R_ohm − (RT/2F)·ln(i_lim/(i_lim−i))` (reversible EMF − activation/Tafel − ohmic − concentration), the stack is `ncells·V_cell`, and the waste heat is `I·ncells·(E_th − V_cell)`. Pure component body over `ln` — no new backend function. Validated by `ComponentFuelCellTest` (polarization voltage + waste-heat at a fixed-current operating point; monotone V↓/Q↑ with current). **Remaining rungs:** dynamic double-layer `der(V)`, reactant-partial-pressure dependence (needs Phase E gas-mixture composition), Faraday reactant-consumption gas ports.

**Why here.** A single, self-contained, high-visibility component that **reuses every domain frees already has** (electrical `(V,I)` + thermal `(T,Q̇)` + gas reactant streams) and complements the battery/EV story — the design-time "clean powertrain" piece. Feasible now; modest scope.

**Component (a `model$` ladder):**
- **PEMFC stack** — static **polarization curve** (`V = E_nernst − η_act(Butler-Volmer) − η_ohmic − η_conc`) → **dynamic** (double-layer capacitance `der(V)`, reactant-partial-pressure dependence) → stack/cell scope. Couples: electrical port (stack `V,I`), thermal port (waste heat `Q̇ = I·(E_th − V)`), and reactant gas ports (H₂/O₂/air consumption from Faraday's law, optional humidity via the shipped HumidAir).
- **Supporting boundaries** — reactant supply at a given stoichiometry/humidity (reuses gas + moist-air physics).

**New physics:** Butler-Volmer activation overpotential + Nernst EMF (one polarization function). Reactant consumption is Faraday's law.

**Acceptance:** a stack at a drawn current produces the textbook polarization voltage and waste-heat split; coupled to a resistive load it finds the operating point; with a thermal mass it integrates a warm-up transient.

---

## Phase E — Gas-mixture composition port  🟡 **first slice shipped & green**

**Status (2026-06-27).** Shipped a focused composition-transport slice **with no expander surgery**: a species mass fraction rides as an ordinary stream member (`.y`), and **shared-name binding aliases it through the network** just like `P`/`h`/`ṁ`. `GasSource`, `GasPipe` (composition pass-through `out.y=in.y`), and `GasMixer` (flow-weighted species `Σṁ·y` conservation, exactly as the standard `Mixer` does enthalpy). Validated by `ComponentGasMixtureTest` (flow-weighted blend, pass-through, cascaded 3-way blend). **Remaining (the harder, deferred design):** a full **multi-species vector rider** `{Y_i}` with `connect`-node propagation (requires teaching the expander's across-rule / mixing logic to carry composition as a first-class convective rider like `h`) — this is the prerequisite that promotes aftertreatment and GTE component maps (Phase G long-tail) from niche to buildable, and adds reactant-partial-pressure dependence to the Phase-D fuel cell.

**Why here.** frees has the thermochemistry (NASA-7, equilibrium Kp, mixtures, combustion) but its **streams don't carry a composition vector** — so multi-species air paths (engine intake/exhaust, HVAC fresh-air mixing, aftertreatment feed) can't be modeled as connected components. This is the **enabler** that unlocks Phase F's engine air-path and the aftertreatment/GTE long tail.

**Work:**
- Extend the fluid/gas stream to carry an optional **species mass-fraction rider** `{Y_i}` alongside `(P, ṁ, h)`; node rule mixes it flow-weighted at a junction (`Σṁ·Y_i` balance), passes it through otherwise — the same convective-rider mechanism `h` already uses.
- **Gas-definition / mixture-source** components (air, fuel, combustion products) building on the shipped NASA-7 / mixture library.
- **Combustor / reactor** component consuming reactants → products via the shipped adiabatic-flame / equilibrium machinery, now connectable in a flow network.

**New physics:** none — composition transport is a new convective rider on the existing stream; chemistry is already shipped.

**Acceptance:** a mixing junction conserves species mass fractions flow-weighted; a combustor fed by connected air + fuel streams reproduces the standalone adiabatic-flame-temperature example; composition propagates downstream through a pipe network.

---

## Phase F — Powertrain & event-coupled mechanical breadth  🟡 **non-event slice shipped & green**

**Status (2026-06-27).** Shipped the **non-event** powertrain breadth (no zero-crossing handling needed): `MeanValueEngine` (speed-dependent inverted-parabola WOT torque × throttle − FMEP friction `a+b·ω`), `Transmission` (gear ratio + efficiency, extending the ideal `Gear`), and `GradeRoadLoad` (rolling + aero + `m·g·sin(grade)`). Validated by `ComponentPowertrainBreadthTest` (each constitutive relation in isolation + an engine→transmission→road-load steady geared-torque-balance operating point). **Still deferred (genuinely need new machinery):** clutch lock-up **event** + flow-reversal/diode/valve switching (require the Phase-R zero-crossing event handler in the `DYNAMIC` integrator); **ECMS** (optimizer-in-the-loop supervisory control — `core/Optimizer` + BSFC `TABLE` + `DYNAMIC` SOC, a dedicated multi-part increment); map-based BSFC engine + turbocharger maps (the proven datasheet-`TABLE` pattern, build when prioritized).

**Why here.** Extends the shipped mechanical/electrical/battery powertrain with the automotive-specific components. Several need **zero-crossing event handling** in the `DYNAMIC` integrator (the one genuinely new solver capability in the plan), so this phase is gated on that and ranks below the constitutive-only phases.

**Solver prerequisite (Phase-R carryover):** discrete-state / zero-crossing event handling — components declare an integer mode + switching function; the stiff integrator detects crossings and restarts the step (stick↔slip, flow reversal, valve/diode/clutch on↔off). Prefer smooth (tanh) regularization where accuracy allows; reserve true events for genuine on/off.

**Components:**
- **Clutch / dual-clutch** — locked↔slipping torque transfer (stick-slip **event**). *(The shipped `Friction` is tanh-smoothed and event-free; this adds the true lock-up event.)*
- **Mean-value / map engine** — BSFC + torque map (digitize→`TABLE`, the proven datasheet pattern) + FMEP friction; intake/exhaust via the Phase-E gas-mixture port.
- **Turbocharger** — compressor-map + turbine-map + shaft inertia (variable-geometry / two-stage as `model$` rungs).
- **Transmission** — fixed-ratio / AT (torque converter) / DCT; couples to the clutch + gear set.
- **Vehicle longitudinal road-load** — rolling + aero + grade resistance → translational port (the shipped `RoadLoad` extended with grade/aero rungs).
- **HEV supervisory energy management — ECMS** *(deferred item, promoted here)*: an online optimal-control strategy — at each step minimize `ṁ_fuel(P_eng) + s·P_batt/LHV` over the engine/motor split, with the equivalence factor `s` adapted from SOC error. Built on the shipped `Optimizer` + BSFC `TABLE` + `DYNAMIC` SOC; a supervisory component running the optimizer-in-the-loop. A genuine multi-part feature, not a fixed power-split.

**Acceptance:** a clutch lock-up event restarts the integrator cleanly; a map engine + transmission + road-load reaches a steady drive point and runs a drive-cycle transient; a turbocharged engine balances shaft power; ECMS keeps SOC charge-balanced over a cycle while minimizing fuel.

---

## Phase G — Fidelity rungs, sensors & niche  🟡 **first batch shipped & green**

**Status (2026-06-27).** Shipped the cheap, clearly-in-scope batch: ISA 1976 standard-atmosphere functions (`props/Atmosphere`: `isa_T`/`isa_P`/`isa_rho`, troposphere + lower stratosphere, wired across the 3-site pattern), `ThermalSensor` / `FlowSensor` (PROBE-style measurement drawing no power), `Battery2RC` (2RC Thévenin extending `BatteryRC`), and `CurrentSource` (the missing electrical primitive). Validated by `ComponentNicheTest` (5 tests). **Remaining (build opportunistically / deferred):** contact-resistance & laminar-transition `model$` rungs; diode/switch **events**; motor & inverter η-maps (datasheet-`TABLE`); AC-phasor electrical (in-scope subset of the excluded switching domain); aftertreatment & GTE component maps (both need Phase E gas-mixture composition).

Small, mostly one-to-three-equation additions; incremental polish and niche coverage. Build opportunistically.

- **Thermal:** contact / interface resistance (`model$` rung on convection); thermal sensor; n-node wall.
- **Electrical:** diode / switch (event-gated); current source; **2RC Thévenin** battery; ultracapacitor; motor & inverter **efficiency maps** (the proven datasheet-`TABLE` pattern).
- **Mechanical:** rotational/translational spring (angle/position state); planetary-with-efficiency.
- **Valves/flow:** explicit choked-flow rung on the std `Valve`; laminar-transition orifice.
- **AC-phasor electrical** *(in-scope subset of the excluded switching domain)*: steady-state single-/three-phase phasor models (impedance, power-factor, RMS sources) — **no** switching resolution. Build only if an AC use case is prioritized.
- **Aftertreatment** *(needs Phase E)*: 3-way catalytic converter / SCR as map-based conversion-efficiency components (no finite-rate kinetics).
- **Gas-turbine component maps** *(needs Phase E)*: SAE-format compressor/turbine maps + combustor primary/secondary zones, extending the shipped Brayton cycle.
- **ISA standard atmosphere** — a standalone property function (1976 US Standard Atmosphere); cheap, useful for any altitude-dependent input.

**Acceptance (per item):** matches its reference correlation/datasheet; zero unit warnings; steady limit consistent where transient.

---

## Build sequence (waves)

1. **Wave 1 — fluid power:** Phase A (pneumatic) → Phase B (hydraulic). Two new domains on existing flow physics; the biggest absolute capability gain.
2. **Wave 2 — thermofluid depth + clean power:** Phase C (two-phase/moving-boundary) → Phase D (fuel cell). Deepens the flagship and adds the marquee cross-domain component; constitutive-only, low risk.
3. **Wave 3 — composition & powertrain:** Phase E (gas-mixture port) unlocks Phase F (engine/turbo/clutch/ECMS, with event handling).
4. **Wave 4 — long tail:** Phase G fidelity rungs, sensors, AC-phasor, aftertreatment, GTE maps, ISA atmosphere — as prioritized.

**Algorithmically novel pieces** (worth a dedicated derivation, the rest are constitutive bodies the expander already handles): ISO 6358 choked-flow blend (A), bulk-modulus chamber compliance + spool metering (B), moving-boundary zone tracking + Lockhart-Martinelli (C), Butler-Volmer polarization (D), species-rider transport (E), zero-crossing clutch/event handling (F).
