---
name: fanno_p_pstar
category: Compressible Flow
summary: Fanno static-pressure ratio
related: []
examples: []
tags: [fanno, pstar, compressible, flow]
---

# fanno_p_pstar

Fanno static-pressure ratio


## Syntax

```
fanno_P_Pstar(M, k)
```

## Description

Fanno static-pressure ratio

## Mathematical Formulation

$$ \frac{P}{P^*} = \frac{1}{M}\sqrt{\frac{k+1}{2 + (k-1)M^2}} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Rayleigh (heat addition) and Fanno (friction) duct flow
{ Sonic-reference ratios for air at a subsonic and a supersonic station, plus
  the Fanno friction parameter 4 f Lmax / D. All dimensionless. }
k = 1.4
Msub = 0.4
Msup = 2.2

RT0_sub = rayleigh_T0_T0star(Msub, k)
RT_sub = rayleigh_T_Tstar(Msub, k)
RP_sub = rayleigh_P_Pstar(Msub, k)
RP0_sub = rayleigh_P0_P0star(Msub, k)

RT0_sup = rayleigh_T0_T0star(Msup, k)
RT_sup = rayleigh_T_Tstar(Msup, k)
RP_sup = rayleigh_P_Pstar(Msup, k)
RP0_sup = rayleigh_P0_P0star(Msup, k)

FT_sub = fanno_T_Tstar(Msub, k)
FP_sub = fanno_P_Pstar(Msub, k)
FP0_sub = fanno_P0_P0star(Msub, k)
FLD_sub = fanno_fld(Msub, k)

FT_sup = fanno_T_Tstar(Msup, k)
FP_sup = fanno_P_Pstar(Msup, k)
FP0_sup = fanno_P0_P0star(Msup, k)
FLD_sup = fanno_fld(Msup, k)

RT0_one = rayleigh_T0_T0star(1.0, k)
FLD_one = fanno_fld(1.0, k)
FLD_mono = fanno_fld(0.25, 1.6666666666666667)
RP0_mono = rayleigh_P0_P0star(3.1, 1.6666666666666667)

{ CHECK FLD_mono 6.99557925 0.000006995579250407411 }
{ CHECK FLD_one 0 1e-8 }
{ CHECK FLD_sub 2.308492651 0.0000023084926508453764 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
FLD_mono = 6.99557925
FLD_one = 0
FLD_sub = 2.308492651
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `M` | Number | Yes | Mach number. |
| `k` | Number | Yes | Ratio of specific heats (e.g. 1.4 for air). |
