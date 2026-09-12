---
name: HydraulicVolume
category: Component (hydraulic)
summary: Acausal hydraulic-domain component HydraulicVolume with ports in, out.
related: []
examples: []
tags: [hydraulicvolume, component, hydraulic, acausal]
references: []
generated: true
---

# HydraulicVolume

Reusable acausal **hydraulic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HydraulicVolume inst(V, beta, rho, P0, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `V` | Number |
| `beta` | Number |
| `rho` | Number |
| `P0` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.p &= in.p \\
out.h &= in.h \\
\text{der}\left(in.p\right) &= \frac{beta}{v\cdot rho}\cdot \left(in.mdot - out.mdot\right) \\
\text{init}\left(in.p\right) &= p0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Bulk-modulus node between two equal orifices at steady state (der(P) -> 0
// so in.mdot = out.mdot): with matched CdA the node pressure sits at the
// midpoint (101e5 + 1e5)/2 = 51e5 Pa, and mdot = 1e-6*sqrt(2*870*50e5) = 0.09327 kg/s.
HydraulicSupply  SUP(P=10100000)
HydraulicOrifice OUP(CdA=1e-6, rho=870)
HydraulicVolume  VOL(V=0.002, beta=1.4e9, rho=870, P0=5100000)
HydraulicOrifice ODN(CdA=1e-6, rho=870)
HydraulicTank    TNK(P=100000)
connect(SUP.out, OUP.in)
connect(OUP.out, VOL.in)
connect(VOL.out, ODN.in)
connect(ODN.out, TNK.port)
p_node = VOL.in.P
q_thru = VOL.in.mdot

{ CHECK odn.in.h 0 1e-8 }
{ CHECK odn.in.mdot 0.09327379053 9.327379053088814e-8 }
{ CHECK odn.in.p 5100000 5.1 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
odn.in.h = 0
odn.in.mdot = 0.09327379053
odn.in.p = 5100000
```

<!-- verified-reference-example:end -->
