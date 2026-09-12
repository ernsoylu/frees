---
name: ForceSource
category: Component (mechanical)
summary: A prescribed translational force.
related: []
examples: [damped-actuator-motion]
tags: [forcesource, component, mechanical, acausal]
---

# ForceSource

A prescribed translational force.

## Domain

A reusable **acausal mechanical-domain** component — its rotational ports carry angular velocity `ω` and torque `τ` (`Στ = 0`); translational ports carry velocity `v` and force `F` (`ΣF = 0`). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`a`, `b`

## Usage

```
ForceSource inst(F)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `F` | Number | Force [N]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
a.f &= -f \\
a.f + b.f &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// 3-way translational node via connect: vel equal, sum f = 0.
ForceSource FS(F = 100)
TransGround TG()
TransDamper D1(c = 5)
TransDamper D2(c = 15)
connect(FS.a, TG.port, D1.b, D2.b)
connect(FS.b, D1.a, D2.a)
vm = D1.a.vel
f1 = D1.a.f
f2 = D2.a.f
fs = FS.b.f

{ CHECK d1.a.f -25 0.000024999999999999998 }
{ CHECK d1.a.vel -5 0.0000049999999999999996 }
{ CHECK d1.b.f 25 0.000024999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
d1.a.f = -25
d1.a.vel = -5
d1.b.f = 25
```

<!-- verified-reference-example:end -->
