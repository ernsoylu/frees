---
name: ReliefValve
category: Component (hydraulic)
summary: A pressure-relief valve that opens above its set pressure.
related: []
examples: []
tags: [reliefvalve, component, hydraulic, acausal]
---

# ReliefValve

A pressure-relief valve that opens above its set pressure.

## Domain

A reusable **acausal hydraulic-domain** component — its oil-hydraulic ports carry pressure `P`, mass-flow `ṁ`, and enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
ReliefValve inst(Pcrack, K, eps, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Pcrack` | Number | Cracking (relief) pressure [Pa]. |
| `K` | Number | Gain / coefficient. |
| `eps` | Number | Effectiveness / roughness. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
open &= 0.5\,\left(1 + \tanh\left(\frac{in.p - pcrack}{eps}\right)\right) \\
in.mdot &= k\cdot open\cdot \left(in.p - out.p\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
HydraulicSupply SUP(P=4000000)
ReliefValve     RV(Pcrack=5000000, K=1e-6, eps=10000)
HydraulicTank   TNK(P=0)
connect(SUP.out, RV.in)
connect(RV.out, TNK.port)

{ CHECK rv.in.h 0 1e-8 }
{ CHECK rv.in.mdot 0 1e-8 }
{ CHECK rv.in.p 4000000 4 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
rv.in.h = 0
rv.in.mdot = 0
rv.in.p = 4000000
```

<!-- verified-reference-example:end -->
