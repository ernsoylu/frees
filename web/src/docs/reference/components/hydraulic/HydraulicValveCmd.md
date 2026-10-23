---
name: HydraulicValveCmd
category: Component (hydraulic)
summary: "Signal-commanded proportional valve: spool command u.sig ∈ [0,1] scales the orifice CdA — the closed-loop counterpart of HydraulicValve."
related: []
examples: []
tags: [hydraulicvalvecmd, component, hydraulic, acausal]
references: []
---

# HydraulicValveCmd

Signal-commanded proportional valve: spool command u.sig ∈ [0,1] scales the orifice CdA — the closed-loop counterpart of HydraulicValve.

Reusable acausal **hydraulic-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/hydraulic.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HydraulicValveCmd inst(CdA_max, rho, domain$)
```

## Ports

`in`, `out`, `u`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `CdA_max` | Number | Fully open discharge coefficient times flow area [m^2]. |
| `rho` | Number | Oil density [kg/m^3]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
in.mdot\cdot \left|in.mdot\right| &= \left(u.sig\cdot cda_{max}\right)^{2}\cdot 2\cdot rho\cdot \left(in.p - out.p\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Signal-commanded proportional valve at 70% spool: square-law flow through
// u.sig * CdA_max between a 100 bar supply and a 1 bar tank.
// mdot = 0.7*3e-5 * sqrt(2*870*9.9e6) = 2.7566 kg/s.
SigConstant      CMD(k=0.7)
HydraulicSupply  SUP(P=10000000 [Pa])
HydraulicValveCmd VLV(CdA_max=3e-5 [m^2], rho=870 [kg/m^3])
HydraulicTank    TNK(P=100000 [Pa])
connect(SUP.out, VLV.in)
connect(VLV.out, TNK.port)
connect(CMD.out, VLV.u)
q_v = VLV.in.mdot

{ CHECK cmd.out.sig 0.7 7e-7 }
{ CHECK q_v 2.756205 0.0000027562049996326472 }
{ CHECK sup.out.h 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cmd.out.sig = 0.7
q_v = 2.756205 [kg/s]
sup.out.h = 0
```

<!-- verified-reference-example:end -->
