# frees — Heat-Exchanger Correlation Coverage (advisory for NotebookLM)

A correlation inventory of the frees solver from three perspectives — **heat
transfer**, **geometry**, and **pressure drop** — stating what is implemented and
what is not, cross-referenced to the Amesim reverse-engineering notes
(`amesim_heat_exchanger_algorithms.md`, `amesim_hx_sizing_UA_methods.md`,
`libAMESOL_extracted_shared_correlations.md`). Use this to decide which
correlations to add next.

The unifying frees pattern: **UA (heat) and dP (friction) are computed OUTSIDE a
component** by scalar correlation functions and **injected** into the component's
`UA` / `dP` parameters (the component no longer owns the correlation). The
geometry `(D_h, A_flow, A_conv)` is supplied to those functions.

---

## 1. Heat transfer

### Implemented
| correlation | function | regime / use |
|---|---|---|
| Dittus–Boelter | `nu_dittus_boelter(Re,Pr,n)` | internal turbulent single-phase |
| Gnielinski | `nu_gnielinski(Re,Pr)` | internal turbulent single-phase (transitional-accurate) |
| Laminar (Nu=3.66) ↔ Gnielinski smooth blend | `htc_1phase(fluid$,P,T,ṁ,Dh,Aflow)` | single-phase film **h** from state+flow+geometry (coolant, refrigerant-liquid, air-as-internal) |
| Chen (boiling) F & S factors | `chen_f(X_tt)`, `chen_s(Re_l,F)` | flow-boiling superposition pieces |
| Shah flow-boiling | `nu_shah(...)`, `htc_evap(fluid$,P,x,ṁ,Dh,Aflow)` | evaporator / chiller refrigerant side |
| Shah-1979 condensation | `htc_cond(...)` | condenser refrigerant side |
| Cavallini–Zecchin condensation | `nu_cavallini_zecchin(...)` | condenser refrigerant side (alt) |
| ε-NTU effectiveness, NTU, LMTD | `hx_effectiveness(type$,NTU,Cr)`, `hx_ntu`, `lmtd` | lumped HX (counterflow/crossflow/…) |
| Fin efficiency | `fin_efficiency(mL)` | finned-surface weighting |
| Overall conductance (series films + wall) | `ua_hx(h1,A1,h2,A2,Rwall)` | combine two sides → UA |

### NOT implemented (gaps)
- **External / cross-flow convection** — *the most important gap.* The **air side**
  of radiators/condensers/evaporators is external flow over finned tube banks, not
  internal pipe flow. Missing: **Hilpert**, **Žukauskas** (tube banks), **Churchill–
  Bernstein**. Today `htc_1phase('Air', …)` treats air as internal pipe flow — an
  approximation. (Amesim notes §4–5: Hilpert/Churchill-Chu used for the gas side.)
- **Colburn j-factor** compact-surface correlation `Nu = j·Re·Pr^(1/3)` (Amesim's
  primary compact-HX air-side path, `calc_heat_exchanges_thh_Colburn_j_factor`).
- **Natural-convection blend** — Amesim uses `Nu = (Nu_free³ + Nu_forced³)^(1/3)`
  with **Churchill–Chu** free convection. frees does forced-only.
- **Other two-phase correlations** named in the AC menus: **Arima** (plate-HX
  boiling), **VDI** (horizontal/vertical tubes), **Traviss**, **Cavallini**
  (boiling). frees has Chen + Shah (boiling) and Shah + Cavallini-Zecchin
  (condensation) only.
- **Plate-HX (BPHE) specific** Nu correlations (chevron-angle dependent).

---

## 2. Geometry

### Implemented
- `fin_efficiency(mL)` (single-fin efficiency).
- The correlation functions accept **already-resolved** `D_h`, `A_flow`, and
  convective areas as numeric arguments — so a user who knows the geometry can
  drive UA/dP correctly.
- A few components carry their own geometry (`MovingBoundaryEvaporator/Condenser`
  use `U·π·D·L`; pipes use `L`, `D`, `rough`).

