---
name: LoadSensingPump
category: Component (hydraulic)
summary: "Load-sensing pump: the displacement fraction integrates the compensator error (LS pressure + margin vs outlet), soft-clamped to 0..1 by a logistic; delivery is the effective displacement at the drive speed."
related: []
examples: []
tags: [loadsensingpump, component, hydraulic, acausal]
references: []
---

# LoadSensingPump

Load-sensing pump: the displacement fraction integrates the compensator error (LS pressure + margin vs outlet), soft-clamped to 0..1 by a logistic; delivery is the effective displacement at the drive speed.

Reusable acausal **hydraulic-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/hydraulic.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

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
HydraulicSupply  RES(h1, P=100000 [Pa])
LoadSensingPump  PMP(h1, h2, hls, rho=870 [kg/m^3], Dv=6e-5 [m], w_p=150 [m^2/s], dP_margin=2000000 [Pa], tau=0.05 [s], d0=0.5)
HydraulicOrifice MTR(h2, h3, CdA=2e-6 [m^2], rho=870 [kg/m^3])
HydraulicTank    LOAD(h3, P=6000000 [Pa])
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
