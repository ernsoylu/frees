---
name: Battery2RC
category: Component (electrical)
summary: Acausal electrical-domain component Battery2RC with ports p, n.
related: []
examples: []
tags: [battery2rc, component, electrical, acausal]
references: []
generated: true
---

# Battery2RC

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Battery2RC inst(Voc, R0, R1, C1, R2, C2, Vrc1_0, Vrc2_0)
```

## Ports

`p`, `n`

## Parameters

| Parameter | Type |
| --- | --- |
| `Voc` | Number |
| `R0` | Number |
| `R1` | Number |
| `C1` | Number |
| `R2` | Number |
| `C2` | Number |
| `Vrc1_0` | Number |
| `Vrc2_0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
p.V - n.V  = Voc + R0 * p.I - Vrc1 - Vrc2
der(Vrc1)  = -p.I / C1 - Vrc1 / (R1 * C1)
init(Vrc1) = Vrc1_0
der(Vrc2)  = -p.I / C2 - Vrc2 / (R2 * C2)
init(Vrc2) = Vrc2_0
p.I + n.I  = 0
```

