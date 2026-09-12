---
name: RotationalDamper
category: Component (mechanical)
summary: A rotational viscous damper, τ = c·ω.
related: []
examples: [reduction-gear-viscous-load]
tags: [rotationaldamper, component, mechanical, acausal]
---

# RotationalDamper

A rotational viscous damper, `τ = c·ω`.

## Domain

A reusable **acausal mechanical-domain** component — its rotational ports carry angular velocity `ω` and torque `τ` (`Στ = 0`); translational ports carry velocity `v` and force `F` (`ΣF = 0`). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`a`, `b`

## Usage

```
RotationalDamper inst(c)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `c` | Number | Damping / specific-heat coefficient. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
a.tau &= c\cdot \left(a.w - b.w\right) \\
a.tau + b.tau &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TorqueSource     TS(T=10)
RotationalDamper D(c=0.5)
MechGround       G()
connect(TS.a, D.a)
connect(TS.b, D.b, G.port)

{ CHECK d.a.tau 10 0.000009999999999999999 }
{ CHECK d.a.w 20 0.000019999999999999998 }
{ CHECK d.b.tau -10 0.000009999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
d.a.tau = 10
d.a.w = 20
d.b.tau = -10
```

<!-- verified-reference-example:end -->
