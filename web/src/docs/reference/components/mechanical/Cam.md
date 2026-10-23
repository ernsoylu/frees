---
name: Cam
category: Component (mechanical)
summary: "Cam: rotational-to-translational profile drive."
related: []
examples: []
tags: [cam, component, mechanical, acausal]
references: []
---

# Cam

Cam: rotational-to-translational profile drive.

The lift slope dl/dtheta comes analytically from the profile table (dtable), so follower velocity is exact and the reaction torque conserves power (tau*w = f*v virtual work).

Reusable acausal **mechanical-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/mechanical.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Cam inst(prof$, theta0)
```

## Ports

`shaft`, `rod`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `prof$` | String | Name of the lift table, cam angle in rad → lift in m. |
| `theta0` | Number | Initial cam angle [rad]. |

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
SpeedSource SS(w = 10 [rad/s])
MechGround  MG()
Cam         CAM(prof$ = prof, theta0 = 0)
TransDamper TD(c = 100 [kg/s])
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
