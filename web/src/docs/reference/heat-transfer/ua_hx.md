---
name: ua_hx
category: Heat Transfer
summary: Overall heat-exchanger conductance UA from two side films and the wall.
related: [htc_1phase, htc_evap, htc_cond, hx_effectiveness]
examples: [ev-thermal-management]
tags: [heat exchanger, ua, overall conductance, thermal resistance, series]
---

# ua_hx

Returns the **overall thermal conductance** `UA` [W/K] of a two-stream heat
exchanger by combining the two convective side films and the wall as series
thermal resistances. Feed the result to `hx_effectiveness` /
`hx_NTU` to rate or size the exchanger.

## Syntax

```
UA = ua_hx(h1, A1, h2, A2, Rwall)
```

## Description

Each stream presents a film resistance `1/(h·A)`; the wall adds a conductive
resistance `Rwall`. In series these sum to the inverse conductance.

## Mathematical Formulation

$$ \frac{1}{UA} = \frac{1}{h_1 A_1} + R_{\text{wall}} + \frac{1}{h_2 A_2} $$

For finned (extended) surfaces each film term carries its overall surface
efficiency, `1/(η·h·A)` — supply the efficiency-weighted area or
an `h·η` product.

> **Method:** direct series-resistance sum; the smaller `h·A` dominates `UA`.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
h_cool = htc_1phase('EG50', 200000, 300, 0.2, 0.008, 1.2e-4)
h_evap = htc_evap('R1234yf', 350000, 0.5, 0.03, 0.006, 8e-5)
UA = ua_hx(h_evap, 0.6, h_cool, 0.8, 1e-4)
dP = dp_2phase('R1234yf', 350000, 0.5, 0.03, 0.006, 8e-5, 2)

{ CHECK dP 90316.1188 0.09031611880237206 }
{ CHECK h_cool 2752.986251 0.002752986251192705 }
{ CHECK h_evap 7695.482271 0.007695482270679623 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
dP = 90316.1188 [Pa]
h_cool = 2752.986251 [W/m^2-K]
h_evap = 7695.482271 [W/m^2-K]
```

<!-- verified-reference-example:end -->

### Example 1 — Chiller UA from refrigerant and coolant films

The EV thermal-management sizing forms each side's `h·A` (from the `htc_*`
correlations and the geometry) and combines them with the wall resistance.

[Run: ev-thermal-management]

**Expected:** `UA` is governed by the weaker side — typically the air/gas film,
whose `h·A` is far smaller than a boiling/condensing refrigerant side.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `h1` | Number | Yes | Side-1 film coefficient [W/m²·K]. |
| `A1` | Number | Yes | Side-1 (effective) area [m²]. |
| `h2` | Number | Yes | Side-2 film coefficient [W/m²·K]. |
| `A2` | Number | Yes | Side-2 (effective) area [m²]. |
| `Rwall` | Number | Yes | Wall conductive resistance [K/W]. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `UA` | Number | Overall conductance [W/K]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `DOMAIN_ERROR` | A film coefficient or area ≤ 0 | All resistances must be finite and positive. |
