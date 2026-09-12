---
name: VoltageSource
category: Component (electrical)
summary: An ideal voltage source.
related: []
examples: [pressure-cooker, rc-step-charging, series-rlc-resonance, resistor-bridge-equivalent, resistor-bridge-parametric]
tags: [voltagesource, component, electrical, acausal]
---

# VoltageSource

An ideal voltage source.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`

## Usage

```
VoltageSource inst(E)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `E` | Number | EMF / voltage [V]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
p.v - n.v &= e \\
p.i + n.i &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
VoltageSource VS(E=10)
Resistor R1(R=3)
Resistor R2(R=2)
Ground   G()
connect(VS.p, R1.a)
connect(R1.b, R2.a)
connect(R2.b, VS.n, G.port)

{ CHECK g.port.i 0 1e-8 }
{ CHECK g.port.v 0 1e-8 }
{ CHECK r1.a.i 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
g.port.i = 0
g.port.v = 0
r1.a.i = 2
```

<!-- verified-reference-example:end -->

Instantiated in the verified example below:

[Run: pressure-cooker]
