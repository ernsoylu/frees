---
name: PMSM
category: Component (electrical)
summary: Acausal electrical-domain component PMSM with ports p, n, shaft.
related: []
examples: []
tags: [pmsm, component, electrical, acausal]
references: []
generated: true
---

# PMSM

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
PMSM inst(Rs, lambda_pm, poles)
```

## Ports

`p`, `n`, `shaft`

## Parameters

| Parameter | Type |
| --- | --- |
| `Rs` | Number |
| `lambda_pm` | Number |
| `poles` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
Kt        = 1.5 * poles * lambda_pm
p.V - n.V = Rs * p.I + Kt * shaft.w
p.I + n.I = 0
shaft.tau = -Kt * p.I
```

