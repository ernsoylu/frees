---
name: RoadLoad
category: Component (powertrain)
summary: A vehicle road load (aerodynamic drag + rolling resistance).
related: []
examples: []
tags: [roadload, component, powertrain, acausal]
---

# RoadLoad

A vehicle road load (aerodynamic drag + rolling resistance).

## Domain

A reusable **acausal powertrain-domain** component — its rotational ports carry angular velocity `ω` and torque `τ`, with vehicle-level speed/force signals. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`shaft`

## Usage

```
RoadLoad inst(Crr, Caero)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Crr` | Number | Rolling-resistance coefficient. |
| `Caero` | Number | Aerodynamic drag term ½ρCdA [kg/m]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
shaft.tau &= crr + caero\cdot shaft.w^{2}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
Engine   ENG(Tmax=200, throttle=0.5, bf=0.1)
RoadLoad RL(Crr=10, Caero=0.01)
connect(ENG.shaft, RL.shaft)

{ CHECK eng.shaft.tau -91 0.00009099999999999999 }
{ CHECK eng.shaft.w 90 0.00008999999999999999 }
{ CHECK rl.shaft.tau 91 0.00009099999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
eng.shaft.tau = -91
eng.shaft.w = 90
rl.shaft.tau = 91
```

<!-- verified-reference-example:end -->
