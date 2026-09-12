---
name: LiquidExpansionTank
category: Component (liquid)
summary: Acausal liquid-domain component LiquidExpansionTank with ports port.
related: []
examples: []
tags: [liquidexpansiontank, component, liquid, acausal]
references: []
generated: true
---

# LiquidExpansionTank

Reusable acausal **liquid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
LiquidExpansionTank inst(P, domain$)
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

$$
\begin{aligned}
port.p &= p
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// LiquidExpansionTank pinning the loop pressure datum at a heater inlet;
// the boundary supplies flow and enthalpy, the tank supplies P.
LiquidExpansionTank ET(t1, P = 150000)
LiquidColdPlate     HTR(t1, t2, Q = 3000)
LiquidSink          SK(t2)

t1.mdot = 0.25
t1.h    = 112000
p_ref   = SK.P
h_out   = SK.h

{ CHECK h_out 124000 0.124 }
{ CHECK p_ref 150000 0.15 }
{ CHECK sk.h 124000 0.124 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
h_out = 124000 [J/kg]
p_ref = 150000 [Pa]
sk.h = 124000
```

<!-- verified-reference-example:end -->
