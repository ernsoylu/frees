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

> **Update (this revision):** the three top-priority gaps below have now been
> implemented — air-side external convection (`htc_extair`, `nu_zukauskas`,
> `nu_colburn`, `nu_churchill_chu`, `nu_blend`), the geometry resolver (`hx_dh`,
> `hx_aconv`, `hx_sigma`, `hx_eta_surf`), and Müller–Steinhagen + compact-core
> dP (`dp_mueller_steinhagen`, `dp_compact_core`). The coupled EV-TMS example is
> now geometry-driven (`EvTmsCorrelatedTest`). Remaining gaps are narrowed below.

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

### Implemented (this revision) — air-side / external
- **Žukauskas tube-bank cross-flow** `nu_zukauskas(Re,Pr)`, and the air-side film
  `htc_extair(fluid$,P,T,ṁ,D,Aflow)` — the radiator/condenser/evaporator AIR side
  is now external-flow, not internal-pipe approximated.
- **Colburn j-factor** `nu_colburn(j,Re,Pr)`; **Churchill–Chu** free convection
  `nu_churchill_chu(Ra,Pr)`; **free+forced cubic blend** `nu_blend(Nu1,Nu2)`.

### Still NOT implemented
- **Hilpert (single-cylinder)** and **bank-arrangement-specific** Žukauskas C,m
  tables (current `nu_zukauskas` uses one representative C,m); **Colburn-j data
  tables** (j is supplied, not looked up from a fin-surface database).
- **Other two-phase correlations** in the AC menus: **Arima** (plate boiling),
  **VDI**, **Traviss**, **Cavallini** (boiling). frees has Chen + Shah (boiling),
  Shah + Cavallini-Zecchin (condensation).
- **Plate-HX (BPHE) chevron-angle** Nu correlations.

---

## 2. Geometry

### Implemented
- `fin_efficiency(mL)` (single-fin efficiency).
- The correlation functions accept **already-resolved** `D_h`, `A_flow`, and
  convective areas as numeric arguments — so a user who knows the geometry can
  drive UA/dP correctly.
- A few components carry their own geometry (`MovingBoundaryEvaporator/Condenser`
  use `U·π·D·L`; pipes use `L`, `D`, `rough`).

### Implemented (this revision)
- `hx_dh(Aflow,Atotal,L)` = 4·A_flow·L/A_total — compact hydraulic diameter.
- `hx_aconv(Aflow,L,Dh)` = 4·A_flow·L/D_h — convective area identity.
- `hx_sigma(Aflow,Afrontal)` — free-flow (contraction) ratio σ.
- `hx_eta_surf(Afin,Atotal,eta_fin)` = 1 − (A_fin/A_total)(1−η_fin) — overall
  fin-surface efficiency (composes with the existing single-fin `fin_efficiency`).

### Still NOT implemented
- The **full fin-and-tube developed-fin-length** resolver (compute A_direct,
  A_indirect, fin block from fin density/thickness/pitch + tube geometry) — the
  user still supplies `A_fin`/`A_total` or `A_flow` for the macro path.
- A **mass-flux `G = ṁ/A_flow`** convenience helper (trivial to write inline).

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

### Implemented (this revision)
- **Müller–Steinhagen–Heck** two-phase ΔP: `dp_mueller_steinhagen(fluid$,P,x,ṁ,Dh,Aflow,L)`.
- **Compact-core entrance/exit + acceleration** ΔP: `dp_compact_core(G,ρin,ρout,σ,Kc,Ke)`
  (Kays–London).

### Still NOT implemented
- **`dp_2phase` / `dp_mueller_steinhagen` integrate a single mid-quality point**,
  not a quality-averaged or cell-by-cell integral along the HX (Amesim discretizes;
  frees lumps).
- **Gravitational (static head) two-phase term** for vertical risers.
- **Louvered-fin air-side ΔP** correlations (the friction analogue of the
  Colburn-j heat side).

---

## 4. Summary — status

**Done (this revision):** air-side external convection (Žukauskas/Colburn-j/
Churchill-Chu + free+forced blend), the geometry resolver (D_h/A_conv/σ/η_surf),
and Müller–Steinhagen + compact-core dP. The coupled EV-TMS example is now
geometry-driven (UA + dP from correlations, injected — `EvTmsCorrelatedTest`).

**Remaining (lower priority):**
1. Bank-arrangement-specific Žukauskas C,m tables + Colburn-j fin-surface data
   tables (currently one representative correlation / supplied j).
2. Full fin-and-tube developed-fin-length geometry resolver (compute A_fin/A_total
   from fin density/thickness/pitch + tube geometry).
3. More two-phase HT correlations (Arima / VDI / Traviss / Cavallini-boiling) and
   plate-HX chevron Nu, for AC correlation-menu parity.
4. Quality-integrated (cell-by-cell) ΔP, gravitational two-phase term, louvered-
   fin air-side ΔP.

All present correlations are Amesim-grounded (Nu+Geom engine, ε-NTU, Chen/Shah/
Cavallini, Žukauskas/Colburn, Friedel/Lockhart-Martinelli/Müller-Steinhagen,
Kays–London compact core).
