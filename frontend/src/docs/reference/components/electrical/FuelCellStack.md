---
name: FuelCellStack
category: Component (electrical)
summary: Acausal electrical-domain component FuelCellStack with ports p, n, heat.
related: []
examples: []
tags: [fuelcellstack, component, electrical, acausal]
references: []
generated: true
---

# FuelCellStack

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
FuelCellStack inst(ncells, area, i0, ilim, Rohm, E0, alpha, Eth, T)
```

## Ports

`p`, `n`, `heat`

## Parameters

| Parameter | Type |
| --- | --- |
| `ncells` | Number |
| `area` | Number |
| `i0` | Number |
| `ilim` | Number |
| `Rohm` | Number |
| `E0` | Number |
| `alpha` | Number |
| `Eth` | Number |
| `T` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
I_cell    = -p.I
i         = I_cell / area
V_cell    = E0 - (8.314 * T / (alpha * 96485)) * ln(i / i0) - i * Rohm - (8.314 * T / (2 * 96485)) * ln(ilim / (ilim - i))
p.V - n.V = ncells * V_cell
p.I + n.I = 0
Q         = I_cell * ncells * (Eth - V_cell)
heat.Qdot = -Q
```

