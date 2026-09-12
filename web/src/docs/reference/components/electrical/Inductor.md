---
name: Inductor
category: Component (electrical)
summary: An inductor storing magnetic energy, with V = L di/dt.
related: []
examples: [series-rlc-resonance]
tags: [inductor, component, electrical, acausal]
---

# Inductor

An inductor storing magnetic energy, with `V = L di/dt`.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`

## Usage

```
Inductor inst(L, I0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `L` | Number | Length [m]. |
| `I0` | Number | Saturation current [A]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
\text{der}\left(il\right) &= \frac{p.v - n.v}{l} \\
\text{init}\left(il\right) &= i0 \\
p.i &= il \\
p.i + n.i &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Inductor steady: der(IL) -> 0 forces zero drop across the coil, so the loop
// current is the resistor's: IL = 10/5 = 2 A.
// EXPECT il = 2 tol 1e-9
VoltageSource SRC(E = 10)
Inductor      L1(L = 0.1, I0 = 0)
Resistor      R1(R = 5)
Ground        G()
connect(SRC.p, L1.p)
connect(L1.n, R1.a)
connect(R1.b, SRC.n, G.port)
il = L1.IL

{ CHECK g.port.i 0 1e-8 }
{ CHECK g.port.v 0 1e-8 }
{ CHECK il 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
g.port.i = 0
g.port.v = 0
il = 2 [A]
```

<!-- verified-reference-example:end -->
