---
name: Potentiometer
category: Component (electrical)
summary: "Potentiometer: a track resistance R between a and b, with the wiper w at fraction pos from a."
related: [Resistor]
examples: []
tags: [potentiometer, component, electrical, acausal]
references: ["J. W. Nilsson and S. A. Riedel, Electric Circuits, 11th ed., Pearson, 2019 (voltage dividers and Thevenin equivalents)"]
---

# Potentiometer

Potentiometer: a track resistance R between a and b, with the wiper w at fraction pos from a.

## What it models

A three-terminal variable resistor. The wiper divides the track into R·pos (to `a`) and R·(1 − pos) (to `b`), with `pos` clamped to 0…1. It is a natural slider: pin `pos` to turn the knob. Track taper, wiper contact resistance and the power rating are not modelled.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`a`, `b`, `w`

## Usage

```
Potentiometer inst(R, pos)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `R` | Number | Total track resistance [ohm]. |
| `pos` | Number | Wiper position, 0 at a and 1 at b [-]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
x &= \text{min}\left(1, \text{max}\left(0, pos\right)\right) \\
a.v - w.v &= r\cdot x\cdot a.i \\
w.v - b.v &= -r\cdot \left(1 - x\right)\cdot b.i \\
a.i + b.i + w.i &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — a loaded voltage divider

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results against the analytic values in the comment; they do not change the calculation.

```frees
// frees-language: 2
{ A 10 kΩ potentiometer at mid-travel divides 10 V. Unloaded the wiper sits
  at 5 V; a 10 kΩ load pulls it to Vth·RL/(Rth + RL) = 5·10/12.5 = 4 V, since
  the wiper's Thevenin resistance is 5k ∥ 5k = 2.5 kΩ. }
VoltageSource VS(E=10 [V])
Potentiometer P(R=10000 [ohm], pos=0.5)
Resistor      RL(R=10000 [ohm])
Ground        G()
connect(VS.p, P.a)
connect(P.w, RL.a)
connect(P.b, RL.b, VS.n, G.port)
v_w = P.w.V

{ CHECK v_w 4 1e-09 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
v_w = 4
```

<!-- verified-reference-example:end -->
