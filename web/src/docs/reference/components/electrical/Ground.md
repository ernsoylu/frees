---
name: Ground
category: Component (electrical)
summary: The electrical reference node (V = 0).
related: []
examples: [pressure-cooker]
tags: [ground, component, electrical, acausal]
---

# Ground

The electrical reference node (`V = 0`).

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`port`

## Usage

```
Ground inst(...)
```

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
port.v &= 0
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

Instantiated in the verified example below:

[Run: pressure-cooker]
