# frEES — Two-Phase & Refrigeration Modeling: Domain Re-Architecture

## Engineering Plan & Advisory-Board Discussion Document

**Prepared for:** Advisory Board (Thermal-fluids, Refrigeration/HVAC, Two-phase flow, Numerics, Automotive/EV thermal)
**Scope:** Re-architecting frEES's thermofluid component layer into **two distinct working-fluid domains** — a single-phase **liquid** domain and a phase-change **two-phase** domain — and building an **air-conditioning / refrigeration application layer on top of the two-phase domain**, mirroring the proven Amesim `THH` / `TPF` / `AC` library split.
**Purpose:** This is a *discussion document*. The goal is **accurate refrigeration-system results** — today's 0-D cycle calculator is structurally optimistic (no refrigerant-side ΔP across heat exchangers, suction pressure forced equal to the evaporating pressure, no refrigerant charge, no distributed temperature glide). We want the board to pressure-test the architecture, the correlation choices, and the scope line before implementation.

> **Note on prior work.** frEES already ships a complete acausal multi-domain component layer (~90 components: fluid/cycle, pneumatic, hydraulic, electrical/battery, fuel cell, mechanical/powertrain, humid-air HVAC, gas-mixture) with **strict connector-domain separation** (`domain$` typing: `fluid`/`gas`/`oil`/`moistair`). That shipped record lives in `README.md`, `CLAUDE.md`, and git history. This document replaces the prior forward plan and focuses **only** on the two-phase / refrigeration re-architecture.

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
- **Proposed:** split the thermal working-fluid handling into a **`liquid`** domain and a **`twophase`** domain; give the two-phase domain a richer rider set (`x`, `α`, SH/SC) and a constitutive-correlation library (void fraction, two-phase ΔP, boiling/condensing HT); add **C/R volume + flow primitives**; scope a **refrigerant-charge inventory** constraint to two-phase volumes; and build the **AC application package** (unified evaporator/boiler, condenser, compressor, pump, Cv orifice, 4-quadrant TXV, EXV, receiver, chiller, air coil) on top — interoperable with the two-phase primitives and coupling to liquid/air loops via HX bridges.
- **Headline modeling decisions for the board (detailed in §4):**
  1. **A boiler *is* an evaporator** — one two-phase heat-addition component: liquid/two-phase inlet → boils → superheated-vapor outlet, with regime-aware heat transfer. The condenser is its heat-rejection mirror.
  2. **Pumps and compressors stay distinct** — a pump does incompressible liquid work (`v·ΔP`); a compressor does real-vapor compression (`Δh_s/η`). Different machines, different domains/regions.
  3. **The two-phase orifice is a `Cv`/`CdA` mathematical relation**; on top of it we build a **4-quadrant-map TXV** and a **controlled EXV**.
- **Numerics:** lumped and few-cell moving-boundary forms run on the existing `DYNAMIC` engine; a fully distributed (many-cell C/R) capability is gated on a stiff variable-order DAE integrator + fast property tables + sparse linear algebra (the "Tier B" solver investment, §7 Phase S).

---

## 2. The domain architecture

### 2.1 The `liquid` domain (single-phase — THH-equivalent)

A single-phase liquid working fluid for **coolant / water / glycol / oil / fuel** circuits (battery cold-plate loops, low-temperature radiator loops, lubrication). Connector type `domain$ = liquid`.

- **Port / riders:** `(P, ṁ, h)` — same bond as today; temperature is a derived property; no quality/void.
- **Closures:** single-phase Darcy/Colebrook ΔP (have), temperature-dependent ρ/μ/cp, optional bulk-modulus compliance and **cavitation** (pressure-driven effective-density correction — the THH behaviour, *not* boiling).
- **Migration:** existing single-phase thermofluid uses of the generic `fluid` domain (coolant loops, water transport) move here. *Open question for the board: do we keep `fluid` as a permissive alias for backward compatibility, or hard-migrate? (§10 Q1).*

### 2.2 The `twophase` domain (phase-change — TPF-equivalent)

