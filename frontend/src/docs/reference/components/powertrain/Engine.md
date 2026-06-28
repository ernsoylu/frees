---
name: Engine
category: Component (powertrain)
summary: Acausal powertrain-domain component Engine with ports shaft.
related: []
examples: [engine-cycle-wiebe]
tags: [engine, component, powertrain, acausal]
references: []
generated: true
---

# Engine

Reusable acausal **powertrain-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Engine inst(Tmax, throttle, bf)
```

## Ports

`shaft`

## Parameters

| Parameter | Type |
| --- | --- |
| `Tmax` | Number |
| `throttle` | Number |
| `bf` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
shaft.tau = -(throttle * Tmax - bf * shaft.w)
```

