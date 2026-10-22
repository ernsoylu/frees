---
name: MoistAirDamper
category: Component (moistair)
summary: "Diverting damper: routes fraction u of the air to outa, the rest to outb (both riders carried)."
related: []
examples: []
tags: [moistairdamper, component, moistair, acausal]
references: []
---

# MoistAirDamper

Diverting damper: routes fraction u of the air to outa, the rest to outb (both riders carried).

Reusable acausal **moistair-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/moistair.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
MoistAirDamper inst(u, domain$)
```

## Ports

`in`, `outa`, `outb`

## Parameters

| Parameter | Type |
| --- | --- |
| `u` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
outa.p &= in.p \\
outb.p &= in.p \\
outa.h &= in.h \\
outb.h &= in.h \\
outa.w &= in.w \\
outb.w &= in.w \\
outa.mdot &= u\cdot in.mdot \\
outb.mdot &= \left(1 - u\right)\cdot in.mdot
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// A 3-way moist-air node: sum of dry-air mass flow zero and W equal on a split.
MoistAirSource SRC(a1, P = 101325 [Pa], T = 305 [K], W = 0.009, mdot = 2.0 [kg/s])
MoistAirDamper DMP(a1, a2, a3, u = 0.25)
MoistAirSink   S2(a2)
MoistAirSink   S3(a3)
w1 = a1.W
w2 = a2.W
w3 = a3.W
m2 = a2.mdot
m3 = a3.mdot

{ CHECK a1.h 55076.73995 0.05507673994870339 }
{ CHECK a1.mdot 2 0.000002 }
{ CHECK a1.p 101325 0.101325 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a1.h = 55076.73995
a1.mdot = 2
a1.p = 101325
```

<!-- verified-reference-example:end -->