A phase-change-capable working fluid (**refrigerants R134a/R1234yf/R744/R290, steam**) that may be **subcooled liquid, two-phase mixture, or superheated/dry gas** — the state is determined from `(P, h)` via CoolProp, never assumed by the component. Connector type `domain$ = twophase`.

- **Port / riders:** `(P, ṁ, h)` **+ vapor quality `x` + void fraction `α` + superheat/subcooling** carried as flow-coupled riders. Mechanism reuses the shipped moist-air rider machinery (`ComponentExpander.acrossMembersForNode` already adds a rider — `w` — across a tagged node; we add `x`/`α` for `twophase`).
- **Saturation coupling:** inside the dome, `T = T_sat(P)`; ΔP along an element therefore *glides* the temperature — the effect the current isobaric model misses.
- **Constitutive library:** §3.
- **C/R primitives:** a **capacitive control volume** (`C` — holds `P, h` states, `der(mass)`/`der(energy)`, contributes `ρ(P,h,α)·V` to the charge) and a **resistive flow element** (`R` — two-phase frictional + acceleration ΔP). Alternating C/R builds lumped → few-cell → distributed models.

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

*Board question (§10 Q2): which default correlation per closure, and how many alternates are worth shipping vs. deferring?*

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
- **TXV — 4-quadrant map** — a thermostatic expansion valve whose opening is a **2-D characteristic map** of (superheat, pressure-drop) → flow area, covering the full operating envelope (the "4-quadrant" behaviour: bidirectional ΔP / opening-closing hysteresis envelope), with the bulb sensing evaporator-outlet superheat. Supersedes the shipped linear `TXVSuperheat`.
- **EXV (electronic expansion valve)** — a signal-controlled opening (step position → `CdA`), for controller-in-the-loop superheat/pressure control.

### 4.5 Accumulator / receiver (phase separation)

A two-phase volume that **separates liquid and vapor** (quality-split outlets), buffers refrigerant **charge**, and sets the inventory/subcooling relationship (§4.6). The shipped `Accumulator` is a single-phase compliance only.

### 4.6 Refrigerant charge inventory

A two-phase-scoped constraint `M_charge = Σ_i ρ_i(P, h, α)·V_i` over all two-phase volumes (with `α` from §3 void fraction). This **pins one extra DOF** — subcooling / receiver level — so **charge becomes an input** and 1.5 kg vs 0.75 kg produce different subcooling, condensing pressure, capacity, and COP (today they are indistinguishable). Result is sensitive to the void-fraction correlation (board question §10 Q3).

### 4.7 Pressure-drop realism (suction < evaporating pressure)

With non-isobaric two-phase heat exchangers (§4.1/4.2) and explicit suction/discharge **lines** (two-phase `R` elements), the compressor suction pressure correctly falls **below** the evaporating pressure, the suction density drops, and capacity/COP come out realistically (the current model forces them equal — optimistic).

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
2. No `x`/`α` riders → can't track quality/void through a circuit.
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

**Phase L — Liquid domain (THH-equivalent).** Register `domain$ = liquid`; retag/refit single-phase components (`LiquidPump`/`Pipe`/`Volume`/`Source`/`Sink`, coolant properties, optional cavitation). *Acceptance:* a battery cold-plate coolant loop solves and is type-incompatible with a `twophase` line except through a HX. *Low risk.*

**Phase T0 — Two-phase domain foundation.** Register `domain$ = twophase`; carry `x`/`α`/SH-SC riders (reuse moist-air machinery); two-phase `Source`/`Sink`/`Sensor`; **void-fraction** + **Friedel/acceleration ΔP** correlation functions (§3). *Acceptance:* quality/void propagate through a connected two-phase chain; ΔP glides `T_sat`. *Med risk (correlations).* **Gates everything below.**

**Phase T1 — Lumped two-phase components.** Rebuild on the domain: **unified `Evaporator`/`Boiler`** (regime-aware, non-isobaric), **`Condenser`**, retarget **`Compressor`** (vapor) and **`Pump`** (liquid), two-phase **orifice** (Cv, flashing-checked). *Acceptance:* a closed R134a loop reproduces a textbook cycle with refrigerant ΔP and a suction pressure **below** the evaporating pressure; COP drops vs the isobaric baseline. *Med risk.*

