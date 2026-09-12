---
name: Engine
category: Component (powertrain)
summary: An internal-combustion engine acting as a torque source.
related: []
examples: [engine-map-2d, engine-cycle-wiebe]
tags: [engine, component, powertrain, acausal]
---

# Engine

An internal-combustion engine acting as a torque source.

## Domain

A reusable **acausal powertrain-domain** component — its rotational ports carry angular velocity `ω` and torque `τ`, with vehicle-level speed/force signals. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`shaft`

## Usage

```
Engine inst(Tmax, throttle, bf)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Tmax` | Number | Maximum temperature [K]. |
| `throttle` | Number | Throttle (0–1). |
| `bf` | Number | Friction coefficient. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
shaft.tau &= -\left(throttle\cdot tmax - bf\cdot shaft.w\right)
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

Instantiated in the verified example below:

[Run: engine-map-2d]
