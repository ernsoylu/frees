---
name: Battery2RC
category: Component (electrical)
summary: A battery with two RC branches for second-order transient terminal behavior.
related: []
examples: []
tags: [battery2rc, component, electrical, acausal]
---

# Battery2RC

A battery with two RC branches for second-order transient terminal behavior.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`

## Usage

```
Battery2RC inst(Voc, R0, R1, C1, R2, C2, Vrc1_0, Vrc2_0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Voc` | Number | Open-circuit voltage [V]. |
| `R0` | Number | Series (ohmic) resistance [Ω]. |
| `R1` | Number | First RC-branch resistance [Ω]. |
| `C1` | Number | First RC-branch capacitance [F]. |
| `R2` | Number | Second RC-branch resistance [Ω]. |
| `C2` | Number | Second RC-branch capacitance [F]. |
| `Vrc1_0` | Number | Initial first-RC voltage [V]. |
| `Vrc2_0` | Number | Initial second-RC voltage [V]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
p.v - n.v &= voc + r0\cdot p.i - vrc1 - vrc2 \\
\text{der}\left(vrc1\right) &= \frac{-p.i}{c1} - \frac{vrc1}{r1\cdot c1} \\
\text{init}\left(vrc1\right) &= vrc1_{0} \\
\text{der}\left(vrc2\right) &= \frac{-p.i}{c2} - \frac{vrc2}{r2\cdot c2} \\
\text{init}\left(vrc2\right) &= vrc2_{0} \\
p.i + n.i &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
Battery2RC B(Voc=48, R0=0.1, R1=0.2, C1=1000, R2=0.1, C2=2000, Vrc1_0=0, Vrc2_0=0)
Resistor   RL(R=4.6)
Ground     G()
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
