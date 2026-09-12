---
name: AtmosphereSource
category: Component (fluid)
summary: Acausal fluid-domain component AtmosphereSource with ports out.
related: []
examples: []
tags: [atmospheresource, component, fluid, acausal]
references: []
generated: true
---

# AtmosphereSource

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
AtmosphereSource inst(alt, mdot)
```

## Ports

`out`

## Parameters

| Parameter | Type |
| --- | --- |
| `alt` | Number |
| `mdot` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= mdot \\
out.p &= \text{isa\_p}\left(alt\right) \\
out.h &= \text{Enthalpy}\left(\mathrm{air}, p=\text{isa\_p}\left(alt\right), t=\text{isa\_t}\left(alt\right)\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// AtmosphereSource: the ISA 1976 state at 5 km as a flow boundary —
// P = isa_P(5000) ~ 54 kPa, h = Enthalpy(Air) at the ISA temperature.
AtmosphereSource ATM(a1, alt = 5000, mdot = 1.0)
Sink             SK(a1)

p_amb = SK.P
h_amb = SK.h
m     = SK.mdot

{ CHECK a1.h 381836.7045 0.3818367045459697 }
{ CHECK a1.mdot 1 0.000001 }
{ CHECK a1.p 54020.4954 0.05402049540145998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a1.h = 381836.7045
a1.mdot = 1
a1.p = 54020.4954
```

<!-- verified-reference-example:end -->
