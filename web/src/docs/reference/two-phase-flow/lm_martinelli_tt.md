---
name: lm_martinelli_tt
category: Two-Phase Flow
summary: Turbulent-turbulent Martinelli parameter X_tt
related: []
examples: []
tags: [lm, martinelli, tt, two, phase, flow]
---

# lm_martinelli_tt

Turbulent-turbulent Martinelli parameter X_tt


## Syntax

```
lm_martinelli_tt(x, rho_l, rho_g, mu_l, mu_g)
```

## Description

Returns the **turbulent–turbulent Lockhart–Martinelli parameter `X_tt`** — the ratio of the liquid-alone to vapor-alone pressure gradients that two-phase correlations key on.

## Mathematical Formulation

$$ X_{tt} = \left(\frac{1-x}{x}\right)^{0.9}\left(\frac{\rho_g}{\rho_l}\right)^{0.5}\left(\frac{\mu_l}{\mu_g}\right)^{0.1} $$

## Applicability

- **Where it applies:** The independent variable for two-phase heat-transfer and pressure-drop correlations.
- **Valid when:** Both phases turbulent (the usual refrigerant case).
- **How it's used:** Feeds `lm_phi2`, the Chen factors, and many two-phase Nusselt correlations.

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
| `x` | Number | Yes | Vapor quality (0–1). |
| `rho_l` | Number | Yes | Saturated-liquid density [kg/m³]. |
| `rho_g` | Number | Yes | Saturated-vapor density [kg/m³]. |
| `mu_l` | Number | Yes | Liquid dynamic viscosity [Pa·s]. |
| `mu_g` | Number | Yes | Vapor dynamic viscosity [Pa·s]. |
