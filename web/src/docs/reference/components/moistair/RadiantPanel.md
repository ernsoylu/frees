---
name: RadiantPanel
category: Component (moistair)
summary: Radiant panel or chilled ceiling.
related: []
examples: []
tags: [radiantpanel, component, moistair, acausal]
references: []
---

# RadiantPanel

Radiant panel or chilled ceiling.

It conditions a space without moving any air at all, so it has no airstream: it couples the zone node to the water node and nothing else. That is precisely why it appears on a psychrometric design as a LOAD SHIFT rather than as a process vector — sensible load it removes is load the air system no longer has to carry, which is what lets the supply airflow drop to the ventilation minimum.  Capacity follows the ASHRAE panel characteristic q = C*dT*|dT|^(n-1) W/m^2 (Handbook—Systems Ch. 6, Eq. 18), signed so the same panel heats and cools through one equation, and regularised at dT = 0 the way `Infiltration` regularises its own odd power law. n = 1.1 for ceiling cooling and floor heating, n = 1.0 for ceiling heating and floor cooling.  SENSIBLE ONLY, with no drain anywhere: `margin_dp` against the design room state is not a diagnostic here but the sizing constraint. A chilled ceiling below the room dew point rains on the occupants.

Reusable acausal **moistair-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
RadiantPanel inst(A, C, n, eps_dT, W_room, P_room)
```

## Ports

`zone`, `wall`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | Number | Panel area [m^2]. |
| `C` | Number | Panel output coefficient [W/m^2-K]. |
| `n` | Number | Output exponent on the temperature difference [-]. |
| `eps_dT` | Number | Regularization of the temperature difference near zero [K]. |
| `W_room` | Number | Room humidity ratio, for the dew-point margin [-]. |
| `P_room` | Number | Room pressure, for the dew-point margin [Pa]. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
dt &= zone.t - wall.t \\
q_{flux} &= c\cdot dt\cdot \left(\frac{dt^{2} + eps_{dt}^{2}}{1\,\left[K^2\right]}\right)^{\frac{n - 1}{2}} \\
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
RadiantPanel C(A=10 [m^2], C=8 [W/m^2-K], n=1.1, eps_dT=0.1 [K], W_room=0.008, P_room=101325 [Pa])
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
