---
name: Friction
category: Component (mechanical)
summary: A friction element opposing motion.
related: []
examples: []
tags: [friction, component, mechanical, acausal]
---

# Friction

A friction element opposing motion.

## Domain

A reusable **acausal mechanical-domain** component — its rotational ports carry angular velocity `ω` and torque `τ` (`Στ = 0`); translational ports carry velocity `v` and force `F` (`ΣF = 0`). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`a`, `b`

## Usage

```
Friction inst(Fc, Fs, vs, bv, eps)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Fc` | Number | Coulomb (kinetic) friction torque [N·m]. |
| `Fs` | Number | Static (breakaway) friction torque [N·m]. |
| `vs` | Number | Stribeck speed [rad/s]. |
| `bv` | Number | Viscous friction coefficient [N·m·s]. |
| `eps` | Number | Stick–slip smoothing speed [rad/s] — regularizes the sign of the slip speed. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
dw &= a.w - b.w \\
a.tau &= \left(fc + \left(fs - fc\right)\cdot e^{-\left(\frac{dw}{vs}\right)^{2}}\right)\cdot \tanh\left(\frac{dw}{eps}\right) + bv\cdot dw \\
a.tau + b.tau &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TorqueSource TS(T=5 [N-m])
Friction     FR(Fc=2 [N-m], Fs=3 [N-m], vs=1 [rad/s], bv=0.5 [N-m-s], eps=0.01 [rad/s])
MechGround   G()
connect(TS.a, FR.a)
connect(TS.b, FR.b, G.port)

{ CHECK fr.a.tau 5 0.0000049999999999999996 }
{ CHECK fr.a.w 6 0.0000059999999999999985 }
{ CHECK fr.b.tau -5 0.0000049999999999999996 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
fr.a.tau = 5
fr.a.w = 6
fr.b.tau = -5
```

<!-- verified-reference-example:end -->
