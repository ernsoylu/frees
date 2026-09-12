---
name: RadiantPanel
category: Component (moistair)
summary: Acausal moistair-domain component RadiantPanel with ports zone, wall.
related: []
examples: []
tags: [radiantpanel, component, moistair, acausal]
references: []
generated: true
---

# RadiantPanel

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
RadiantPanel inst(A, C, n, eps_dT, W_room, P_room)
```

## Ports

`zone`, `wall`

## Parameters

| Parameter | Type |
| --- | --- |
| `A` | Number |
| `C` | Number |
| `n` | Number |
| `eps_dT` | Number |
| `W_room` | Number |
| `P_room` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
dt &= zone.t - wall.t \\
q_{flux} &= c\cdot dt\cdot \left(dt^{2} + eps_{dt}^{2}\right)^{\frac{n - 1}{2}} \\
q &= a\cdot q_{flux} \\
zone.qdot &= q \\
wall.qdot &= -q \\
t_{dp_room} &= \text{Dewpoint}\left(\mathrm{airh2o}, t=zone.t, p=p_{room}, w=w_{room}\right) \\
margin_{dp} &= wall.t - t_{dp_room}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rate a chilled ceiling panel

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
RadiantPanel C(A=10, C=8, n=1.1, eps_dT=0.1, W_room=0.008, P_room=101325)
C.zone.T = 298.15 [K]
C.wall.T = 289.15 [K]

{ CHECK c.dt 9 0.000009 }
{ CHECK c.margin_dp 5.363431323 0.000005363431323110944 }
{ CHECK c.q 896.9318128 0.0008969318127804764 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.dt = 9
c.margin_dp = 5.363431323
c.q = 896.9318128
```

<!-- verified-reference-example:end -->
