---
name: CurrentSource
category: Component (electrical)
summary: An ideal current source.
related: []
examples: []
tags: [currentsource, component, electrical, acausal]
---

# CurrentSource

An ideal current source.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`

## Usage

```
CurrentSource inst(I)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `I` | Number | Current [A]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
p.i &= -i \\
p.i + n.i &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
CurrentSource CS(I=2)
Resistor      R(R=5)
Ground        G()
connect(CS.p, R.a)
connect(CS.n, R.b, G.port)

{ CHECK cs.n.i 2 0.000002 }
{ CHECK cs.n.v 0 1e-8 }
{ CHECK cs.p.i -2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cs.n.i = 2
cs.n.v = 0
cs.p.i = -2
```

<!-- verified-reference-example:end -->
