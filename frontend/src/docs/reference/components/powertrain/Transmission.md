---
name: Transmission
category: Component (powertrain)
summary: Acausal powertrain-domain component Transmission with ports in, out.
related: []
examples: []
tags: [transmission, component, powertrain, acausal]
references: []
generated: true
---

# Transmission

Reusable acausal **powertrain-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Transmission inst(ratio, eta)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `ratio` | Number |
| `eta` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
in.w    = ratio * out.w
out.tau = -ratio * eta * in.tau
```

