---
name: BatteryThermal
category: Component (electrical)
summary: A battery with a coupled thermal model relating losses to temperature.
related: []
examples: []
tags: [batterythermal, component, electrical, acausal]
---

# BatteryThermal

A battery with a coupled thermal model relating losses to temperature.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`, `heat`

## Usage

```
BatteryThermal inst(Voc, R0)
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
q &= r0\cdot p.i^{2} \\
heat.qdot &= -q \\
w &= \left(p.v - n.v\right)\cdot \left(0 - p.i\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
BatteryThermal B(Voc=400, R0=0.1)
Resistor       MOT(R=3.9)
Ground         G()
Conduction     PLATE(k=10, area=1, L=0.1)
ThermalSource  COOL(T=298)
connect(B.p, MOT.a)
connect(B.n, MOT.b, G.port)
connect(B.heat, PLATE.a)
connect(PLATE.b, COOL.port)

{ CHECK b.heat.qdot -1000 0.001 }
{ CHECK b.heat.t 308 0.000308 }
{ CHECK b.n.i 100 0.00009999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
b.heat.qdot = -1000
b.heat.t = 308
b.n.i = 100
```

<!-- verified-reference-example:end -->
