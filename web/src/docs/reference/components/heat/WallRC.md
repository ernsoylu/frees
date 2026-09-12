---
name: WallRC
category: Component (heat)
summary: Acausal heat-domain component WallRC with ports a, b.
related: []
examples: []
tags: [wallrc, component, heat, acausal]
references: []
generated: true
---

# WallRC

Reusable acausal **heat-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
WallRC inst(C1, C2, R, T10, T20)
```

## Ports

`a`, `b`

## Parameters

| Parameter | Type |
| --- | --- |
| `C1` | Number |
| `C2` | Number |
| `R` | Number |
| `T10` | Number |
| `T20` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(t1\right) &= \frac{a.qdot - \frac{t1 - t2}{r}}{c1} \\
\text{init}\left(t1\right) &= t10 \\
\text{der}\left(t2\right) &= \frac{\frac{t1 - t2}{r} + b.qdot}{c2} \\
\text{init}\left(t2\right) &= t20 \\
a.t &= t1 \\
b.t &= t2
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Two-node RC wall between convective films at steady state: series resistance
// 1/(25*2) + 0.05 + 1/(10*2) = 0.12 K/W, so Q = (380 - 293.15)/0.12 = 723.75 W.
// The WallRC faces are states (never T-pinned); the films decouple them from
// the temperature boundaries. der -> 0 without a DYNAMIC block.
ThermalSource HOT(T=380)
Convection    CVA(htc=25, area=2)
WallRC        WALL(C1=50000, C2=50000, R=0.05, T10=320, T20=310)
Convection    CVB(htc=10, area=2)
ThermalSource AMB(T=293.15)
connect(HOT.port, CVA.a)
connect(CVA.b, WALL.a)
connect(WALL.b, CVB.a)
connect(CVB.b, AMB.port)
t_face_hot  = WALL.T1
t_face_cold = WALL.T2
q_wall      = (WALL.T1 - WALL.T2) / 0.05

{ CHECK amb.port.qdot 723.75 0.00072375 }
{ CHECK amb.port.t 293.15 0.00029314999999999994 }
{ CHECK cva.a.qdot 723.75 0.0007237499999999985 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
amb.port.qdot = 723.75
amb.port.t = 293.15
cva.a.qdot = 723.75
```

<!-- verified-reference-example:end -->
