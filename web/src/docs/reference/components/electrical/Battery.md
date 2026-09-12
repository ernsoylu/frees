---
name: Battery
category: Component (electrical)
summary: An electrical battery modeled as an EMF in series with an internal resistance.
related: []
examples: []
tags: [battery, component, electrical, acausal]
---

# Battery

An electrical battery modeled as an EMF in series with an internal resistance.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`

## Usage

```
Battery inst(Voc, R0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Voc` | Number | Open-circuit voltage [V]. |
| `R0` | Number | Series (ohmic) resistance [Ω]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
p.v - n.v &= voc + r0\cdot p.i \\
p.i + n.i &= 0 \\
w &= \left(p.v - n.v\right)\cdot \left(0 - p.i\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
Battery  B(Voc=12, R0=0.1)
Resistor RL(R=2.0)
Ground   G()
connect(B.p, RL.a)
connect(B.n, RL.b, G.port)

{ CHECK b.n.i 5.714285714 0.0000057142857142857145 }
{ CHECK b.n.v 0 1e-8 }
{ CHECK b.p.i -5.714285714 0.0000057142857142857145 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
b.n.i = 5.714285714
b.n.v = 0
b.p.i = -5.714285714
```

<!-- verified-reference-example:end -->
