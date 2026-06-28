---
name: MeanValueEngine
category: Component (powertrain)
summary: A mean-value engine model (cycle-averaged torque and flows).
related: []
examples: []
tags: [meanvalueengine, component, powertrain, acausal]
references:
  - "Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems (5th ed.) — acausal/bond-graph formalism"
  - "Guzzella, L. & Sciarretta, A., Vehicle Propulsion Systems (3rd ed.)"
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

| Parameter | Type |
| --- | --- |
| `throttle` | Number |
| `Tpeak` | Number |
| `w_peak` | Number |
| `FMEP_a` | Number |
| `FMEP_b` | Number |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
T_wot     = Tpeak * (1 - ((shaft.w - w_peak) / w_peak)^2)
T_ind     = throttle * T_wot
T_fric    = FMEP_a + FMEP_b * shaft.w
shaft.tau = -(T_ind - T_fric)
```

## References

1. Karnopp, D.C., Margolis, D.L. & Rosenberg, R.C., *System Dynamics: Modeling, Simulation, and Control of Mechatronic Systems* (5th ed.) — acausal/bond-graph formalism.
2. Guzzella, L. & Sciarretta, A., *Vehicle Propulsion Systems* (3rd ed.).
