---
name: MultiZoneWall
category: Component (heat)
summary: "Two-zone partition wall: surface films (h_a, h_b) into two face masses with U·A conduction between them."
related: []
examples: []
tags: [multizonewall, component, heat, acausal]
references: []
---

# MultiZoneWall

Two-zone partition wall: surface films (h_a, h_b) into two face masses with U·A conduction between them.

The ports are resistive — they READ the zone temperatures — so the wall composes directly with any temperature-setting zone (CabinZone, MassGen) without C-C adjacency.

Reusable acausal **heat-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/heat.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
MultiZoneWall inst(h_a, h_b, U, A, C1, C2, T10, T20)
```

## Ports

`a`, `b`

## Parameters

| Parameter | Type |
| --- | --- |
| `h_a` | Number |
| `h_b` | Number |
| `U` | Number |
| `A` | Number |
| `C1` | Number |
| `C2` | Number |
| `T10` | Number |
| `T20` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
qa &= h_{a}\cdot a\cdot \left(a.t - t1\right) \\
a.qdot &= qa \\
q &= u\cdot a\cdot \left(t1 - t2\right) \\
\text{der}\left(t1\right) &= \frac{qa - q}{c1} \\
\text{init}\left(t1\right) &= t10 \\
qb &= h_{b}\cdot a\cdot \left(t2 - b.t\right) \\
b.qdot &= -qb \\
\text{der}\left(t2\right) &= \frac{q - qb}{c2} \\
\text{init}\left(t2\right) &= t20
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Two-zone partition wall at steady state, zone temperatures read directly
// (the ports are resistive by design): films h_a = h_b = 8 W/m2K, U = 2.5,
// A = 12 m2. R_tot = 1/96 + 1/30 + 1/96 = 0.0541667 K/W,
// Q = (298.15 - 283.15)/R_tot = 276.92 W.
ThermalSource ZONEA(T=298.15 [K])
MultiZoneWall WALL(h_a=8 [W/m^2-K], h_b=8 [W/m^2-K], U=2.5 [W/m^2-K], A=12 [m^2], C1=200000 [J/K], C2=200000 [J/K], T10=296 [K], T20=288 [K])
ThermalSource ZONEB(T=283.15 [K])
connect(ZONEA.port, WALL.a)
connect(WALL.b, ZONEB.port)
q_zone  = WALL.qa
t_face1 = WALL.T1
t_face2 = WALL.T2

{ CHECK q_zone 276.9230769 0.0002769230769230798 }
{ CHECK t_face1 295.2653846 0.00029526538461538453 }
{ CHECK t_face2 286.0346154 0.00028603461538461534 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
q_zone = 276.9230769 [W]
t_face1 = 295.2653846 [K]
t_face2 = 286.0346154 [K]
```

<!-- verified-reference-example:end -->
