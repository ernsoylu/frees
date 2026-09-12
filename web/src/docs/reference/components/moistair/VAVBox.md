---
name: VAVBox
category: Component (moistair)
summary: Acausal moistair-domain component VAVBox with ports in, out, u, ur.
related: []
examples: []
tags: [vavbox, component, moistair, acausal]
references: []
generated: true
---

# VAVBox

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
VAVBox inst(mdot_max, Qr_max, domain$)
```

## Ports

`in`, `out`, `u`, `ur`

## Parameters

| Parameter | Type |
| --- | --- |
| `mdot_max` | Number |
| `Qr_max` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
in.mdot &= u.sig\cdot mdot_{max} \\
out.mdot &= in.mdot \\
out.w &= in.w \\
out.h &= in.h + \frac{ur.sig\cdot qr_{max}}{in.mdot}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// VAV terminal box: the damper command sets the supply flow directly
// (u = 0.6 of mdot_max = 0.5 kg/s -> 0.3 kg/s) and the reheat command adds
// 30% of Qr_max = 2000 W. Flow-determining: the inlet stream's mdot comes
// from the box, so the plenum boundary pins only P, W, h.
VAVBox VAV(z1, z2, u1, r1, mdot_max=0.5, Qr_max=2000)
u1.sig = 0.6
r1.sig = 0.3
z1.P = 101325
z1.W = 0.008
z1.h = Enthalpy(AirH2O, T=290.15, P=101325, W=0.008)
m_sup = VAV.out.mdot
h_rise = VAV.out.h - z1.h

{ CHECK h_rise 2000 0.002 }
{ CHECK m_sup 0.3 3e-7 }
{ CHECK z1.h 37350.97869 0.03735097868615146 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
h_rise = 2000 [J/kg]
m_sup = 0.3 [kg/s]
z1.h = 37350.97869
```

<!-- verified-reference-example:end -->
