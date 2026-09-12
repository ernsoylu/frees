---
name: TransMass
category: Component (mechanical)
summary: A translational mass, F = m dv/dt.
related: []
examples: [damped-actuator-motion]
tags: [transmass, component, mechanical, acausal]
---

# TransMass

A translational mass, `F = m dv/dt`.

## Domain

A reusable **acausal mechanical-domain** component — its rotational ports carry angular velocity `ω` and torque `τ` (`Στ = 0`); translational ports carry velocity `v` and force `F` (`ΣF = 0`). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`port`

## Usage

```
TransMass inst(m, v0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `m` | Number | Mass [kg]. |
| `v0` | Number | Initial velocity [m/s]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
\text{der}\left(port.vel\right) &= \frac{port.f}{m} \\
\text{init}\left(port.vel\right) &= v0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
ForceSource FS(F=10)
TransMass   M(m=2, v0=0)
TransDamper D(c=0.5)
TransGround GS()
TransGround GD()
connect(FS.a, M.port, D.a)
connect(FS.b, GS.port)
connect(D.b, GD.port)
DYNAMIC accel(method = ode45, time = 0 .. 40, points = 100)
END
v_final = FinalValue('m.port.vel')
v_start = MinValue('m.port.vel')

{ CHECK v_final 19.999092 0.000019999092001375135 }
{ CHECK v_start 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
v_final = 19.999092
v_start = 0
```

<!-- verified-reference-example:end -->
