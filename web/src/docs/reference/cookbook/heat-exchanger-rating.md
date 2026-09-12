---
name: Rating a Heat Exchanger (ε-NTU)
category: Cookbook
guide: true
summary: Find a heat exchanger's duty and outlet temperatures from its UA by the effectiveness-NTU method.
examples: [hx-effectiveness-ntu]
tags: [cookbook, heat exchanger, effectiveness, ntu, rating, duty, heat transfer]
related: [hx_effectiveness, hx_NTU, LMTD, ua_hx]
---

# Rating a Heat Exchanger (ε-NTU)

**Goal:** given an exchanger's conductance `UA` and the two inlet streams, find the
**heat duty and both outlet temperatures** — without iterating on the unknown
outlets (which the LMTD method would require).

## What you'll build

A rating calculation in four steps:

1. Form each stream's heat-capacity rate `C = ṁ·cp`; take `Cmin`, `Cmax`.
2. Compute `NTU = UA/Cmin` and the capacity ratio `Cr = Cmin/Cmax`.
3. Get the effectiveness ε from the arrangement.
4. Back out the duty and outlets.

## Approach

The effectiveness–NTU relations give ε directly per flow arrangement
(`hx_effectiveness`), so the duty follows from the inlets alone:

$$ \varepsilon = f(NTU, C_r),\quad Q = \varepsilon\,C_{min}(T_{h,in} - T_{c,in}),\quad T_{h,out} = T_{h,in} - \frac{Q}{C_h},\ T_{c,out} = T_{c,in} + \frac{Q}{C_c} $$

Use `hx_NTU` for the inverse (sizing to a target ε) and `LMTD` to
cross-check the mean driving temperature.

## Worked example

[Run: hx-effectiveness-ntu]

**What it tells you:** the duty `Q ≈ 312 kW`, the outlet temperatures
(`Th_out ≈ 323 K`, `Tc_out ≈ 340 K`) and the effectiveness `ε ≈ 0.71` for the
counterflow case — read straight from `UA` with no iteration.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Heat Exchanger (Effectiveness-NTU)

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// Heat Exchanger — Effectiveness-NTU Method
{ Counterflow water-to-water exchanger rated with the effectiveness-NTU method. }
mdot_h = 2.0 [kg/s]
cp_h = 4180 [J/kg-K]
mdot_c = 1.5 [kg/s]
cp_c = 4180 [J/kg-K]
Th_in = 360 [K]
Tc_in = 290 [K]
UA = 12000 [W/K]

C_h = mdot_h * cp_h
C_c = mdot_c * cp_c
C_min = min(C_h, C_c)
C_max = max(C_h, C_c)
Cr = C_min / C_max
NTU = UA / C_min

eps = hx_effectiveness('counterflow', NTU, Cr)
Q_max = C_min * (Th_in - Tc_in)
Q = eps * Q_max
Th_out = Th_in - Q / C_h
Tc_out = Tc_in + Q / C_c
dTlm = LMTD(Th_in - Tc_out, Th_out - Tc_in)

{ CHECK C_c 6270 0.0062699999999999995 }
{ CHECK C_h 8360 0.00836 }
{ CHECK C_max 8360 0.00836 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
C_c = 6270 [W/K]
C_h = 8360 [W/K]
C_max = 8360 [W/K]
```

<!-- verified-reference-example:end -->
