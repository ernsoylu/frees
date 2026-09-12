---
name: Clutch
category: Component (mechanical)
summary: A friction clutch coupling/decoupling two rotational shafts.
related: []
examples: []
tags: [clutch, component, mechanical, acausal]
---

# Clutch

A friction clutch coupling/decoupling two rotational shafts.

## Domain

A reusable **acausal mechanical-domain** component — its rotational ports carry angular velocity `ω` and torque `τ` (`Στ = 0`); translational ports carry velocity `v` and force `F` (`ΣF = 0`). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`a`, `b`

## Usage

```
Clutch inst(Tmax, eng, eps)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Tmax` | Number | Maximum temperature [K]. |
| `eng` | Number | Engagement fraction (0–1). |
| `eps` | Number | Effectiveness / roughness. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
dw &= a.w - b.w \\
a.tau &= eng\cdot tmax\cdot \tanh\left(\frac{dw}{eps}\right) \\
a.tau + b.tau &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TorqueSource     TS(T=30)
Clutch           CL(Tmax=50, eng=1, eps=0.01)
RotationalDamper LOAD(c=2)
MechGround       GS()
MechGround       GL()
connect(TS.a, CL.a)
connect(TS.b, GS.port)
connect(CL.b, LOAD.a)
connect(LOAD.b, GL.port)

{ CHECK cl.a.tau 30 0.000029999999999999997 }
{ CHECK cl.a.w 15.00693147 0.000015006931471805598 }
{ CHECK cl.b.tau -30 0.000029999999999999997 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cl.a.tau = 30
cl.a.w = 15.00693147
cl.b.tau = -30
```

<!-- verified-reference-example:end -->
