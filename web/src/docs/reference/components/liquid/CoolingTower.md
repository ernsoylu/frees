---
name: CoolingTower
category: Component (liquid)
summary: Acausal liquid-domain component CoolingTower with ports in, out, wb.
related: []
examples: []
tags: [coolingtower, component, liquid, acausal]
references: []
generated: true
---

# CoolingTower

Reusable acausal **liquid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
CoolingTower inst(fluid$, eps_t, mdot_a, Patm, domain$)
```

## Ports

`in`, `out`, `wb`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `eps_t` | Number |
| `mdot_a` | Number |
| `Patm` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
t_{in} &= \text{Temperature}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
h_{s_in} &= \text{Enthalpy}\left(\mathrm{airh2o}, t=t_{in}, p=patm, r=1\right) \\
h_{wb} &= \text{Enthalpy}\left(\mathrm{airh2o}, t=wb.sig, p=patm, r=1\right) \\
q &= eps_{t}\cdot mdot_{a}\cdot \left(h_{s_in} - h_{wb}\right) \\
out.mdot &= in.mdot \\
out.p &= in.p \\
out.h &= in.h - \frac{q}{in.mdot}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// CoolingTower (Merkel-lite): heat rejection on the saturated-enthalpy
// potential between the 310 K water inlet and a 295 K wet-bulb signal.
// eps_t = 0.4 with 2 kg/s design air keeps the approach above the wet-bulb.
LiquidSource LS(w1, fluid$ = Water, mdot = 2.0, P = 150000, T = 310)
CoolingTower CT(w1, w2, wb1, fluid$ = Water, eps_t = 0.4, mdot_a = 2.0, Patm = 101325)
SigConstant  WB(wb1, k = 295)
LiquidSink   SK(w2)

q_rej = CT.Q
h_out = SK.h

{ CHECK ct.h_s_in 142212.6832 0.1422126832490338 }
{ CHECK ct.h_wb 64110.40533 0.06411040532834847 }
{ CHECK ct.q 62481.82234 0.062481822336548275 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ct.h_s_in = 142212.6832
ct.h_wb = 64110.40533
ct.q = 62481.82234
```

<!-- verified-reference-example:end -->
