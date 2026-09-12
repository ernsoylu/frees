---
name: hx_eta_surf
category: Heat Transfer
summary: Overall surface (fin) efficiency of an extended-surface heat-exchanger side.
related: [fin_efficiency, ua_hx, htc_extair]
examples: [ev-thermal-management]
tags: [heat exchanger, fin, overall surface efficiency, extended surface, compact]
---

# hx_eta_surf

Returns the **overall surface efficiency** `η_o` of a finned heat-exchanger side —
the area-weighted blend of the fully-effective primary (bare) area and the
less-effective fin area. Multiply the film coefficient by `η_o` (or use
`η_o·h·A`) when forming `UA` for an extended surface.

## Syntax

```
eta_o = hx_eta_surf(Afin, Atotal, eta_fin)
```

## Description

On a finned surface, the primary tube wall sits at the base temperature
(efficiency 1) while the fins droop toward the fluid temperature (efficiency
`eta_fin` < 1, from `fin_efficiency`). The overall efficiency
weights the two by their area shares.

## Mathematical Formulation

$$ \eta_o = 1 - \frac{A_{\text{fin}}}{A_{\text{total}}}\big(1 - \eta_{\text{fin}}\big) $$

> **Method:** direct evaluation; `η_o = 1` for an unfinned surface
> (`A_fin = 0`), and `η_o → η_fin` as the fins dominate the area.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ HxCorrelations: the fluid-free correlations and geometry identities. }
zu_a = nu_zukauskas(20000, 0.71)
zu_b = nu_zukauskas(0.2, 5.0)
zu_c = nu_zukauskas(1, 1)

cb_a = nu_colburn(0.008, 1200, 0.71)
cb_b = nu_colburn(0.02, 500, 7.0)

cc_a = nu_churchill_chu(1e8, 0.71)
cc_b = nu_churchill_chu(1e4, 7.0)
cc_c = nu_churchill_chu(0, 0.71)
cc_d = nu_churchill_chu(-5, 0.71)

bl_a = nu_blend(12.0, 30.0)
bl_b = nu_blend(0, 5)

dh_a = hx_dh(0.02, 4.0, 1.5)
ac_a = hx_aconv(0.02, 1.5, 0.003)
sg_a = hx_sigma(0.02, 0.08)
es_a = hx_eta_surf(3.0, 4.0, 0.85)

dcc_a = dp_compact_core(12.0, 1.18, 1.05, 1.11, 0.45, 0.02, 60.0, 0.35, 0.25)
dcc_b = dp_compact_core(30.0, 1.2, 1.2, 1.2, 1.0, 0.005, 100.0, 0.0, 0.0)

tb_a = nu_tubebank('inline', 50, 0.71)
tb_b = nu_tubebank('staggered', 50, 0.71)
tb_c = nu_tubebank('inline', 500, 0.71)
tb_d = nu_tubebank('staggered', 500, 0.71)
tb_e = nu_tubebank('inline', 20000, 0.71)
tb_f = nu_tubebank('staggered', 20000, 0.71)
tb_g = nu_tubebank('inline', 300000, 0.71)
tb_h = nu_tubebank('staggered', 300000, 0.71)
tb_i = nu_tubebank('Stag', 500000, 0.71)
tb_j = nu_tubebank('anything', 0.01, 0.71)

hp_a = nu_hilpert(0.1, 0.71)
hp_b = nu_hilpert(2, 0.71)
hp_c = nu_hilpert(20, 0.71)
hp_d = nu_hilpert(2000, 0.71)
hp_e = nu_hilpert(20000, 0.71)
hp_f = nu_hilpert(200000, 0.71)

pl_a = nu_plate(2000, 4.0, 30)
pl_b = nu_plate(2000, 4.0, 45)
pl_c = nu_plate(2000, 4.0, 60)
pl_d = nu_plate(2000, 4.0, 10)
pl_e = nu_plate(2000, 4.0, 90)
pl_f = nu_plate(0.5, 4.0, 45)

fl_a = hx_fin_len(0.025, 0.0001, 500, 0.002)
ad_a = hx_area_direct(0.5, 30, 0.002, 0.025, 0.0001)
ai_a = hx_area_indirect(0.5, 30, 0.1234)

dg_a = dp_gravity(1000, 20, 0.8, 3.0, 90)
dg_b = dp_gravity(1000, 20, 0.8, 3.0, 30)
dg_c = dp_gravity(1000, 20, 0.0, 3.0, -45)

mf_a = mass_flux(0.05, 0.002)

jf_a = j_fin('plain', 1000)
jf_b = j_fin('wavy', 1000)
jf_c = j_fin('louvered', 1000)
jf_d = j_fin('offset', 1000)
jf_e = j_fin('OFFSET', 1000)
jf_f = j_fin('unknown', 1000)
jf_g = j_fin('plain', 0.5)

ff_a = f_fin('plain', 1000)
ff_b = f_fin('wavy', 1000)
ff_c = f_fin('louvered', 1000)
ff_d = f_fin('offset', 1000)
ff_e = f_fin('Wavy', 1000)
ff_f = f_fin('unknown', 1000)
ff_g = f_fin('plain', 0.5)

gw_a = nu_gungor_winterton(120, 0.5, 0)
gw_b = nu_gungor_winterton(120, 0.5, 1e-4)
gw_c = nu_gungor_winterton(120, 1e-9, 0)
gw_d = nu_gungor_winterton(120, 0.5, -1)

tv_a = nu_traviss(20000, 3.0, 0.5)
tv_b = nu_traviss(0.5, 3.0, 0.5)
tv_c = nu_traviss(20000, 3.0, 1e-9)

{ CHECK ac_a 40 0.000039999999999999996 }
{ CHECK ad_a 0.798 7.98e-7 }
{ CHECK ai_a 3.702 0.000003702 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ac_a = 40 [m^2]
ad_a = 0.798 [m^2]
ai_a = 3.702 [m^2]
```

<!-- verified-reference-example:end -->

### Example 1 — Air-side overall efficiency of a finned core

The EV thermal-management sizing forms `η_o` from the fin area share and
`fin_efficiency(mL)` before computing `UA = η_o·h·A`.

[Run: ev-thermal-management]

**Expected:** `η_o` between the bare value (1) and the fin efficiency — typically
0.7–0.95 for an automotive finned core.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Afin` | Number | Yes | Fin (secondary) surface area [m²]. |
| `Atotal` | Number | Yes | Total surface area (primary + fin) [m²]. |
| `eta_fin` | Number | Yes | Single-fin efficiency (from `fin_efficiency`). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `eta_o` | Number | Overall surface efficiency η_o ∈ (0, 1]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `DOMAIN_ERROR` | `Afin > Atotal` | The fin area cannot exceed the total area. |
