---
name: BatteryRC
category: Component (electrical)
summary: A battery with one RC branch for first-order transient terminal behavior.
related: []
examples: []
tags: [batteryrc, component, electrical, acausal]
---

# BatteryRC

A battery with one RC branch for first-order transient terminal behavior.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`

## Usage

```
BatteryRC inst(Voc, R0, R1, C1, Vrc0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Voc` | Number | Open-circuit voltage [V]. |
| `R0` | Number | Series (ohmic) resistance [Ω]. |
| `R1` | Number | First RC-branch resistance [Ω]. |
| `C1` | Number | First RC-branch capacitance [F]. |
| `Vrc0` | Number | Initial RC-branch voltage [V]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
p.v - n.v &= voc + r0\cdot p.i - vrc \\
\text{der}\left(vrc\right) &= \frac{-p.i}{c1} - \frac{vrc}{r1\cdot c1} \\
\text{init}\left(vrc\right) &= vrc0 \\
p.i + n.i &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
BatteryRC B(Voc=48, R0=0.1, R1=0.2, C1=1000, Vrc0=0)
Resistor  RL(R=4.7)
Ground    G()
connect(B.p, RL.a)
connect(B.n, RL.b, G.port)

{ CHECK b.n.i 9.6 0.0000096 }
{ CHECK b.n.v 0 1e-8 }
{ CHECK b.p.i -9.6 0.0000096 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
b.n.i = 9.6
b.n.v = 0
b.p.i = -9.6
```

<!-- verified-reference-example:end -->
