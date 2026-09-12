---
name: Planetary
category: Component (mechanical)
summary: A planetary gearset relating sun, ring, and carrier speeds.
related: []
examples: []
tags: [planetary, component, mechanical, acausal]
---

# Planetary

A planetary gearset relating sun, ring, and carrier speeds.

## Domain

A reusable **acausal mechanical-domain** component — its rotational ports carry angular velocity `ω` and torque `τ` (`Στ = 0`); translational ports carry velocity `v` and force `F` (`ΣF = 0`). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`sun`, `ring`, `carrier`

## Usage

```
Planetary inst(g)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `g` | Number | Gravitational acceleration [m/s²]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
sun.w + g\cdot ring.w &= \left(1 + g\right)\cdot carrier.w \\
ring.tau &= g\cdot sun.tau \\
sun.tau + ring.tau + carrier.tau &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TorqueSource     TS(T=10)
Planetary        PG(g=2)
RotationalDamper LOAD(c=1)
MechGround       GR()
MechGround       GS()
MechGround       GL()
connect(TS.a, PG.sun)
connect(TS.b, GS.port)
connect(PG.ring, GR.port)
connect(PG.carrier, LOAD.a)
connect(LOAD.b, GL.port)

{ CHECK gl.port.tau 30 0.000029999999999999997 }
{ CHECK gl.port.w 0 1e-8 }
{ CHECK gr.port.tau -20 0.000019999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
gl.port.tau = 30
gl.port.w = 0
gr.port.tau = -20
```

<!-- verified-reference-example:end -->
