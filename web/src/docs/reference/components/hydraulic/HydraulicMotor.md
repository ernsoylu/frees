---
name: HydraulicMotor
category: Component (hydraulic)
summary: Acausal hydraulic-domain component HydraulicMotor with ports in, out, shaft.
related: []
examples: []
tags: [hydraulicmotor, component, hydraulic, acausal]
references: []
generated: true
---

# HydraulicMotor

Reusable acausal **hydraulic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HydraulicMotor inst(disp, rho, eta_v, eta_m, domain$)
```

## Ports

`in`, `out`, `shaft`

## Parameters

| Parameter | Type |
| --- | --- |
| `disp` | Number |
| `rho` | Number |
| `eta_v` | Number |
| `eta_m` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
n_{rev} &= \frac{shaft.w}{2\,3.141592653589793} \\
in.mdot &= \frac{rho\cdot disp\cdot n_{rev}}{eta_{v}} \\
out.mdot &= in.mdot \\
out.h &= in.h \\
shaft.tau &= -\frac{disp\cdot \left(in.p - out.p\right)}{2\,3.141592653589793}\cdot eta_{m}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Motor at 100 rad/s between 200 bar and 1 bar: flow = rho*disp*n/eta_v =
// 0.1424018 kg/s; torque = -disp*dP*eta_m/(2pi) = -28.5047 N·m.
// EXPECT d_mm = 0 tol 1e-8
// EXPECT d_mt = 0 tol 1e-6
HydraulicSupply SM(P=20000000)
HydraulicMotor  HM(disp=1e-5, rho=850, eta_v=0.95, eta_m=0.9)
HydraulicTank   TM(P=100000)
SpeedSource     WS(w=100)
MechGround      MG()
connect(SM.out, HM.in)
connect(HM.out, TM.port)
connect(WS.a, HM.shaft)
connect(WS.b, MG.port)
d_mm = HM.in.mdot - 0.1424017912
d_mt = HM.shaft.tau - (-28.5046503)

{ CHECK d_mm 0 1e-8 }
{ CHECK d_mt -7.758458764e-9 1e-8 }
{ CHECK hm.in.h 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
d_mm = 0 [kg/s]
d_mt = -7.758458764e-9 [J]
hm.in.h = 0
```

<!-- verified-reference-example:end -->