**Phase T2 — Charge inventory.** Internal `V` on two-phase volumes; `M_charge = Σ ρ(P,h,α)V` constraint releasing subcooling/receiver level; **`Receiver`** with liquid/vapor split. *Acceptance:* sweeping charge (0.75↔1.5 kg) changes subcooling, condensing pressure, capacity; a receiver buffers the sensitivity. *Med risk (void-fraction sensitivity).*

**Phase T3 — Moving-boundary / few-cell (C/R), Tier A.** `TwoPhaseVolume`(C) + `TwoPhaseFlowRes`(R) primitives; 3–5-zone moving-boundary `Evaporator`/`Condenser`; **boiling (Chen) / condensing (Shah, Cavallini)** Nu. *Acceptance:* distributed temperature glide along the coil; transient warm-up; charge migration. *Med-high risk; small N on existing `DYNAMIC`.*

**Phase AC — Application package + bridges.** **`Chiller`** (twophase↔liquid), **`AirCoil`** (twophase↔moistair, sensible+latent), **`TXV`** (4-quadrant map + bulb), **`EXV`** (signal-controlled), geometry/`global-data` configuration helpers. *Acceptance:* a single-compressor evaporator-chiller cycle chills a coolant loop to a target supply temperature at a given battery load, at 1000 vs 2500 RPM, with realistic pressures and COP. *Med risk; depends T1–T2.*

**Phase S — Solver enablers (Tier B), the distributed-fidelity gate.** Stiff variable-order **BDF** DAE integrator (WRMS norm, consistent init); **fast property tables** (bicubic on `(P,h)` from CoolProp, analytic derivatives); **sparse/banded** Newton. Plus zero-crossing **events** (phase/regime/flow-reversal). *Acceptance:* a 10–20-cell two-phase HX integrates robustly and fast; benefits every frEES transient. *High effort — the one strategic core investment; gates many-cell distributed models.*

**Suggested order:** L → T0 → T1 → T2 → AC (delivers the accurate EV-chiller result on lumped/charge-aware models) → T3/S (distributed fidelity, when justified).

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

**In scope:** lumped + few-cell moving-boundary two-phase, charge-aware, correlation-based, on the acausal solver (+ `DYNAMIC`/stiff BDF). **Out of scope (Tier C / different product):** full many-cell 1-D finite-volume with per-cell momentum/acoustic dynamics (Amesim `libcfd1d` territory), geometry→UA from plate/fin counts, and stop-start event-heavy distributed dynamics at scale. frEES targets the **transparent, design-point-to-light-transient** band; a 20-cell FV HX is no longer hand-readable, which trades away frEES's core differentiator.

---

## 10. Open questions for the advisory board

1. **Migration:** hard-migrate the generic `fluid` domain into `liquid` + `twophase`, or keep `fluid` as a permissive alias? (back-compat vs strictness)
2. **Correlations:** the default per closure (void: Rouhani vs Zivi? boiling: Chen? condensing: Shah vs Cavallini?), and how many alternates to ship.
3. **Charge model:** is a lumped-volume + void-fraction inventory accurate enough for design decisions, given the void-fraction sensitivity — or is few-cell (T3) the minimum credible charge model?
4. **TXV "4-quadrant":** confirm the intended characteristic (superheat × ΔP → area, with hysteresis envelope) and the data form (digitized map vs analytic).
5. **Solver investment:** is the stiff-BDF + property-table + sparse work (Phase S) justified now, or do we cap at Tier A (few-cell, small N) until a distributed need is concrete?
6. **Naming/positioning:** `liquid` + `twophase` as the public domain names (mirroring THH/TPF), and is the AC package a separate namespace or part of the standard library?

---

*Appendix — Amesim mapping:* frEES `liquid` ↔ `libthh`; frEES `twophase` ↔ `libtpf` (`hflow` port: P, h, T, x, α, SH/SC; C/R primitives); frEES AC package ↔ `libac` (compressor/evap/cond/TXV/receiver + `TPF-THH` chiller + `TPF-GMMA` air coil). The board is asked to confirm this mapping is the right reference.
