---
name: Transmission
category: Component (powertrain)
summary: A gearbox/transmission imposing a ratio between engine and wheels.
related: []
examples: []
tags: [transmission, component, powertrain, acausal]
---

# Transmission

A gearbox/transmission imposing a ratio between engine and wheels.

## Domain

A reusable **acausal powertrain-domain** component — its rotational ports carry angular velocity `ω` and torque `τ`, with vehicle-level speed/force signals. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
Transmission inst(ratio, eta)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `ratio` | Number | Gear / split ratio. |
| `eta` | Number | Efficiency (0–1). |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
in.w &= ratio\cdot out.w \\
out.tau &= -ratio\cdot eta\cdot in.tau
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
SpeedSource      SS(w=200)
MechGround       G()
Transmission     TR(ratio=10, eta=0.9)
RotationalDamper LOAD(c=2)
MechGround       G2()
connect(SS.a, TR.in)
connect(SS.b, G.port)
connect(TR.out, LOAD.a)
connect(LOAD.b, G2.port)

{ CHECK g.port.tau -4.444444444 0.000004444444444444444 }
{ CHECK g.port.w 0 1e-8 }
{ CHECK g2.port.tau 40 0.000039999999999999996 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
g.port.tau = -4.444444444
g.port.w = 0
g2.port.tau = 40
```

<!-- verified-reference-example:end -->
