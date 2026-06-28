---
name: PIThermostat
category: Component (control)
summary: Acausal control-domain component PIThermostat with ports port.
related: []
examples: []
tags: [pithermostat, component, control, acausal]
references: []
generated: true
---

# PIThermostat

Reusable acausal **control-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
PIThermostat inst(Kp, Ki, Tref)
```

## Ports

`port`

## Parameters

| Parameter | Type |
| --- | --- |
| `Kp` | Number |
| `Ki` | Number |
| `Tref` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
err         = Tref - port.T
der(integ)  = err
init(integ) = 0
port.Qdot   = -(Kp * err + Ki * integ)
```

