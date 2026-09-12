---
name: Gear
category: Component (mechanical)
summary: A gear pair imposing a fixed speed/torque ratio between two shafts.
related: []
examples: [reduction-gear-viscous-load]
tags: [gear, component, mechanical, acausal]
---

# Gear

A gear pair imposing a fixed speed/torque ratio between two shafts.

## Domain

A reusable **acausal mechanical-domain** component — its rotational ports carry angular velocity `ω` and torque `τ` (`Στ = 0`); translational ports carry velocity `v` and force `F` (`ΣF = 0`). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
Gear inst(ratio)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `ratio` | Number | Gear / split ratio. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
in.w &= ratio\cdot out.w \\
out.tau &= -ratio\cdot in.tau
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TorqueSource     TS(T=10)
Gear             G(ratio=2)
RotationalDamper D(c=0.5)
MechGround       M1()
MechGround       M2()
connect(TS.a, G.in)
connect(TS.b, M1.port)
connect(G.out, D.a)
connect(D.b, M2.port)

{ CHECK d.a.tau 20 0.000019999999999999998 }
{ CHECK d.a.w 40 0.000039999999999999996 }
{ CHECK d.b.tau -20 0.000019999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
d.a.tau = 20
d.a.w = 40
d.b.tau = -20
```

<!-- verified-reference-example:end -->
