---
name: PCMMass
category: Component (heat)
summary: "Phase-change-material mass: latent heat L released over a Gaussian mushy zone of width dTm around the melt point (∫cp_eff dT = cp·ΔT + L exactly)."
related: []
examples: []
tags: [pcmmass, component, heat, acausal]
references: []
---

# PCMMass

Phase-change-material mass: latent heat L released over a Gaussian mushy zone of width dTm around the melt point (∫cp_eff dT = cp·ΔT + L exactly).

Reusable acausal **heat-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/heat.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
PCMMass inst(m, cp, L, Tm, dTm, T0)
```

## Ports

`port`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `m` | Number | Mass of phase-change material [kg]. |
| `cp` | Number | Sensible specific heat [J/kg-K]. |
| `L` | Number | Latent heat of fusion [J/kg]. |
| `Tm` | Number | Melting temperature [K]. |
| `dTm` | Number | Width of the mushy zone [K]. |
| `T0` | Number | Initial temperature [K]. |

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
HeatSource HTR(Q=20000 [W])
PCMMass    PCM(m=2 [kg], cp=2000 [J/kg-K], L=200000 [J/kg], Tm=331 [K], dTm=2 [K], T0=329 [K])
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
