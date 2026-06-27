# frEES — Two-Phase & Refrigeration Modeling: Domain Re-Architecture

## Engineering Plan & Advisory-Board Discussion Document

**Prepared for:** Advisory Board (Thermal-fluids, Refrigeration/HVAC, Two-phase flow, Numerics, Automotive/EV thermal)
**Scope:** Re-architecting frEES's thermofluid component layer into **two distinct working-fluid domains** — a single-phase **liquid** domain and a phase-change **two-phase** domain — and building an **air-conditioning / refrigeration application layer on top of the two-phase domain**, mirroring the proven Amesim `THH` / `TPF` / `AC` library split.
**Purpose:** This is a *discussion document*. The goal is **accurate refrigeration-system results** — today's 0-D cycle calculator is structurally optimistic (no refrigerant-side ΔP across heat exchangers, suction pressure forced equal to the evaporating pressure, no refrigerant charge, no distributed temperature glide). We want the board to pressure-test the architecture, the correlation choices, and the scope line before implementation.

> **Note on prior work.** frEES already ships a complete acausal multi-domain component layer (~90 components: fluid/cycle, pneumatic, hydraulic, electrical/battery, fuel cell, mechanical/powertrain, humid-air HVAC, gas-mixture) with **strict connector-domain separation** (`domain$` typing: `fluid`/`gas`/`oil`/`moistair`). That shipped record lives in `README.md`, `CLAUDE.md`, and git history. This document replaces the prior forward plan and focuses **only** on the two-phase / refrigeration re-architecture.

