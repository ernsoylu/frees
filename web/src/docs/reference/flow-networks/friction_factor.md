---
name: friction_factor
category: Flow Networks
summary: Darcy friction factor (Colebrook-Moody, laminar+turbulent)
related: []
examples: []
tags: [friction, factor, flow, networks]
---

# friction_factor

Darcy friction factor (Colebrook-Moody, laminar+turbulent)


## Syntax

```
friction_factor(Re, rel_rough)
```

## Description

Darcy friction factor (Colebrook-Moody, laminar+turbulent)

## Mathematical Formulation

$$ \frac{1}{\sqrt{f}} = -2\log_{10}\!\left(\frac{\varepsilon/D}{3.7} + \frac{2.51}{Re\sqrt{f}}\right) \quad\text{(Colebrook; } f = 64/Re \text{ laminar)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Darcy friction factor, Reynolds number and minor losses
{ Water in a 50 mm commercial-steel pipe. The friction factor is exercised in
  the laminar branch, the linearly blended transition band and the Colebrook
  turbulent branch, smooth and rough. }
rho = 998.0
mu = 0.001002
D = 0.05
eps = 0.000045
epsD = eps / D

V = 1.5
Re = reynolds(rho, V, D, mu)
Re_rev = re_number(rho, -V, D, mu)
f_turb = friction_factor(Re, epsD)
f_turb_smooth = darcy_friction(Re, 0)

Re_lam = reynolds(rho, 0.02, D, mu)
f_lam = friction_factor(Re_lam, epsD)
f_lam_exact = 64 / Re_lam

f_trans = friction_factor(3000, epsD)
f_at2300 = friction_factor(2300, epsD)
f_at4000 = friction_factor(4000, epsD)
f_zero = friction_factor(0, epsD)
f_neg = friction_factor(-25, epsD)
f_veryrough = friction_factor(1000000, 0.05)
f_highRe = friction_factor(100000000, epsD)

dP_elbow = minor_loss(0.9, rho, V)
dP_exit = minor_loss(1, rho, V)
dP_rev = minor_loss(0.9, rho, -V)

{ CHECK dP_elbow 1010.475 0.001010475 }
{ CHECK dP_exit 1122.75 0.00112275 }
{ CHECK dP_rev 1010.475 0.001010475 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
dP_elbow = 1010.475 [Pa]
dP_exit = 1122.75 [Pa]
dP_rev = 1010.475 [Pa]
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Re` | Number | Yes | Reynolds number. |
| `rel_rough` | Number | Yes | Relative wall roughness ε/D. |
