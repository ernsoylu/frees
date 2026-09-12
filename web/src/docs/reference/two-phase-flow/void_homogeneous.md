---
name: void_homogeneous
category: Two-Phase Flow
summary: Homogeneous (no-slip) void fraction
related: []
examples: []
tags: [void, homogeneous, two, phase, flow]
---

# void_homogeneous

Homogeneous (no-slip) void fraction


## Syntax

```
void_homogeneous(x, rho_l, rho_g)
```

## Description

Returns the **homogeneous (no-slip) void fraction** — the vapor volume fraction assuming both phases move at the same velocity.

## Mathematical Formulation

$$ \alpha = \frac{1}{1 + \frac{1-x}{x}\frac{\rho_g}{\rho_l}} \quad\text{(no slip)} $$

## Applicability

- **Where it applies:** The vapor fraction `α` used in two-phase density, charge, and gravitational-head terms.
- **Valid when:** High-mass-flux / bubbly flow where slip is negligible; the simplest model (it overpredicts `α` at low mass flux).
- **How it's used:** Feeds the two-phase mixture density and `dp_gravity`. For better accuracy use `void_zivi` or `void_rouhani`.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Void fractions, the Friedel multiplier and the separated momentum flux
{ Homogeneous, Zivi and Rouhani-Axelsson void fractions on the same state,
  the Friedel liquid-only multiplier, and the momentum flux at one station.
  Clamping outside the dome is exercised at x <= 0 and x >= 1. }
rho_l = 1187.5
rho_g = 25.75
mu_l = 0.000185
mu_g = 0.0000117
sigma = 0.0082
G = 300
D = 0.008

x = 0.35
a_hom = void_homogeneous(x, rho_l, rho_g)
a_zivi = void_zivi(x, rho_l, rho_g)
a_rouhani = void_rouhani(x, rho_l, rho_g, G, sigma)

a_hom_dry = void_homogeneous(1.4, rho_l, rho_g)
a_hom_wet = void_homogeneous(-0.2, rho_l, rho_g)
a_zivi_dry = void_zivi(1, rho_l, rho_g)
a_zivi_wet = void_zivi(0, rho_l, rho_g)
a_rou_dry = void_rouhani(1, rho_l, rho_g, G, sigma)
a_rou_wet = void_rouhani(0, rho_l, rho_g, G, sigma)

phi2_friedel = friedel_phi2(x, rho_l, rho_g, mu_l, mu_g, G, D, sigma)
phi2_friedel_low = friedel_phi2(0.02, rho_l, rho_g, mu_l, mu_g, G, D, sigma)
phi2_friedel_clampL = friedel_phi2(0, rho_l, rho_g, mu_l, mu_g, G, D, sigma)
phi2_friedel_clampH = friedel_phi2(1, rho_l, rho_g, mu_l, mu_g, G, D, sigma)
phi2_friedel_lam = friedel_phi2(x, rho_l, rho_g, mu_l, mu_g, 4, D, sigma)

mflux = momentum_flux(x, rho_l, rho_g, a_rouhani, G)
mflux_clampH = momentum_flux(x, rho_l, rho_g, 1, G)
mflux_clampL = momentum_flux(x, rho_l, rho_g, 0, G)

{ CHECK a_hom 0.9612882708 9.612882708375496e-7 }
{ CHECK a_hom_dry 1 0.000001 }
{ CHECK a_hom_wet 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a_hom = 0.9612882708
a_hom_dry = 1
a_hom_wet = 0
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
| `rho_l` | Number | Yes | Saturated-liquid density [kg/m³]. |
| `rho_g` | Number | Yes | Saturated-vapor density [kg/m³]. |
