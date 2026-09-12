---
name: MoistAirDuct
category: Component (moistair)
summary: Acausal moistair-domain component MoistAirDuct with ports in, out.
related: []
examples: []
tags: [moistairduct, component, moistair, acausal]
references: []
generated: true
---

# MoistAirDuct

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
MoistAirDuct inst(L, D, rough, mu_a, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `L` | Number |
| `D` | Number |
| `rough` | Number |
| `mu_a` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.w &= in.w \\
out.h &= in.h \\
rho &= \frac{1}{\text{Volume}\left(\mathrm{airh2o}, h=in.h, p=in.p, w=in.w\right)} \\
a &= \frac{3.141592653589793}{4}\cdot d^{2} \\
v &= \frac{in.mdot\cdot \left(1 + in.w\right)}{rho\cdot a} \\
re_{d} &= \text{reynolds}\left(rho, v, d, mu_{a}\right) \\
f &= \text{friction\_factor}\left(re_{d}, \frac{rough}{d}\right) \\
out.p &= in.p - \frac{f\cdot \frac{l}{d}\cdot rho\cdot v^{2}}{2}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Humid-air supply duct: 10 m of 0.3 m round duct at 1 kg/s dry-air flow.
// Darcy friction on the total (moist) mass flow; composition and enthalpy
// pass through, only pressure drops.
MoistAirSource SUP(P=101325, T=293.15, W=0.008, mdot=1)
MoistAirDuct   DCT(L=10, D=0.3, rough=1e-4, mu_a=1.85e-5)
MoistAirSink   SNK()
connect(SUP.out, DCT.in)
connect(DCT.out, SNK.in)
dp_duct = 101325 - SNK.P
re_duct = DCT.Re_d

{ CHECK dct.a 0.07068583471 7.068583470577035e-8 }
{ CHECK dct.f 0.01763710135 1.7637101350600804e-8 }
{ CHECK dct.in.h 40414.42776 0.04041442776219719 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
dct.a = 0.07068583471
dct.f = 0.01763710135
dct.in.h = 40414.42776
```

<!-- verified-reference-example:end -->
