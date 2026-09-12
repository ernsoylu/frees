---
name: prandtlmeyer
category: Compressible Flow
summary: Prandtl-Meyer angle nu(M) [rad]
related: []
examples: []
tags: [prandtlmeyer, compressible, flow]
---

# prandtlmeyer

Prandtl-Meyer angle nu(M) [rad]


## Syntax

```
PrandtlMeyer(M, k)
```

## Description

Prandtl-Meyer angle nu(M) [rad]

## Mathematical Formulation

$$ \nu(M) = \sqrt{\tfrac{k+1}{k-1}}\,\arctan\!\sqrt{\tfrac{k-1}{k+1}(M^2-1)} - \arctan\!\sqrt{M^2-1} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Prandtl-Meyer expansion and oblique-shock theta-beta-M
{ Angles are in radians. The Prandtl-Meyer function and its inverse, the Mach
  angle, and both roots of the theta-beta-M relation for a 20 deg wedge. }
k = 1.4
M1 = 2.6

nu = prandtlmeyer(M1, k)
nu2 = prandtl_meyer(M1, k)
Mnu = mach_prandtlmeyer(nu, k)
Mnu0 = mach_prandtlmeyer(0.0, k)
mu = machangle(M1)
mu1 = machangle(1.0)

theta = 20 * pi# / 180
beta_weak = beta_oblique(M1, theta, k, 'weak')
beta_strong = beta_oblique(M1, theta, k, 'strong')
theta_weak = theta_oblique(M1, beta_weak, k)
theta_strong = theta_oblique(M1, beta_strong, k)

M2n_weak = M2_shock(M1 * sin(beta_weak), k)
M2_weak = M2n_weak / sin(beta_weak - theta)

kmono = 1.6666666666666667
nu_mono = prandtlmeyer(3.4, kmono)
Mnu_mono = mach_prandtlmeyer(nu_mono, kmono)
beta_mono = beta_oblique(3.4, 0.35, kmono, 'weak')

{ CHECK beta_mono 0.6699558813 6.699558813315369e-7 }
{ CHECK beta_strong 1.407175888 0.0000014071758877295204 }
{ CHECK beta_weak 0.7264279973 7.264279972824406e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
beta_mono = 0.6699558813
beta_strong = 1.407175888
beta_weak = 0.7264279973
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `M` | Number | Yes | Mach number. |
| `k` | Number | Yes | Ratio of specific heats (e.g. 1.4 for air). |
