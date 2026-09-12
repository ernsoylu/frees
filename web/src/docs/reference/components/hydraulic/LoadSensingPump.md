---
name: LoadSensingPump
category: Component (hydraulic)
summary: Acausal hydraulic-domain component LoadSensingPump with ports in, out, ls.
related: []
examples: []
tags: [loadsensingpump, component, hydraulic, acausal]
references: []
generated: true
---

# LoadSensingPump

Reusable acausal **hydraulic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
LoadSensingPump inst(rho, Dv, w_p, dP_margin, tau, d0, domain$)
```

## Ports

`in`, `out`, `ls`

## Parameters

| Parameter | Type |
| --- | --- |
| `rho` | Number |
| `Dv` | Number |
| `w_p` | Number |
| `dP_margin` | Number |
| `tau` | Number |
| `d0` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(dfrac\right) &= \frac{ls.p + dp_{margin} - out.p}{tau\cdot dp_{margin}} \\
\text{init}\left(dfrac\right) &= d0 \\
deff &= \frac{1}{1 + e^{-8\cdot \left(dfrac - 0.5\right)}} \\
out.mdot &= \frac{deff\cdot rho\cdot dv\cdot w_{p}}{2\,3.141592653589793} \\
in.mdot &= out.mdot \\
out.h &= in.h \\
ls.mdot &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Load-sensing pump feeding a metering orifice into a 60 bar load: the
// compensator settles (der(dfrac) -> 0) exactly when out.P = ls.P + dP_margin,
// holding 20 bar across the orifice regardless of the load.
// mdot = 2e-6*sqrt(2*870*2e6) = 0.11798 kg/s.
HydraulicSupply  RES(h1, P=100000)
LoadSensingPump  PMP(h1, h2, hls, rho=870, Dv=6e-5, w_p=150, dP_margin=2000000, tau=0.05, d0=0.5)
HydraulicOrifice MTR(h2, h3, CdA=2e-6, rho=870)
HydraulicTank    LOAD(h3, P=6000000)
hls.P = 6000000
p_pump  = PMP.out.P
q_pump  = PMP.out.mdot
d_frac  = PMP.dfrac

{ CHECK d_frac 0.2177702636 2.1777026355584719e-7 }
{ CHECK h1.h 0 1e-8 }
{ CHECK h1.mdot 0.1179830496 1.1798304963002101e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
d_frac = 0.2177702636
h1.h = 0
h1.mdot = 0.1179830496
```

<!-- verified-reference-example:end -->
