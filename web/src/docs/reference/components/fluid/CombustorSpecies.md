---
name: CombustorSpecies
category: Component (fluid)
summary: Acausal fluid-domain component CombustorSpecies with ports in, out.
related: []
examples: []
tags: [combustorspecies, component, fluid, acausal]
references: []
generated: true
---

# CombustorSpecies

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
CombustorSpecies inst(mdot_f, LHV, eta_b, dP, xC, yH, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `mdot_f` | Number |
| `LHV` | Number |
| `eta_b` | Number |
| `dP` | Number |
| `xC` | Number |
| `yH` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
mfuel &= 12\,xc + yh \\
mco2 &= \frac{mdot_{f}\cdot 44\cdot xc}{mfuel} \\
mh2o &= \frac{mdot_{f}\cdot 9\cdot yh}{mfuel} \\
mo2 &= \frac{mdot_{f}\cdot 32\cdot \left(xc + \frac{yh}{4}\right)}{mfuel} \\
out.mdot &= in.mdot + mdot_{f} \\
out.p &= in.p - dp \\
out.mdot\cdot out.h &= in.mdot\cdot in.h + eta_{b}\cdot mdot_{f}\cdot lhv \\
out.mdot\cdot out.yco2 &= in.mdot\cdot in.yco2 + mco2 \\
out.mdot\cdot out.yh2o &= in.mdot\cdot in.yh2o + mh2o \\
out.mdot\cdot out.yo2 &= in.mdot\cdot in.yo2 - mo2 \\
out.mdot\cdot out.yn2 &= in.mdot\cdot in.yn2
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// E3 — species vector rider: octane combustion products through a mixer with
// fresh dilution air; every species mass must conserve exactly through the
// chain (combustor stoichiometry by hand, mixer flow-weighting replicas).
// EXPECT yco2_cmb = 0.0605435 tol 1e-6
// EXPECT o2_mix_res = 0 tol 1e-12
// EXPECT co2_mix_res = 0 tol 1e-12
// EXPECT h2o_mix_res = 0 tol 1e-12
// EXPECT n2_mix_res = 0 tol 1e-12

time = 0
CombustorSpecies CMB(a1, a2, mdot_f=0.01, LHV=44.4e6, eta_b=0.98, dP=3000, xC=8, yH=18)
a1.P = 400000
a1.h = 420000
a1.mdot = 0.5
a1.yo2 = 0.232
a1.yco2 = 0
a1.yh2o = 0
a1.yn2 = 0.768

GasMixerN MIX(a2, d1, m1)
d1.P = 397000
d1.h = 300000
d1.mdot = 0.3
d1.yo2 = 0.232
d1.yco2 = 0
d1.yh2o = 0
d1.yn2 = 0.768

yco2_cmb    = a2.yco2
o2_mix_res  = m1.mdot * m1.yo2  - (a2.mdot * a2.yo2  + 0.3 * 0.232)
co2_mix_res = m1.mdot * m1.yco2 - (a2.mdot * a2.yco2 + 0)
h2o_mix_res = m1.mdot * m1.yh2o - (a2.mdot * a2.yh2o + 0)
n2_mix_res  = m1.mdot * m1.yn2  - (a2.mdot * a2.yn2  + 0.3 * 0.768)

{ CHECK a2.h 1264941.176 1.2649411764705882 }
{ CHECK a2.mdot 0.51 5.1e-7 }
{ CHECK a2.p 397000 0.39699999999999996 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a2.h = 1264941.176
a2.mdot = 0.51
a2.p = 397000
```

<!-- verified-reference-example:end -->
