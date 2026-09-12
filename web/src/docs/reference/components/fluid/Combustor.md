---
name: Combustor
category: Component (fluid)
summary: Acausal fluid-domain component Combustor with ports in, out.
related: []
examples: []
tags: [combustor, component, fluid, acausal]
references: []
generated: true
---

# Combustor

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Combustor inst(mdot_f, LHV, eta_b, dP)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `mdot_f` | Number |
| `LHV` | Number |
| `eta_b` | Number |
| `dP` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot + mdot_{f} \\
out.p &= in.p - dp \\
out.mdot\cdot out.h &= in.mdot\cdot in.h + eta_{b}\cdot mdot_{f}\cdot lhv
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Combustor: fuel mass addition at eta_b on the LHV with a rated pressure
// loss. Kerosene-like fuel (43 MJ/kg) at f = 0.02 into a 6 bar air stream.
Combustor CB(g1, g2, mdot_f = 0.02, LHV = 43e6, eta_b = 0.98, dP = 20000)

g1.P     = 600000
g1.h     = 550000
g1.mdot  = 1.0
h_out    = g2.h
p_out    = g2.P
mdot_out = g2.mdot

{ CHECK g2.h 1365490.196 1.3654901960784314 }
{ CHECK g2.mdot 1.02 0.00000102 }
{ CHECK g2.p 580000 0.58 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
g2.h = 1365490.196
g2.mdot = 1.02
g2.p = 580000
```

<!-- verified-reference-example:end -->
