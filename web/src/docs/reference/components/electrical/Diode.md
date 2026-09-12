---
name: Diode
category: Component (electrical)
summary: A nonlinear diode with an exponential current–voltage characteristic.
related: []
examples: []
tags: [diode, component, electrical, acausal]
---

# Diode

A nonlinear diode with an exponential current–voltage characteristic.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`

## Usage

```
Diode inst(Gon, eps)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Gon` | Number | On-state conductance [S]. |
| `eps` | Number | Effectiveness / roughness. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
vd &= p.v - n.v \\
p.i &= gon\cdot vd\cdot \left(0.5 + 0.5\,\tanh\left(\frac{vd}{eps}\right)\right) \\
p.i + n.i &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
VoltageSource VS(E=5)
Diode         D(Gon=10, eps=0.001)
Resistor      R(R=1)
Ground        G()
connect(VS.p, D.p)
connect(D.n, R.a)
connect(R.b, VS.n, G.port)

{ CHECK d.n.i -4.545454545 0.000004545454545454545 }
{ CHECK d.n.v 4.545454545 0.000004545454545454545 }
{ CHECK d.p.i 4.545454545 0.000004545454545454545 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
d.n.i = -4.545454545
d.n.v = 4.545454545
d.p.i = 4.545454545
```

<!-- verified-reference-example:end -->
