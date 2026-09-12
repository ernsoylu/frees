---
name: PCMMass
category: Component (heat)
summary: Acausal heat-domain component PCMMass with ports port.
related: []
examples: []
tags: [pcmmass, component, heat, acausal]
references: []
generated: true
---

# PCMMass

Reusable acausal **heat-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
PCMMass inst(m, cp, L, Tm, dTm, T0)
```

## Ports

`port`

## Parameters

| Parameter | Type |
| --- | --- |
| `m` | Number |
| `cp` | Number |
| `L` | Number |
| `Tm` | Number |
| `dTm` | Number |
| `T0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
cpe &= cp + \frac{l}{dtm\cdot 1.7724539}\cdot e^{-\left(\frac{port.t - tm}{dtm}\right)^{2}} \\
\text{der}\left(port.t\right) &= \frac{port.qdot}{m\cdot cpe} \\
\text{init}\left(port.t\right) &= t0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Phase-change mass driven through its mushy zone by a 20 kW heater: 2 kg of
// paraffin-like PCM (cp = 2 kJ/kg.K, L = 200 kJ/kg, Tm = 331 K, dTm = 2 K)
// starting 2 K below the melt point. The latent Gaussian slows the ramp near
// Tm; 40 s at 20 kW supplies 800 kJ, enough to cross the zone.
HeatSource HTR(Q=20000)
PCMMass    PCM(m=2, cp=2000, L=200000, Tm=331, dTm=2, T0=329)
connect(HTR.port, PCM.port)
DYNAMIC melt(method = ode23s, time = 0 .. 40, points = 21)
END
T_end = FinalValue('pcm.port.t')

{ CHECK T_end 436.8458677 0.0004368458677283966 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
T_end = 436.8458677
```

<!-- verified-reference-example:end -->
