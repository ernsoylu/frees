---
name: Cam
category: Component (mechanical)
summary: Acausal mechanical-domain component Cam with ports shaft, rod.
related: []
examples: []
tags: [cam, component, mechanical, acausal]
references: []
generated: true
---

# Cam

Reusable acausal **mechanical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Cam inst(prof$, theta0)
```

## Ports

`shaft`, `rod`

## Parameters

| Parameter | Type |
| --- | --- |
| `prof$` | String |
| `theta0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(theta\right) &= shaft.w \\
\text{init}\left(theta\right) &= theta0 \\
slope &= \text{dtable}\left(prof\$, theta\right) \\
lift &= \text{prof\$}\left(theta\right) \\
rod.vel &= slope\cdot shaft.w \\
shaft.tau &= slope\cdot rod.f
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Simulate a component transient and inspect its final state

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// Cam: a linear 5 mm/rad lift profile spun at 10 rad/s against a 100 N.s/m
// damped rod -> constant rod velocity slope*w = 0.05 m/s; theta integrates
// 0 -> 10 rad inside the table's 0..12 span. Inherently DYNAMIC (theta is
// free in a steady solve).
TABLE prof(th)
  0    0
  12   0.06
END
SpeedSource SS(w = 10)
MechGround  MG()
Cam         CAM(prof$ = prof, theta0 = 0)
TransDamper TD(c = 100)
TransGround TG()
connect(SS.a, CAM.shaft)
connect(SS.b, MG.port)
connect(CAM.rod, TD.a)
connect(TD.b, TG.port)

DYNAMIC spin (method = ode45, time = 0 .. 1, points = 6)
END

final_state = FinalValue('cam$theta')

{ CHECK final_state 10 0.000009999999999999975 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
final_state = 10
```

<!-- verified-reference-example:end -->
