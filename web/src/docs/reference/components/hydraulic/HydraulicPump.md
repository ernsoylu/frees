---
name: HydraulicPump
category: Component (hydraulic)
summary: A hydraulic pump delivering flow against pressure.
related: []
examples: []
tags: [hydraulicpump, component, hydraulic, acausal]
---

# HydraulicPump

A hydraulic pump delivering flow against pressure.

## Domain

A reusable **acausal hydraulic-domain** component — its oil-hydraulic ports carry pressure `P`, mass-flow `ṁ`, and enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`, `shaft`

## Usage

```
HydraulicPump inst(disp, rho, eta_v, eta_m, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `disp` | Number | Displacement volume [m³]. |
| `rho` | Number | Density [kg/m³]. |
| `eta_v` | Number | Volumetric efficiency (0–1). |
| `eta_m` | Number | Mechanical efficiency (0–1). |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
n_{rev} &= \frac{shaft.w}{2\,3.141592653589793} \\
out.mdot &= rho\cdot disp\cdot n_{rev}\cdot eta_{v} \\
in.mdot &= out.mdot \\
out.h &= in.h \\
shaft.tau &= \frac{-\frac{disp\cdot \left(out.p - in.p\right)}{2\,3.141592653589793}}{eta_{m}}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
HydraulicSupply  SUC(P=0)
SpeedSource      SS(w=100)
MechGround       G()
HydraulicPump    PMP(disp=1e-5, rho=850, eta_v=0.95, eta_m=0.9)
HydraulicOrifice ORI(CdA=1e-5, rho=850)
HydraulicTank    DIS(P=0)
connect(SUC.out, PMP.in)
connect(SS.a, PMP.shaft)
connect(SS.b, G.port)
connect(PMP.out, ORI.in)
connect(ORI.out, DIS.port)

{ CHECK dis.port.h 0 1e-8 }
{ CHECK dis.port.mdot 0.1285176165 1.2851761654670547e-7 }
{ CHECK dis.port.p 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
dis.port.h = 0
dis.port.mdot = 0.1285176165
dis.port.p = 0
```

<!-- verified-reference-example:end -->
