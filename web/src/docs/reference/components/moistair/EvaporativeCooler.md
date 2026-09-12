---
name: EvaporativeCooler
category: Component (moistair)
summary: Acausal moistair-domain component EvaporativeCooler with ports in, out.
related: []
examples: []
tags: [evaporativecooler, component, moistair, acausal]
references: []
generated: true
---

# EvaporativeCooler

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
EvaporativeCooler inst(eff, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `eff` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
out.h &= in.h \\
w_{sat} &= \text{Humrat}\left(\mathrm{airh2o}, h=in.h, p=in.p, r=1\right) \\
out.w &= in.w + eff\cdot \left(w_{sat} - in.w\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Adiabatic (swamp) cooler on hot dry air: 308.15 K, W = 0.008, effectiveness
// 0.85 toward the adiabatic-saturation state. Constant enthalpy; the outlet
// humidity moves 85% of the way to W_sat(h, P).
MoistAirSource OA(P=101325, T=308.15, W=0.008, mdot=1)
EvaporativeCooler EC(eff=0.85)
MoistAirSink   SNK()
connect(OA.out, EC.in)
connect(EC.out, SNK.in)
w_out = SNK.W
t_out = Temperature(AirH2O, h=SNK.h, P=SNK.P, W=SNK.W)
dw    = SNK.W - 0.008

{ CHECK dw 0.005322579609 1e-8 }
{ CHECK ec.in.h 55736.06978 0.05573606978493948 }
{ CHECK ec.in.mdot 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
dw = 0.005322579609
ec.in.h = 55736.06978
ec.in.mdot = 1
```

<!-- verified-reference-example:end -->
