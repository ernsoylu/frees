---
name: PneumaticAtmosphere
category: Component (pneumatic)
summary: Acausal pneumatic-domain component PneumaticAtmosphere with ports port.
related: []
examples: []
tags: [pneumaticatmosphere, component, pneumatic, acausal]
references: []
generated: true
---

# PneumaticAtmosphere

Reusable acausal **pneumatic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
PneumaticAtmosphere inst(P, domain$)
```

## Ports

`port`

## Parameters

| Parameter | Type |
| --- | --- |
| `P` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
port.P = P
```

