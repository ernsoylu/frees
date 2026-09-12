---
name: BatteryTransient
category: Component (electrical)
summary: A transient battery model carrying state-of-charge dynamics.
related: []
examples: []
tags: [batterytransient, component, electrical, acausal]
---

# BatteryTransient

A transient battery model carrying state-of-charge dynamics.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`, `heat`

## Usage

```
BatteryTransient inst(Voc, R0, Q0, C_th, SOC0, T0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Voc` | Number | Open-circuit voltage [V]. |
| `R0` | Number | Series (ohmic) resistance [Ω]. |
| `Q0` | Number | Reference heat [W]. |
| `C_th` | Number | Thermal capacitance [J/K]. |
| `SOC0` | Number | Initial state of charge (0–1). |
| `T0` | Number | Reference/initial temperature [K]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
p.v - n.v &= voc + r0\cdot p.i \\
p.i + n.i &= 0 \\
qgen &= r0\cdot p.i^{2} \\
heat.t &= t \\
\text{der}\left(t\right) &= \frac{qgen + heat.qdot}{c_{th}} \\
\text{init}\left(t\right) &= t0 \\
\text{der}\left(soc\right) &= \frac{p.i}{3600\,q0} \\
\text{init}\left(soc\right) &= soc0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
BatteryTransient B(Voc=400, R0=0.1, Q0=100, C_th=50000, SOC0=0.9, T0=298)
Resistor      MOT(R=3.9)
Ground        G()
Conduction    PLATE(k=10, area=1, L=0.1)
ThermalSource COOL(T=298)
connect(B.p, MOT.a)
connect(B.n, MOT.b, G.port)
connect(B.heat, PLATE.a)
connect(PLATE.b, COOL.port)
DYNAMIC drive(method = ode23s, time = 0 .. 600, points = 100)
END
Tf   = FinalValue('b.t')
SOCf = FinalValue('b.soc')

{ CHECK SOCf 0.7333333333 7.333333333333295e-7 }
{ CHECK Tf 304.9880788 0.0003049880788270889 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
SOCf = 0.7333333333
Tf = 304.9880788
```

<!-- verified-reference-example:end -->
