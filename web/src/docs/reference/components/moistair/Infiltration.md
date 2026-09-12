---
name: Infiltration
category: Component (moistair)
summary: Acausal moistair-domain component Infiltration with ports in, out.
related: []
examples: []
tags: [infiltration, component, moistair, acausal]
references: []
generated: true
---

# Infiltration

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Infiltration inst(C_inf, n_exp, eps, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `C_inf` | Number |
| `n_exp` | Number |
| `eps` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
dp &= in.p - out.p \\
in.mdot &= c_{inf}\cdot dp\cdot \left(dp^{2} + eps^{2}\right)^{\frac{n_{exp} - 1}{2}} \\
out.mdot &= in.mdot \\
out.w &= in.w \\
out.h &= in.h
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Envelope infiltration: power-law crack flow (n = 0.65) across a 50 Pa
// stack/wind pressure difference between outdoors (101375 Pa, cold dry air)
// and the zone (101325 Pa). mdot ~ C_inf * dP^n = 0.004 * 50^0.65 = 0.0508 kg/s.
Infiltration INF(z1, z2, C_inf=0.004, n_exp=0.65, eps=1)
z1.P = 101375
z1.W = 0.004
z1.h = Enthalpy(AirH2O, T=278.15, P=101375, W=0.004)
z2.P = 101325
m_leak = INF.in.mdot
w_leak = INF.out.W

{ CHECK inf.dp 50 0.000049999999999999996 }
{ CHECK m_leak 0.05085809628 5.085809627719309e-8 }
{ CHECK w_leak 0.004 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
inf.dp = 50
m_leak = 0.05085809628 [kg/s]
w_leak = 0.004
```

<!-- verified-reference-example:end -->
