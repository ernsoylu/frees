---
name: a_astar
category: Compressible Flow
summary: Isentropic area ratio A/A*
related: []
examples: []
tags: [astar, compressible, flow]
---

# a_astar

Isentropic area ratio A/A*


## Syntax

```
A_Astar(M, k)
```

## Description

Isentropic area ratio A/A*

## Mathematical Formulation

$$ \frac{A}{A^*} = \frac{1}{M}\left[\frac{2}{k+1}\left(1 + \tfrac{k-1}{2}M^2\right)\right]^{(k+1)/[2(k-1)]} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Isentropic ideal-gas flow relations
{ Stagnation and area ratios for air (k = 1.4) at a subsonic and a supersonic
  Mach number, plus both branches of the A/A* inverse. Ratios dimensionless. }
k = 1.4
Msub = 0.5
Msup = 2.5

T0T_sub = T0_T(Msub, k)
P0P_sub = P0_P(Msub, k)
R0R_sub = rho0_rho(Msub, k)
AAs_sub = A_Astar(Msub, k)

T0T_sup = isen_T0_T(Msup, k)
P0P_sup = isen_P0_P(Msup, k)
R0R_sup = isen_rho0_rho(Msup, k)
AAs_sup = isen_A_Astar(Msup, k)

Mback_sub = mach_A_Astar(AAs_sub, k, 'subsonic')
Mback_sup = mach_A_Astar(AAs_sup, k, 'supersonic')
Msonic = mach_A_Astar(1.0, k, 'sup')

kmono = 1.6666666666666667
T0T_mono = T0_T(1.2, kmono)
P0P_mono = P0_P(1.2, kmono)
AAs_mono = A_Astar(0.3, kmono)

{ CHECK AAs_mono 1.9891875 0.000001989187499999999 }
{ CHECK AAs_sub 1.33984375 0.0000013398437500000004 }
{ CHECK AAs_sup 2.63671875 0.0000026367187500000006 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
AAs_mono = 1.9891875
AAs_sub = 1.33984375
AAs_sup = 2.63671875
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `M` | Number | Yes | Mach number. |
| `k` | Number | Yes | Ratio of specific heats (e.g. 1.4 for air). |
