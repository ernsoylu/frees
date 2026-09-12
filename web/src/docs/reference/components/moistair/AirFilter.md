---
name: AirFilter
category: Component (moistair)
summary: Acausal moistair-domain component AirFilter with ports in, out.
related: []
examples: []
tags: [airfilter, component, moistair, acausal]
references: []
generated: true
---

# AirFilter

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
AirFilter inst(K, foul, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `K` | Number |
| `foul` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.w &= in.w \\
out.h &= in.h \\
out.p &= in.p - foul\cdot k\cdot in.mdot^{2}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// W rides EQUAL across a pass-through and across a plain connect node.
MoistAirSource SRC(a1, P = 101325, T = 300, W = 0.010, mdot = 1.5)
AirFilter      FLT(a1, a2, K = 100, foul = 1.0)
HeatingCoil    HTR(a2, a3, Q = 3000)
MoistAirSink   SK(a3)
w1 = a1.W
w2 = a2.W
w3 = a3.W
h3 = a3.h

{ CHECK a1.h 52509.06784 0.052509067835993406 }
{ CHECK a1.mdot 1.5 0.0000015 }
{ CHECK a1.p 101325 0.101325 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a1.h = 52509.06784
a1.mdot = 1.5
a1.p = 101325
```

<!-- verified-reference-example:end -->