### NOT implemented (gaps)
- **The geometry-resolution layer** — the Amesim `HexGeometryModel` (§1 of
  `amesim_hx_sizing_UA_methods.md`) that turns a datasheet/CAD into
  `(A_flow, A_total, A_conv,int, A_conv,ext, D_h, σ, η_surf)`:
  - macro box: `σ = A_flow·passCount/(depth·H)`, `A = 4·A_flow·L/D_h`;
  - fin-and-tube: developed fin length, `A_direct + η_fin·A_indirect`,
    `D_h = 4·W·A_flow·passCount/A_total`, `η_surf = A_eff/A_total`.
  There are **no functions** to compute these from primary dimensions (fin
  density/thickness/pitch, tube count, plate spacing). The user must supply
  `D_h`/`A_flow`/`A` directly.
- **Overall fin-surface efficiency** `η_surf = 1 − (A_fin/A_total)(1−η_fin)`
  (only the single-fin `fin_efficiency` exists).
- **Free-flow / frontal-area ratio σ** and the mass-flux `G = ṁ/A_flow` helpers
  used by the NTU/compact methods.

**Recommendation:** add a small geometry-resolution function set
(`hx_geom_*` → `D_h`, `A_conv`, `sigma`, `eta_surf`) so a UA "object" can be built
from datasheet geometry, not pre-computed areas.

---

## 3. Pressure drop

### Implemented
| correlation | function | use |
|---|---|---|
| Colebrook–White (Darcy f) | `friction_factor(Re, rel_rough)` | single-phase pipe friction |
| Single-phase Darcy ΔP | `dp_1phase(fluid$,P,T,ṁ,Dh,Aflow,L)` | coolant / air / liquid line |
| Lockhart–Martinelli / Chisholm φ² | `lm_phi2(X,C)`, `lm_martinelli_tt(...)` | two-phase multiplier on liquid-alone drop |
| Two-phase frictional ΔP | `dp_2phase(fluid$,P,x,ṁ,Dh,Aflow,L)` | refrigerant two-phase (Darcy × Chisholm) |
| Friedel φ² | `friedel_phi2(...)` | two-phase multiplier (alt) |
| Momentum / acceleration flux | `momentum_flux(x,ρl,ρg,α,G)` | two-phase acceleration pressure term |
| Minor (fitting) loss | `minor_loss(K,ρ,V)` | K-factor singular losses |
| Void fraction | `void_homogeneous`, `void_zivi`, `void_rouhani` | for momentum/charge terms |

### NOT implemented (gaps)
- **Müller–Steinhagen–Heck** two-phase ΔP (named in the Amesim AC menus alongside
  Friedel). frees has Friedel + Chisholm only.
- **Compact-core entrance/exit losses** — contraction/expansion `K_c`, `K_e` and
  the core acceleration term for compact HXs (`ΔP = (G²/2ρ_in)[(K_c+1−σ²) + …]`).
  `dp_1phase` is straight Darcy friction only; no `σ`-based core ΔP.
- **`dp_2phase` integrates a single mid-quality point**, not a quality-averaged or
  cell-by-cell integral along the HX (Amesim discretizes; frees lumps).
- **Gravitational (static head) two-phase term** for vertical risers.
- **Fin-and-tube / louvered-fin air-side ΔP** correlations (the air-side friction
  analogue of the Colburn-j heat side).

---

## 4. Summary — priority gaps (heat / geometry / dP)

1. **Air-side external convection** (Hilpert / Žukauskas / Colburn-j) + the
   **free+forced cubic blend** — needed for *any* air-coupled HX (radiator,
   condenser, cabin evaporator) to be physically right rather than
   internal-pipe-flow approximated. **(highest impact)**
2. **Geometry-resolution layer** (`D_h`, `A_conv`, `σ`, `η_surf` from fin-and-tube
   / macro-box dimensions) so UA/dP objects are built from datasheet geometry.
3. **Müller–Steinhagen ΔP** and **compact-core entrance/exit (Kc/Ke) losses**.
4. Additional two-phase HT correlations (Arima/VDI/Traviss/Cavallini-boiling) for
   correlation-menu parity with Amesim AC submodels.

All present correlations are Amesim-grounded (Nu+Geom engine, ε-NTU, Chen/Shah/
Cavallini, Friedel/Lockhart-Martinelli). The main missing pillars are the
**air-side (external) heat transfer** and the **geometry→area resolver**.
