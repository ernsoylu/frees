---
name: GasMixer
category: Component (pneumatic)
summary: Acausal pneumatic-domain component GasMixer with ports in1, in2, out.
related: []
examples: []
tags: [gasmixer, component, pneumatic, acausal]
references: []
generated: true
---

# GasMixer

Reusable acausal **pneumatic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
GasMixer inst(param = value, ...)
```

## Ports

`in1`, `in2`, `out`

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
out.P    = in1.P
out.mdot = in1.mdot + in2.mdot
out.mdot * out.h = in1.mdot * in1.h + in2.mdot * in2.h
out.mdot * out.y = in1.mdot * in1.y + in2.mdot * in2.y
```

