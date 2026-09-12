---
name: GasMixerN
category: Component (pneumatic)
summary: Acausal pneumatic-domain component GasMixerN with ports in1, in2, out.
related: []
examples: []
tags: [gasmixern, component, pneumatic, acausal]
references: []
generated: true
---

# GasMixerN

Reusable acausal **pneumatic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
GasMixerN inst(domain$)
```

## Ports

`in1`, `in2`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.p &= in1.p \\
out.mdot &= in1.mdot + in2.mdot \\
out.mdot\cdot out.h &= in1.mdot\cdot in1.h + in2.mdot\cdot in2.h \\
out.mdot\cdot out.yo2 &= in1.mdot\cdot in1.yo2 + in2.mdot\cdot in2.yo2 \\
out.mdot\cdot out.yco2 &= in1.mdot\cdot in1.yco2 + in2.mdot\cdot in2.yco2 \\
out.mdot\cdot out.yh2o &= in1.mdot\cdot in1.yh2o + in2.mdot\cdot in2.yh2o \\
out.mdot\cdot out.yn2 &= in1.mdot\cdot in1.yn2 + in2.mdot\cdot in2.yn2
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// yo2/yco2/yh2o/yn2 ride a node and are flow-weighted at GasMixerN.
GasMixerN MX(g1, g2, g3)
g1.P = 200000
g1.mdot = 1.0
g1.h = 300000
g1.yo2  = 0.21
g1.yco2 = 0.00
g1.yh2o = 0.01
g1.yn2  = 0.78
g2.P = 200000
g2.mdot = 3.0
g2.h = 400000
g2.yo2  = 0.05
g2.yco2 = 0.12
g2.yh2o = 0.09
g2.yn2  = 0.74
o2  = g3.yo2
co2 = g3.yco2
h2o = g3.yh2o
n2  = g3.yn2
m3  = g3.mdot

{ CHECK co2 0.09 9e-8 }
{ CHECK g3.h 375000 0.375 }
{ CHECK g3.mdot 4 0.000004 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
co2 = 0.09
g3.h = 375000
g3.mdot = 4
```

<!-- verified-reference-example:end -->
