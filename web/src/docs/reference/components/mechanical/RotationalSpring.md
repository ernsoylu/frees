---
name: RotationalSpring
category: Component (mechanical)
summary: A torsional spring, τ = k·θ.
related: []
examples: []
tags: [rotationalspring, component, mechanical, acausal]
---

# RotationalSpring

A torsional spring, `τ = k·θ`.

## Domain

A reusable **acausal mechanical-domain** component — its rotational ports carry angular velocity `ω` and torque `τ` (`Στ = 0`); translational ports carry velocity `v` and force `F` (`ΣF = 0`). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`a`, `b`

## Usage

```
RotationalSpring inst(k, theta0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `k` | Number | Stiffness / conductivity. |
| `theta0` | Number | Initial angle [rad]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
\text{der}\left(theta\right) &= a.w - b.w \\
\text{init}\left(theta\right) &= theta0 \\
a.tau &= k\cdot theta \\
a.tau + b.tau &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// RotationalSpring steady: der(theta) -> 0 locks both ends (b grounded), and
// the 12 N.m source winds the 400 N.m/rad spring to theta = 0.03 rad.
// EXPECT th = 0.03 tol 1e-9
TorqueSource     TQ(T = 12)
RotationalSpring SP(k = 400, theta0 = 0)
MechGround       G1()
MechGround       G2()
connect(TQ.a, SP.a)
connect(TQ.b, G1.port)
connect(SP.b, G2.port)
th = SP.theta

{ CHECK g1.port.tau -12 0.000012 }
{ CHECK g1.port.w 0 1e-8 }
{ CHECK g2.port.tau 12 0.000012 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
g1.port.tau = -12
g1.port.w = 0
g2.port.tau = 12
```

<!-- verified-reference-example:end -->
