---
name: DCMotor
category: Component (electrical)
summary: A DC motor — an electrical-to-mechanical transducer (back-EMF and torque constants).
related: []
examples: []
tags: [dcmotor, component, electrical, acausal]
---

# DCMotor

A DC motor — an electrical-to-mechanical transducer (back-EMF and torque constants).

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`, `shaft`

## Usage

```
DCMotor inst(Kt, Ke, R)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Kt` | Number | Torque constant [N·m/A]. |
| `Ke` | Number | Back-EMF constant [V·s/rad]. |
| `R` | Number | Resistance [Ω]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
p.v - n.v &= r\cdot p.i + ke\cdot shaft.w \\
p.i + n.i &= 0 \\
shaft.tau &= -kt\cdot p.i
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
BatteryThermal   B(Voc=48, R0=0.1)
DCMotor          MOT(Kt=0.5, Ke=0.5, R=1)
RotationalDamper LOAD(c=0.1)
Ground           G()
MechGround       MG()
ThermalSource    COOL(T=300)
connect(B.p, MOT.p)
connect(B.n, MOT.n, G.port)
connect(MOT.shaft, LOAD.a)
connect(LOAD.b, MG.port)
connect(B.heat, COOL.port)

{ CHECK b.heat.qdot -17.77777778 0.00001777777777777778 }
{ CHECK b.heat.t 300 0.0003 }
{ CHECK b.n.i 13.33333333 0.000013333333333333333 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
b.heat.qdot = -17.77777778
b.heat.t = 300
b.n.i = 13.33333333
```

<!-- verified-reference-example:end -->
