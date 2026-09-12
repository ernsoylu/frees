---
name: MeanValueEngine
category: Component (powertrain)
summary: A mean-value engine model (cycle-averaged torque and flows).
related: []
examples: []
tags: [meanvalueengine, component, powertrain, acausal]
---

# MeanValueEngine

A mean-value engine model (cycle-averaged torque and flows).

## Domain

A reusable **acausal powertrain-domain** component — its rotational ports carry angular velocity `ω` and torque `τ`, with vehicle-level speed/force signals. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`shaft`

## Usage

```
MeanValueEngine inst(throttle, Tpeak, w_peak, FMEP_a, FMEP_b)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `throttle` | Number | Throttle (0–1). |
| `Tpeak` | Number | Peak temperature [K]. |
| `w_peak` | Number | Peak frequency [rad/s]. |
| `FMEP_a` | Number | Friction-MEP constant [Pa]. |
| `FMEP_b` | Number | Friction-MEP slope coefficient. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
t_{wot} &= tpeak\cdot \left(1 - \left(\frac{shaft.w - w_{peak}}{w_{peak}}\right)^{2}\right) \\
t_{ind} &= throttle\cdot t_{wot} \\
t_{fric} &= fmep_{a} + fmep_{b}\cdot shaft.w \\
shaft.tau &= -\left(t_{ind} - t_{fric}\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
MeanValueEngine ENG(throttle=0.6, Tpeak=200, w_peak=400, FMEP_a=5, FMEP_b=0.01)
SpeedSource     SS(w=400)
MechGround      G()
connect(SS.a, ENG.shaft)
connect(SS.b, G.port)

{ CHECK eng.shaft.tau -111 0.000111 }
{ CHECK eng.shaft.w 400 0.00039999999999999996 }
{ CHECK eng.t_fric 9 0.000009 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
eng.shaft.tau = -111
eng.shaft.w = 400
eng.t_fric = 9
```

<!-- verified-reference-example:end -->
