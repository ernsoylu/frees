---
name: Inertia
category: Component (mechanical)
summary: A rotational inertia, τ = J dω/dt.
related: []
examples: []
tags: [inertia, component, mechanical, acausal]
---

# Inertia

A rotational inertia, `τ = J dω/dt`.

## Domain

A reusable **acausal mechanical-domain** component — its rotational ports carry angular velocity `ω` and torque `τ` (`Στ = 0`); translational ports carry velocity `v` and force `F` (`ΣF = 0`). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`port`

## Usage

```
Inertia inst(J, w0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `J` | Number | Inertia [kg·m²]. |
| `w0` | Number | Natural frequency [rad/s]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
\text{der}\left(port.w\right) &= \frac{port.tau}{j} \\
\text{init}\left(port.w\right) &= w0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TorqueSource     TS(T=12)
Inertia          J(J=3, w0=0)
RotationalDamper D(c=0.6)
MechGround       G()
connect(TS.a, J.port, D.a)
connect(TS.b, D.b, G.port)

{ CHECK d.a.tau 12 0.000012 }
{ CHECK d.a.w 20 0.000019999999999999998 }
{ CHECK d.b.tau -12 0.000012 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
d.a.tau = 12
d.a.w = 20
d.b.tau = -12
```

<!-- verified-reference-example:end -->
