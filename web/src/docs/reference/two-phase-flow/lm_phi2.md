---
name: lm_phi2
category: Two-Phase Flow
summary: Chisholm two-phase multiplier 1+C/X+1/X^2 on the liquid-alone drop
related: []
examples: []
tags: [lm, phi2, two, phase, flow]
---

# lm_phi2

Chisholm two-phase multiplier 1+C/X+1/X^2 on the liquid-alone drop


## Syntax

```
lm_phi2(X, C)
```

## Description

Returns the **Chisholm two-phase frictional multiplier** `φ_l² = 1 + C/X + 1/X²` on the liquid-alone pressure gradient — i.e. how much more pressure two-phase flow drops than the liquid flowing alone.

## Mathematical Formulation

$$ \phi_l^2 = 1 + \frac{C}{X} + \frac{1}{X^2} \quad\text{(Chisholm)} $$

## Applicability

- **Where it applies:** Two-phase frictional pressure drop in refrigerant evaporator/condenser passages.
- **Valid when:** Separated two-phase flow; the Chisholm constant `C` ranges 5 (laminar–laminar) to 20 (turbulent–turbulent).
- **How it's used:** Multiply the liquid-only Darcy gradient by `φ_l²` (with `lm_martinelli_tt` supplying `X`) to get the two-phase frictional `ΔP`. Friedel (`friedel_phi2`) is an alternative.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Lockhart-Martinelli / Chisholm two-phase pressure-drop multiplier
{ R134a-like saturated properties at moderate pressure. X_tt is the turbulent-
  turbulent Martinelli parameter; phi_l^2 multiplies the liquid-alone drop. }
rho_l = 1187.5
rho_g = 25.75
mu_l = 0.000185
mu_g = 0.0000117

x = 0.35
Xtt = lm_martinelli_tt(x, rho_l, rho_g, mu_l, mu_g)
phi2_tt = lm_phi2(Xtt, 20)
phi2_lt = lm_phi2(Xtt, 12)
phi2_tl = lm_phi2(Xtt, 10)
phi2_ll = lm_phi2(Xtt, 5)

xlow = 0.02
Xtt_low = lm_martinelli_tt(xlow, rho_l, rho_g, mu_l, mu_g)
phi2_low = lm_phi2(Xtt_low, 20)

xhigh = 0.95
Xtt_high = lm_martinelli_tt(xhigh, rho_l, rho_g, mu_l, mu_g)
phi2_high = lm_phi2(Xtt_high, 20)

phi2_unit = lm_phi2(1, 20)

{ CHECK phi2_high 6778.430386 0.006778430385699116 }
{ CHECK phi2_ll 24.47078163 0.000024470781632765024 }
{ CHECK phi2_low 4.12780701 0.0000041278070103493 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
phi2_high = 6778.430386
phi2_ll = 24.47078163
phi2_low = 4.12780701
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `X` | Number | Yes | Lockhart–Martinelli parameter. |
| `C` | Number | Yes | Empirical constant. |
