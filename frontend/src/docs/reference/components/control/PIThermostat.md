---
name: PIThermostat
category: Component (control)
summary: A proportional–integral thermostat controller driving an actuator to a setpoint.
related: []
examples: []
tags: [pithermostat, component, control, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, N.S., a standard controls text (7th ed.)"
---

# PIThermostat

A proportional–integral thermostat controller driving an actuator to a setpoint.

## Domain

A reusable **acausal control-domain** component — its signal ports carry the measured and commanded scalar values. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`port`

## Usage

```
PIThermostat inst(Kp, Ki, Tref)
```

## Parameters

| Parameter | Type |
| --- | --- |
| `Kp` | Number |
| `Ki` | Number |
| `Tref` | Number |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
err         = Tref - port.T
der(integ)  = err
init(integ) = 0
port.Qdot   = -(Kp * err + Ki * integ)
```

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, N.S., *a standard controls text* (7th ed.).
