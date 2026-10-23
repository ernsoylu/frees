---
name: LiquidExpansionTank
category: Component (liquid)
summary: "Expansion tank / degas bottle: pins the loop pressure datum — the one pressure reference every CLOSED coolant loop needs."
related: []
examples: []
tags: [liquidexpansiontank, component, liquid, acausal]
references: []
---

# LiquidExpansionTank

Expansion tank / degas bottle: pins the loop pressure datum — the one pressure reference every CLOSED coolant loop needs.

Reusable acausal **liquid-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/liquid.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
LiquidExpansionTank inst(P, domain$)
```

## Ports

`port`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `P` | Number | Pressure the tank holds at its port [Pa]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

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
LiquidExpansionTank ET(t1, P = 150000 [Pa])
LiquidColdPlate     HTR(t1, t2, Q = 3000 [W])
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