> **STATUS — SPEC LOCKED (advisory board ratified, two rounds).** The architecture below is approved for build. Round-1 drove four binding revisions, folded in throughout: **(1)** the solver core is promoted to the **first** phase (**S1**), a hard prerequisite for the two-phase physics — sequence is **S1 → L → T0 → T1 → T2 → AC → T3** (§7); **(2)** the `twophase` connector is **slimmed to `(P, ṁ, h)`** — `x`/`α`/SH/SC are derived locally, *not* carried as riders (§2.2); **(3)** a **two-tier zero-crossing strategy** (smooth-regularize the high-frequency crossings, true-rootfind only structural events) is adopted (§4.8); **(4)** all six open questions are resolved (§10).
>
> **Round-2 (critics 3 & 4) decisions, folded in:** **(5)** **Phase S1 wraps SUNDIALS IDA via JNI** (reusing the existing CoolProp native bridge) rather than hand-rolling a BDF — IDA supplies variable-order BDF, `IDARootFind` events, `IDACalcIC` consistent init, KLU sparse (§7-S1); **(6)** a **hard expander rule `never C-C, always C-R-C`** keeps the DAE index-1 (§2.2); **(7)** the void-fraction `corr$` is **branch-wide inherited**, not per-component, to prevent phantom charge at junctions (§3, §10-Q2); **(8)** the property layer treats **supercritical as a first-class region** (R744 transcritical is normal, not an edge case) with a near-critical safe-fallback (§7-S1); **(9)** a floored moving-boundary zone zeroes its **storage term** (true passthrough, no phantom mass) and is **state-pruned from `LINEARIZE`** (§4.8); **(10)** `fluid → liquid/twophase` is a **hard migration + codemod**, no legacy mode (§10-Q1).
>
> **BUILD STATUS — Phase S1 COMPLETE & validated (against SUNDIALS v6.4.1 + KLU).** The full solver core is implemented, wired, and green:
> - **`props/PhPropertyTable`** — globally-C¹ bicubic-Hermite `(P,h)` table with **analytic** ∂/∂P, ∂/∂h (the §4.8 Tier-1 saturation smoothing baked into the same derivative path), a CoolProp grid builder over subcooled/two-phase/superheated/**supercritical**, near-critical NaN safe-fallback (tested incl. an R744 transcritical sweep).
> - **`core/dae/SundialsIda`** — JNA binding to SUNDIALS IDA. Targets the **≥6 `SUNContext` API** and *probes for `SUNContext_Create`* so a pre-6 lib (e.g. MATLAB's bundled v5) is correctly rejected rather than crashing at init; degrades gracefully when absent, exactly like `CoolProp`. The optional **sparse-matrix + KLU** factories are bound through their own library handles (they're not NEEDED-deps of `libsundials_ida`).
> - **`core/dae/IdaDaeSolver`** — closure wrapper: `DaeResidual`/`DaeRootFn`, `IDACalcIC` consistent-init, mode-frozen `IDAReInit`, `IDARootInit` events, **dense or KLU-sparse** linear solver (auto-falls back to dense if KLU absent).
> - **`core/dae/DaeAssembly` + `DynamicSolver.assembleDae()`** — assembles the expanded scalar `DYNAMIC` system into the implicit DAE `F(t,y,y')=0`: `y=[states;aux]`, `der$X→y'[idx(X)]`, **`IDASetId` differential/algebraic vector** from the `C-R-C` structure, and the **combined-Jacobian sparsity pattern**. `method = ida` routes a `DYNAMIC` block through IDA (KLU above a size threshold); aux become true DAE unknowns (no inner Newton).
> - **`core/dae/DaeJacobian`** — FD assembly of `J = ∂F/∂y + cj·∂F/∂y'` (single-perturbation column trick), reused by the KLU CSC Jacobian callback.
> - **Deployability** — `backend/Dockerfile` now installs `libsundials-dev` (v6) so the deployed backend has the IDA stack.
>
> **Validation:** full backend suite green; with `libsundials-dev` v6.4.1 installed, all IDA tests run for real (0 skipped) — index-1 DAE, root event at `t=ln2`, reinit continuation, **KLU sparse path**, and end-to-end `method=ida` DYNAMIC solves matching the analytic Newton-cooling reference.
>
> **BUILD STATUS — Phase L COMPLETE.** **(1) Library reorganization:** the monolithic `ComponentLibrary.SOURCE` string is split into per-domain `resources/components/*.frees` files (`fluid`/`liquid`/`twophase`/`heat`/`electrical`/`mechanical`/`powertrain`/`control`/`moistair`/`pneumatic`/`hydraulic`), concatenated in fixed order at startup into the same parse-once immutable `BUILTINS` registry — parses identically (existing component suite green). **(2) Liquid domain (THH-equivalent):** `liquid.frees` adds `LiquidSource`/`LiquidSink`/`LiquidPump`/`LiquidPipe`/`LiquidColdPlate`/`LiquidVolume`/`LiquidOrifice` (with an optional THH-style `cavitating` VARIANT) on connector type `domain$ = liquid` — the same `(P,ṁ,h)` bond as `fluid` but a distinct connector type. `checkFluidConnectorType` rejects liquid↔fluid/gas/oil/twophase/moistair (string-compare; error message updated to list all six families + "couple them only through a heat exchanger"). *Validated:* a battery cold-plate water loop solves; a liquid pump shows the small incompressible `v·ΔP/η` work; liquid↔fluid and liquid↔hydraulic connects are rejected; the split library loads all 97 built-ins. Next action: **Phase T0** (register `domain$ = twophase` on the slimmed `(P,ṁ,h)` connector, `never C-C` rule, two-phase `Source`/`Sink`/`Sensor` with local x/α, void-fraction + Friedel/acceleration ΔP correlations).

---

## 0. Motivation & grounding (what the investigation found)

A component-level investigation of the Amesim libraries (`~/dev/sampleCodes`) established the reference architecture we are adopting:

1. **`THH` (Thermal-Hydraulic) is a single-phase *liquid* library** — 571 submodels, **zero** that boil or condense; every fluid is a liquid (oils, fuels, glycol coolants, propellants). It models a compressible liquid with thermal effects and **cavitation** (a *pressure-driven* compressibility effect, **not** thermal phase change). Confirmed: THH cannot represent boiling/condensing.
2. **`TPF` (Two-Phase Flow) is the general phase-change library** — its `hflow` port carries **P · specific enthalpy · temperature · vapor quality `x` · void fraction `α` · superheat/subcooling**, with per-element **two-phase ΔP, slip-ratio (void), and acceleration** closures. It is built from **C (capacitive volume)** and **R (resistive flow)** primitives — alternating C-R-C-R *is* the staggered-grid finite-volume discretization.
3. **`AC` (Air Conditioning) is an *application layer on top of `TPF`*** (same `hflow` port) — ready compressors, evaporators, condensers, TXV+bulb, receivers, and the geometry-resolved multi-cell heat exchangers that **bridge domains**: `TPF-THH` (refrigerant ↔ coolant = *the EV chiller*) and `TPF-GMMA` (refrigerant ↔ moist air = *air coil*).

**Conclusion the board is asked to ratify:** frEES should mirror this — a **single-phase `liquid` domain** (THH-equivalent), a **`twophase` domain** (TPF-equivalent) carrying `x`/`α`, and an **AC component package** built on the two-phase domain, with the two interoperating through shared two-phase ports and coupling to liquid/moist-air loops only through heat-exchanger transducers.

---

## 1. Executive summary

- **Today:** one generic thermofluid connector type (`fluid`) carrying `(P, ṁ, h)`. Refrigeration components (`Compressor`, `Boiler`, `Condenser`, `ExpansionValve`, `TXVSuperheat`, `ThreeZoneHX`, …) are built directly on it. There is **no** vapor-quality/void rider, **no** void fraction, **no** charge inventory, **no** boiling/condensing heat-transfer correlations, **no** refrigerant-side ΔP across heat exchangers (all isobaric), and **no** capacitive/resistive volume primitives. Results are design-point-only and optimistic.
- **Proposed:** split the thermal working-fluid handling into a **`liquid`** domain and a **`twophase`** domain; keep the two-phase connector at `(P, ṁ, h)` and derive `x`/`α`/SH/SC **locally** (§2.2); add a constitutive-correlation library (void fraction, two-phase ΔP, boiling/condensing HT) and **C/R volume + flow primitives**; scope a **refrigerant-charge inventory** constraint to two-phase volumes; and build the **AC application package** (unified evaporator/boiler, condenser, compressor, pump, Cv orifice, 4-quadrant TXV, EXV, receiver, chiller, air coil) on top — interoperable with the two-phase primitives and coupling to liquid/air loops via HX bridges.
- **Headline modeling decisions for the board (detailed in §4):**
  1. **A boiler *is* an evaporator** — one two-phase heat-addition component: liquid/two-phase inlet → boils → superheated-vapor outlet, with regime-aware heat transfer. The condenser is its heat-rejection mirror.
  2. **Pumps and compressors stay distinct** — a pump does incompressible liquid work (`v·ΔP`); a compressor does real-vapor compression (`Δh_s/η`). Different machines, different domains/regions.
  3. **The two-phase orifice is a `Cv`/`CdA` mathematical relation**; on top of it we build a **4-quadrant-map TXV** and a **controlled EXV**.
- **Numerics (revised — solver core comes FIRST):** the stiff variable-order **BDF DAE integrator with rootfinding**, **consistent-initialization** solve, and **bicubic `(P,h)` property tables with analytic derivatives** are **Phase S1**, a hard prerequisite — *not* a late "Tier B" add-on. The two-phase physics (T1–T3) are structurally undefined without them: the integrator and the event handler are the **same deliverable**, and a moving-boundary HX (T3) has no semantics without rootfinding + consistent re-init. The smoothing functions of §4.8 must be differentiated **analytically into the same derivative path** as the property tables — FD-smoothing under an analytic Jacobian lets the BDF step straight through the kink (board note).

---

## 2. The domain architecture

### 2.1 The `liquid` domain (single-phase — THH-equivalent)

A single-phase liquid working fluid for **coolant / water / glycol / oil / fuel** circuits (battery cold-plate loops, low-temperature radiator loops, lubrication). Connector type `domain$ = liquid`.

- **Port / riders:** `(P, ṁ, h)` — same bond as today; temperature is a derived property; no quality/void.
- **Closures:** single-phase Darcy/Colebrook ΔP (have), temperature-dependent ρ/μ/cp, optional bulk-modulus compliance and **cavitation** (pressure-driven effective-density correction — the THH behaviour, *not* boiling).
- **Migration:** existing single-phase thermofluid uses of the generic `fluid` domain (coolant loops, water transport) move here. *Open question for the board: do we keep `fluid` as a permissive alias for backward compatibility, or hard-migrate? (§10 Q1).*

### 2.2 The `twophase` domain (phase-change — TPF-equivalent)

A phase-change-capable working fluid (**refrigerants R134a/R1234yf/R744/R290, steam**) that may be **subcooled liquid, two-phase mixture, or superheated/dry gas** — the state is determined from `(P, h)` via CoolProp, never assumed by the component. Connector type `domain$ = twophase`.

- **Port (slimmed — board ratified):** strictly `(P, ṁ, h)` — the **same three bond variables as `fluid`**; no quality/void/SH/SC riders. `x`, `α`, SH, SC are **algebraic functions of `(P, h)`** for a pure/azeotropic refrigerant (`x = (h−h_f(P))/(h_g(P)−h_f(P))`, `T = T_sat(P)`, `α` from a slip model), so they are computed **locally inside each component**, never transported. **Why not riders:** the moist-air `w` analogy is a *false friend* — `w` is an independent conserved *mass* (water) that must ride and be flow-weighted at junctions; two-phase `x` is a *dependent state*, and asserting a junction mixing rule for `α` (slip-/regime-dependent, defined inside an element) would be physically wrong. Keeping the connector at `(P, ṁ, h)` guarantees junctions stay a plain mass/enthalpy balance.
- **Future opt-in — zeotropic glide:** for a multi-component *blend* (R407C, …) composition `z` **is** an independent rider; it slots into `ComponentExpander.acrossMembersForNode` exactly as moist-air `w` does. Designed for, out of scope now.
- **Saturation coupling:** inside the dome, `T = T_sat(P)`; ΔP along an element therefore *glides* the temperature — the effect the current isobaric model misses.
- **Four regions, supercritical first-class:** the property layer must resolve **subcooled / two-phase / superheated / supercritical** — for **R744 (CO₂) transcritical operation is the normal high-side mode, not an edge case**, so the trajectory routinely crosses the pseudo-critical line. The S1 `(P,h)` tables carry the supercritical region with a smooth pseudo-critical transition and a **near-critical safe-fallback** (CoolProp's Helmholtz EOS can fail/return non-physical derivatives right at the point) — see §7-S1 acceptance.
- **Constitutive library:** §3.
- **C/R primitives:** a **capacitive control volume** (`C` — holds `P, h` states, `der(mass)`/`der(energy)`, contributes `ρ(P,h,α)·V` to the charge, with `α` computed locally) and a **resistive flow element** (`R` — two-phase frictional + acceleration ΔP). Alternating C/R builds lumped → few-cell → distributed models.
- **Index discipline (hard expander rule): `never C-C, always C-R-C`.** Connecting two `C` volumes directly (both fixing `P` at the node) is the index-2 trap; the expander must reject it. With C-R-C alternation, charge-as-an-IC-invariant in transient (§4.6), and steady-state tearing, the constraint never enters the DAE and the system stays **index-1** — which is exactly the class SUNDIALS IDA handles robustly (§7-S1).

### 2.3 The AC application layer (on top of `twophase`)

Ready refrigeration/AC components that **plug into the two-phase primitives** (same port), so a user can either drop in a packaged `Evaporator` or hand-build one from C/R cells — exactly the `AC`-on-`TPF` relationship. Catalog in §5.

### 2.4 Cross-domain heat-exchanger bridges

The two-phase loop couples to other domains **only through heat exchangers** (shared `Q`, never a direct `connect`), enforced by the existing domain type-check:

- **`Chiller` (twophase ↔ liquid)** — refrigerant evaporates against battery coolant. The EV chiller.
- **`AirCoil` (twophase ↔ moistair)** — refrigerant evaporates/condenses against moist air, with sensible + latent (dehumidification) duty.

### 2.5 Interoperability requirement

The `twophase` foundation and the AC package **must work together**: AC components are *defined on* the two-phase port, so two-phase pipes/volumes/valves and AC components compose in one circuit. A refrigeration loop can mix a packaged `Compressor` + a hand-built C/R `Evaporator` + a packaged `TXV` freely.

---

## 3. Constitutive-correlation library (two-phase)

The physics that turns the lumped calculator into an accurate system model. Each is a scalar backend function wired across the established 3-site pattern (registry → evaluator → unit-checker), selectable by a `model$`/`corr$` argument. Amesim-grounded choices:

| Closure | Correlations to provide | Status |
|---|---|---|
| **Void fraction `α(x, ρ_l, ρ_g, …)`** | homogeneous · **Zivi** · **Rouhani–Axelsson** · slip-ratio `S=f(ρ_l,ρ_g)` | ❌ new — *gates charge inventory* |
| **Two-phase frictional ΔP** | **Lockhart–Martinelli** ✅ (`lm_phi2`, `lm_martinelli_tt`) · **Friedel** · Chisholm · homogeneous | 🟡 LM only |
| **Acceleration ΔP** | momentum-flux change across quality | ❌ new |
| **Boiling heat transfer (Nu)** | **Chen** · Gungor–Winterton | ❌ new |
| **Condensation heat transfer (Nu)** | **Shah** · **Cavallini–Zecchin** · Dobson–Chato · Traviss | ❌ new |
| **Single-phase HT (Nu)** | Dittus–Boelter · **Gnielinski** | 🟡 (have ε-NTU, not Nu) |
| **Evaporator/condenser effectiveness** | ε-NTU ✅ · `Cr→0` evaporating/condensing limit | 🟡 |

**Void-fraction inheritance (board ratified):** the void model is selected **branch-/circuit-wide**, not per-component. Adjacent volumes on different slip models (e.g. evaporator on Rouhani-Axelsson, pipe on Zivi) give different `ρ(P,h)` at the *same* shared state → a density step → phantom charge accumulation in `M=Σρ·V`. So `corr$` for void is **inherited across a connected two-phase branch** by default; a per-component override is allowed only with an explicit flag (and is the user's responsibility for the resulting density discontinuity). Boiling/condensing HT and ΔP correlations may stay per-component (they don't feed the global charge integral).

*Resolved (§10 Q2): defaults are Rouhani-Axelsson (void) / Chen (boil) / Shah (condense) / Lockhart-Martinelli+Friedel (ΔP), with alternates behind `corr$`.*

---

## 4. Headline component physics (the discussion points)

### 4.1 Unified Boiler ≡ Evaporator (two-phase heat addition)

One component models **liquid/two-phase inlet → boiling → superheated-vapor outlet**. The fluid's phase at every point is read from `(P, h)`; the component applies **single-phase convection** in the subcool zone, **boiling** Nu (Chen) in the two-phase zone, and **single-phase convection** in the superheat zone — a **moving-boundary 3-zone** structure (or lumped `Cr→0` at low fidelity). Heat source is either a baked duty `Q`, a `UA·ΔT` to a secondary stream, or a heat port. This replaces today's separate isobaric `Boiler` (just `Q = ṁΔh`) and gives the evaporator its real superheat, glide, and ΔP.

### 4.2 Condenser (two-phase heat rejection)

The mirror: **superheated vapor → condensing → subcooled liquid**, with desuperheat/condense/subcool zones and condensation Nu (Shah/Cavallini). Same structure as 4.1, reversed.

### 4.3 Compressor vs. Pump — kept distinct

- **Compressor** (vapor machine): real-gas isentropic + efficiency; `ṁ = η_v·V_d·N·ρ_suction` (volumetric) — RPM enters here; suction state is superheated vapor (two-phase domain, vapor region). Variants: isentropic-η → volumetric-η → performance map.
- **Pump** (liquid machine): incompressible `Δh = v·ΔP/η`; operates in the `liquid` domain (or the subcooled-liquid region). **Not** interchangeable with the compressor — different constitutive law.

### 4.4 Expansion devices (on the two-phase domain)

- **Two-phase orifice** — the base mathematical relation: `ṁ = Cv·f(ΔP, ρ_in)` / `CdA` form (isenthalpic), valid across flashing flow. Extends the shipped `ExpansionValve`/`Valve`.
- **TXV — quasi-static map + two dynamic states** — a static **2-D characteristic map** (superheat, ΔP) → flow area is the *quasi-static target*, but hysteresis/hunting requires **memory**, so the opening is governed by **two first-order states**: a **valve-opening lag** relaxing toward the map value, plus a **bulb thermal lag** (the bulb senses evaporator-outlet superheat through a time constant). A static map alone cannot produce hysteresis; a full spring-mass-damper is above the frEES band and would force micro-steps for a stiff mechanical mode — two first-order lags capture the dominant hunting dynamics at the right fidelity (board ratified). Supersedes the shipped linear `TXVSuperheat`.
- **EXV (electronic expansion valve)** — a signal-controlled opening (step position → `CdA`), for controller-in-the-loop superheat/pressure control.

### 4.5 Accumulator / receiver (phase separation)

A two-phase volume that **separates liquid and vapor** (quality-split outlets), buffers refrigerant **charge**, and sets the inventory/subcooling relationship (§4.6). The shipped `Accumulator` is a single-phase compliance only.

### 4.6 Refrigerant charge inventory

A two-phase-scoped constraint `M_charge = Σ_i ρ_i(P, h, α)·V_i` over all two-phase volumes (with `α` from §3 void fraction). This **pins one extra DOF** — subcooling / receiver level — so **charge becomes an input** and 1.5 kg vs 0.75 kg produce different subcooling, condensing pressure, capacity, and COP (today they are indistinguishable).

- **Numerics — tear, don't dense-block (board ratified).** In the **transient** formulation charge is **not** an algebraic constraint at all: each `C`-volume carries `der(mass)`, and total charge is a conserved **initial-condition invariant** (`Σ der(mass)=0`) — nearly free. Only the **steady** form needs the global `M=ΣρV` closure, and it is a **single scalar tear variable** (high-side pressure or receiver level). Tearing on that one variable keeps the Jacobian sparse/block-lower-triangular — the existing **Tarjan** blocker handles it as a small outer Newton loop and does **not** collapse the two-phase network into one dense block. Result remains sensitive to the void-fraction correlation (§10 Q3, resolved).

### 4.7 Pressure-drop realism (suction < evaporating pressure)

With non-isobaric two-phase heat exchangers (§4.1/4.2) and explicit suction/discharge **lines** (two-phase `R` elements), the compressor suction pressure correctly falls **below** the evaporating pressure, the suction density drops, and capacity/COP come out realistically (the current model forces them equal — optimistic).

### 4.8 Zero-crossing & event handling — two-tier strategy (board ratified)

Two-phase transients (EV-chiller warm-up, load steps, EXV control) generate constant zero-crossings. The governing principle: **most "events" must not be events.** Separate continuous-but-nonsmooth steepness (regularize, integrate through) from genuine discrete structural change (rootfind, switch).

**Tier 1 — smooth regularization, no integrator halt** (the high-frequency crossings):
- **Saturation-line kinks** (`h` crossing `h_f(P)`/`h_g(P)`): `ρ(P,h)` and `∂ρ/∂h` are C⁰-but-not-C¹. Bake a narrow **C¹ Hermite/`tanh` blend** into the S1 bicubic property tables so the BDF integrates *through* the dome boundary as a steep-but-smooth region. **The smoothing's derivative must be analytic and live in the same path as the table derivatives** — FD-smoothing under an analytic Jacobian defeats the purpose (board note). Avoids thousands of useless per-cell event halts during warm-up.
- **Flow reversal** (`ṁ→0`): replace the hard donor-cell switch with a **smoothed upwind** `h_conv = ½(h_up+h_dn) + ½·tanh(ṁ/ε)·(h_up−h_dn)`, and make the two-phase friction law **odd-symmetric with a laminar core** `ΔP = sign(ṁ)·f(|ṁ|)`, blended to `∝ṁ` below a small Re. The bare `|ṁ|^1.75`-type term has infinite/zero slope at the origin and stalls Newton — this is a common real failure and must be regularized explicitly.

**Tier 2 — true state events (BDF rootfinding) + mode-frozen re-init** (structural changes only):
- **Zone collapse** — the one genuinely structural event. Use **fixed-structure switched moving boundary** (Bonilla / Li–Alleyne / THERMOSYS lineage): keep **N zones always**, enforce a **minimum-length floor**, and ramp a collapsing zone's HT contribution to zero via `tanh(L_zone/ε)` so it becomes **inert**, not singular. One cheap state event per zone detects `L_zone` crossing `ε` and **clamps it at zero** (prevents negative); because the **state-vector size never changes**, the BDF history array stays valid and the post-event consistent-init solve is trivial (board note). This is far more robust than swapping 3-zone↔2-zone state vectors.
  - **No phantom mass (board note):** the ramp must also zero the floored zone's **storage terms** (`der(mass)`/`der(energy)`), not just HT — otherwise a clamped-but-flowing zone fabricates/destroys enthalpy. A floored zone is a **true passthrough** (zero volume, mass/energy in = out), so mass and energy stay conserved across the collapse.
- **Valve open/close** (TXV/EXV/check) — the other true events.
- After any structural switch, restart via a **consistent-initialization solve with the discrete mode frozen** — the *same machinery* as cold-start init, so build it once in S1.

**Linearization tie-in (`LINEARIZE` → `(A,B,C,D)`):** use a **frozen-mode FD Jacobian** — hold the discrete structure (zone counts, flow directions, valve states) fixed during the perturbation sweep, perturb only continuous states. Without it an FD step near a zone boundary flips a mode mid-sweep and corrupts the plant model. This is standard Dymola/Modelica fixed-structure linearization.
- **Prune clamped states (board note):** a floored/inert zone's states are uncontrollable + unobservable; leaving them in produces a violently ill-conditioned `(A,B,C,D)` and an LQR/pole-placement design that chatters when stepped back into the nonlinear sim. **Drop clamped-zone states from the realization** (minimal, well-conditioned per-mode plant), and **warn if the operating point sits within a band of a zone boundary** — that's where any extracted LTI model is least trustworthy.

---

## 5. Component catalog by layer

### 5.1 Two-phase foundation (TPF-equivalent)
| Component | Role | Status |
|---|---|---|
| `TwoPhaseVolume` (C) | capacitive control volume — `P,h` states, mass/energy `der`, charge `ρ·V` | ❌ new |
| `TwoPhaseFlowRes` (R) | resistive flow — two-phase frictional + acceleration ΔP | 🟡 (have `TwoPhasePipe`, isobaric-coupled) |
| `TwoPhasePipe` | combined C-R(-C) pipe | 🟡 (ΔP only, no states/charge) |
| `TwoPhaseSource` / `Sink` | `(P,h)` or `(ṁ,h)` boundary with `x`/`α` | ❌ new (refit `Source`) |
| `TwoPhaseSensor` | quality/superheat/void readout | ❌ new |
| fluid-property layer | `x`, `α`, SH/SC, sat. lines (CoolProp + tables) | 🟡 (CoolProp `x` supported) |

### 5.2 Turbomachinery
| Component | Status |
|---|---|
| `Compressor` (vapor; isentropic→volumetric→map) | 🟡 (isentropic+volumetric on `fluid`; retarget `twophase`) |
| `Pump` (liquid) | 🟡 (on `fluid`; retarget `liquid`) |

### 5.3 Heat exchange (two-phase, unified)
| Component | Status |
|---|---|
| `Evaporator` / `Boiler` (unified, regime-aware, moving-boundary) | 🟡 (separate isobaric `Boiler`; rebuild) |
| `Condenser` (regime-aware, moving-boundary) | 🟡 (isobaric duty; rebuild) |
| `Chiller` (twophase ↔ liquid bridge) | ❌ new (designed, not shipped) |
| `AirCoil` (twophase ↔ moistair bridge) | 🟡 (`CoolingCoil` is moist-air-only, no refrigerant side) |
| n-cell / multi-zone HX | 🟡 (`TwoZoneHX`/`ThreeZoneHX` are ε-NTU cells, not two-phase FV) |

### 5.4 Expansion devices
| Component | Status |
|---|---|
| Two-phase orifice (`Cv`/`CdA`) | 🟡 (`ExpansionValve`/`Valve` isenthalpic; recheck flashing) |
| `TXV` (4-quadrant map + bulb) | 🟡 (`TXVSuperheat` linear only) |
| `EXV` (signal-controlled) | ❌ new |

### 5.5 Storage / phase separation
| Component | Status |
|---|---|
| `Receiver` / `Accumulator` (liquid/vapor split, charge buffer) | 🟡 (`Accumulator` = single-phase compliance) |

### 5.6 Liquid domain (THH-equivalent)
| Component | Status |
|---|---|
| `LiquidSource`/`Sink`, `LiquidPump`, `LiquidPipe`, `LiquidVolume`, coolant props | 🟡 (exist on `fluid`; retag `liquid`) |

---

## 6. Current situation — inventory & gap summary

**What exists and is reusable:** the acausal component framework, the expander + `connect`/shared-name, the **`domain$` connector-type machinery with rider-carrying** (the exact mechanism for `x`/`α`), CoolProp (with quality), Lockhart–Martinelli ΔP, ε-NTU, the `DYNAMIC` ODE engine, storage routing, the digitizer/`TABLE`/`Interpolate2D` (for maps).

**Refrigeration-relevant components today (all on the generic `fluid` domain):** `Compressor`, `Pump`, `Turbine`, `Boiler`, `Condenser`, `Throttle`, `Valve`, `ExpansionValve`, `TXVSuperheat`, `Pipe`, `TwoPhasePipe`, `HeatExchanger`, `TwoZoneHX`, `ThreeZoneHX`, `Accumulator`, `Source`, `Sink`; moist-air side `CoolingCoil`/`HeatingCoil`/`MixingBox`/`Humidifier`/`MoistAirSource`/`Sink`.

**The gaps this plan closes:**
1. No `liquid` vs `twophase` separation → coolant and refrigerant indistinguishable in type.
2. No local `x`/`α` derivation → can't track quality/void (or compute charge) through a circuit. (Resolved by local derivation on the slimmed `(P,ṁ,h)` connector, not riders — §2.2.)
3. Isobaric heat exchangers → no refrigerant ΔP, no glide, suction = evaporating pressure.
4. No void fraction → no charge inventory → 1.5 kg ≡ 0.75 kg.
5. No boiling/condensing HT correlations → effectiveness is a single lump.
6. `Boiler` and `Evaporator` modeled separately → should be one two-phase component.
7. `TXVSuperheat` linear → no 4-quadrant map; no EXV.
8. No C/R volume primitives → no path to few-cell/distributed (Tier A/B).
9. No `Chiller`/`AirCoil` two-phase bridges → EV chiller not modelable accurately.

---

## 7. Implementation plan (phased)

> Each phase ends compilable + tested (unit + end-to-end), full suite green — the established frEES practice.
> **Locked sequence: S1 → L → T0 → T1 → T2 → AC → T3.** S1 is a hard prerequisite (board ratified).

**Phase S1 — Solver core (PREREQUISITE, build first).** **Wrap SUNDIALS IDA via JNI** (reuse the existing CoolProp native bridge — same toolchain), not a hand-rolled BDF. IDA supplies variable-order BDF, `IDARootFind` (Tier-2 events), `IDACalcIC` (consistent init, cold-start + mode-frozen post-event restart), and a **KLU sparse `SUNLinSol`** (so sparsity is in from day one — the old "Phase S2 sparse" mostly evaporates). The frEES-side work is the **interface**: residual `F(t,y,y')` assembly from the expanded scalar system, the Jacobian/sparsity pattern, event functions, and the **bicubic `(P,h)` property tables with analytic derivatives** covering all four regions (subcooled/two-phase/superheated/**supercritical**, §2.2) with the §4.8 Tier-1 smoothing (saturation Hermite/`tanh` blend, smoothed upwind, laminar-core friction) **baked into the analytic derivative path** (FD-smoothing under an analytic Jacobian defeats it) and a **near-critical safe-fallback**. Index stays 1 via the C-R-C rule (§2.2). *Acceptance:* a stiff two-phase toy model integrates through a saturation crossing and a flow reversal without halting; a forced zone-collapse triggers `IDARootFind` + clean `IDACalcIC` re-init with no phantom mass; an index-1 sanity case (closed C-R-C volume) integrates; property-table lookups + derivatives match CoolProp within tolerance (incl. an R744 transcritical sweep) and are orders faster than per-call CoolProp in a Jacobian. *High effort — the strategic core investment; gates all two-phase physics. Benefits every frEES transient.*

**Phase L — Liquid domain (THH-equivalent).** Register `domain$ = liquid`; retag/refit single-phase components (`LiquidPump`/`Pipe`/`Volume`/`Source`/`Sink`, coolant properties, optional cavitation). **Library reorganization (folded in here):** split the monolithic single-`SOURCE`-string `ComponentLibrary.java` into **per-domain frEES source files** (`resources/components/*.frees`: `liquid`, `twophase`, `ac`, plus the existing `fluid`/`pneumatic`/`hydraulic`/`moistair`/`electrical`/`mechanical`/… domains), loaded + concatenated into the **same parse-once, static-immutable `BUILTINS` registry** at startup. *Rationale:* maintainability/transparency as the two-phase/AC catalog grows — **not** memory (the library is ~tens of KB of text + a small AST list, parsed once and shared across all requests; lazy per-component loading saves nothing on a shared server and fights the inter-component reference graph, e.g. `Pump`→`Volume`). Runtime model unchanged: one immutable shared registry, no per-request cost, no dependency-resolution machinery. *Acceptance:* a battery cold-plate coolant loop solves and is type-incompatible with a `twophase` line except through a HX; the split library parses identically (same `BUILTINS` set, full suite green). *Low risk.*

**Phase T0 — Two-phase domain foundation.** Register `domain$ = twophase` on the **slimmed `(P, ṁ, h)`** connector (no riders — §2.2); enforce the **`never C-C, always C-R-C`** expander rule; two-phase `Source`/`Sink`/`Sensor` (deriving `x`/`α`/SH/SC locally); **branch-wide-inherited void-fraction** + **Friedel/acceleration ΔP** correlation functions (§3). *Acceptance:* quality/void compute correctly along a connected two-phase chain; ΔP glides `T_sat`; a `C-C` connection is rejected with a clear error. *Med risk (correlations).* **Gates everything below.**

**Phase T1 — Lumped two-phase components.** Rebuild on the domain: **unified `Evaporator`/`Boiler`** (regime-aware, non-isobaric), **`Condenser`**, retarget **`Compressor`** (vapor) and **`Pump`** (liquid), two-phase **orifice** (Cv, flashing-checked). *Acceptance:* a closed R134a loop reproduces a textbook cycle with refrigerant ΔP and a suction pressure **below** the evaporating pressure; COP drops vs the isobaric baseline. *Med risk.*

**Phase T2 — Charge inventory.** Internal `V` on two-phase volumes; `M_charge = Σ ρ(P,h,α)V` constraint releasing subcooling/receiver level; **`Receiver`** with liquid/vapor split. *Acceptance:* sweeping charge (0.75↔1.5 kg) changes subcooling, condensing pressure, capacity; a receiver buffers the sensitivity. *Med risk (void-fraction sensitivity).*

**Phase T3 — Moving-boundary / few-cell (C/R), Tier A.** `TwoPhaseVolume`(C) + `TwoPhaseFlowRes`(R) primitives; 3–5-zone **fixed-structure switched moving-boundary** `Evaporator`/`Condenser` (N zones always; min-length floor; `tanh(L/ε)` HT ramp; one zone-collapse state event per zone — §4.8 Tier 2); **boiling (Chen) / condensing (Shah, Cavallini)** Nu. Runs on the **S1** BDF + rootfinding + consistent-init (now available). *Acceptance:* distributed temperature glide along the coil; transient warm-up survives zone collapse without NaNs; charge migration. *Med-high risk; small N.*

**Phase AC — Application package + bridges.** **`Chiller`** (twophase↔liquid), **`AirCoil`** (twophase↔moistair, sensible+latent), **`TXV`** (4-quadrant map + bulb), **`EXV`** (signal-controlled), geometry/`global-data` configuration helpers. *Acceptance:* a single-compressor evaporator-chiller cycle chills a coolant loop to a target supply temperature at a given battery load, at 1000 vs 2500 RPM, with realistic pressures and COP. *Med risk; depends T1–T2.*

**Phase S2 — Distributed-scale tuning (Tier B, mostly absorbed into S1).** Since S1 ships IDA with a **KLU sparse** solver, the original "add sparse Newton" scope largely evaporates; S2 is now just **scaling/perf tuning** (sparsity-pattern reuse, Jacobian coloring, ordering) for many-cell (10–20+) two-phase HXs. *Acceptance:* a 10–20-cell two-phase HX integrates robustly and fast. *Optional — only when a distributed model is concretely required; lumped/few-cell (T1–T3) is the target band, §9.*

**Locked order:** **S1 first** (de-risks everything) → L → T0 → T1 → T2 → AC (delivers the accurate EV-chiller result on lumped/charge-aware models) → T3 (few-cell distributed fidelity) → S2 only if many-cell is concretely needed.

---

## 8. Validation strategy

- **Per-correlation** unit tests vs published reference values (LM/Friedel, Zivi/Rouhani void, Chen/Shah Nu).
- **Cycle-level** vs textbook vapor-compression examples (Çengel/ASHRAE): COP, evap/cond pressures, superheat/subcool, with ΔP and charge.
- **Charge sweep:** monotone subcooling/pressure response; receiver buffering.
- **Mode duality:** steady limit recovers the lumped operating point; transient relaxes to it.
- **Cross-check vs Amesim** reference numbers where a comparable case can be built.
- Full backend suite green at every phase boundary; frontend build green.

---

## 9. Scope boundaries

**In scope:** lumped + few-cell moving-boundary two-phase, charge-aware, correlation-based, on the acausal solver (+ `DYNAMIC`/SUNDIALS-IDA). **Out of scope (Tier C / different product):** full many-cell 1-D finite-volume with per-cell momentum/acoustic dynamics (Amesim `libcfd1d` territory), geometry→UA from plate/fin counts, and stop-start event-heavy distributed dynamics at scale. frEES targets the **transparent, design-point-to-light-transient** band; a 20-cell FV HX is no longer hand-readable, which trades away frEES's core differentiator.

**Explicit momentum ceiling (board note, critic 3).** The `(P, ṁ, h)` connector carries **no `der(ṁ)` fluid-inertia state**, so the model is capped at **thermally-dominated transients** — no water-hammer, valve-stroke acoustics, or cryogenic/aerospace feed-line dynamics, where fluid inertia defines the control problem. This is the deliberate ceiling. It is **deferrable, not architecturally precluded**: the C-R formalism can later carry an **inertance term** (`R` element with `L·der(ṁ)`), an additive change to the resistive primitive — not a re-architecture. Out of scope now.

---

## 10. Open questions — RESOLVED (advisory board)

1. **Migration → HARD MIGRATE, no permissive alias.** `fluid` splits into `liquid` + `twophase`; a permissive alias would let a refrigerant line connect to a coolant line silently and defeat the type split (consistent with the project's strict-over-warn stance). Soften *ergonomics* not the *type rule*: precise parser error (`Component 'Pipe' expects domain 'liquid', got 'twophase'`) + a one-shot migration codemod.
2. **Correlations → ship defaults, expose a `corr$` selector.** Void: **Rouhani–Axelsson** default (orientation-aware) with Zivi/homogeneous alternates; boiling: **Chen** (Gungor–Winterton alternate); condensing: **Shah** (Cavallini–Zecchin alternate); ΔP: keep **Lockhart–Martinelli**, add Friedel. Closures stay decoupled interfaces (3-site fn pattern) so custom correlations can be injected later (e.g. cryogenic/aerospace fluids).
3. **Charge model → lumped-volume + void-fraction inventory is sufficient for design/sizing; T3 (few-cell) is the minimum for dynamic EXV-control tuning.** Tear on a single scalar (high-side pressure / receiver level); in transient it's an IC invariant, not a constraint (§4.6).
4. **TXV → quasi-static 2-D map + two first-order states** (valve-opening lag + bulb thermal lag); a static map cannot produce hysteresis, a full spring-mass-damper is above-band (§4.4). Data form: **digitized map** (reuse `Interpolate2D`/`TABLE`).
5. **Solver investment → YES, now, and FIRST — via SUNDIALS IDA (JNI), not a hand-rolled BDF.** Round-2 (critics 3 & 4): wrap IDA over the existing CoolProp native bridge — variable-order BDF, `IDARootFind`, `IDACalcIC`, KLU sparse — as **Phase S1**, the prerequisite (§7-S1). frEES owns the interface (residual/Jacobian/event/property-table layer) and index control (`C-R-C`, §2.2). Sparse comes in S1 with KLU; S2 shrinks to perf-tuning.
6. **Naming/positioning → `liquid` + `twophase` public domain names** (mirroring THH/TPF); **AC is a separate namespace** built on the `twophase` standard library (keeps base primitives uncluttered).

---

*Appendix — Amesim mapping (board-confirmed reference):* frEES `liquid` ↔ `libthh`; frEES `twophase` ↔ `libtpf` (Amesim's `hflow` port carries P, h, T, x, α, SH/SC — **frEES deliberately slims its connector to `(P, ṁ, h)` and derives x/α/SH/SC locally**, §2.2; C/R primitives kept); frEES AC package ↔ `libac` (compressor/evap/cond/TXV/receiver + `TPF-THH` chiller + `TPF-GMMA` air coil).
