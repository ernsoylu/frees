---
name: Lever
category: Component (mechanical)
summary: Acausal mechanical-domain component Lever with ports a, b.
related: []
examples: []
tags: [lever, component, mechanical, acausal]
references: []
generated: true
---

# Lever

Reusable acausal **mechanical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Lever inst(ratio)
```

## Ports

`a`, `b`

## Parameters

| Parameter | Type |
| --- | --- |
| `ratio` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
a.vel &= ratio\cdot b.vel \\
b.f &= -ratio\cdot a.f
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Ideal kinematic couplers, steady. Screw (lead 10 mm) at 10 rad/s drives a
// damper: v = lead/(2pi)*w = 0.0159155 m/s; power conserves exactly.
// Rack-pinion r=0.1 at 10 rad/s -> 1 m/s. Lever ratio 2 doubles speed and
// halves force. BeltDrive mirrors Transmission (ratio 2, eta 0.9).
// EXPECT sdx.rod.vel = 0.0159155 tol 1e-6
// EXPECT d_pow = 0 tol 1e-9
// EXPECT rp.rod.vel = 1 tol 1e-9
// EXPECT lv.a.vel = 2 tol 1e-9
// EXPECT bd.b.w = 25 tol 1e-9
// EXPECT brk.a.tau = 30 tol 0.01
// EXPECT ld2.a.w = 15 tol 0.01
SpeedSource SS1(w=10)
MechGround  MG1()
ScrewDrive  SDX(lead=0.01)
TransDamper TD1(c=100)
TransGround TG1()
connect(SS1.a, SDX.shaft)
connect(SS1.b, MG1.port)
connect(SDX.rod, TD1.a)
connect(TD1.b, TG1.port)
d_pow = SDX.shaft.tau * 10 + SDX.rod.f * SDX.rod.vel

SpeedSource SS2(w=10)
MechGround  MG2()
RackPinion  RP(r=0.1)
TransDamper TD2(c=100)
TransGround TG2()
connect(SS2.a, RP.shaft)
connect(SS2.b, MG2.port)
connect(RP.rod, TD2.a)
connect(TD2.b, TG2.port)

function [a, b] = VelSource(v)
port(a)
port(b)
  a.vel - b.vel = v
  a.f + b.f = 0
end
VelSource   VS(v=1)
TransGround TG3()
TransGround TG4()
Lever       LV(ratio=2)
TransDamper TD3(c=10)
connect(VS.a, LV.b)
connect(VS.b, TG3.port)
connect(LV.a, TD3.a)
connect(TD3.b, TG4.port)

SpeedSource SS3(w=50)
MechGround  MG3()
BeltDrive   BD(ratio=2, eta=0.9)
RotationalDamper LD(c=1)
MechGround  MG4()
connect(SS3.a, BD.a)
connect(SS3.b, MG3.port)
connect(BD.b, LD.a)
connect(LD.b, MG4.port)

SigConstant  UB(k=0.8)
TorqueSource TSB(T=30)
Brake        BRK(Tmax=50, eps=0.01)
RotationalDamper LD2(c=2)
MechGround   MGB1()
MechGround   MGB2()
connect(UB.out, BRK.u)
connect(TSB.a, BRK.a)
connect(TSB.b, MGB1.port)
connect(BRK.b, LD2.a)
connect(LD2.b, MGB2.port)

{ CHECK bd.a.tau 13.88888889 0.000013888888888888888 }
{ CHECK bd.a.w 50 0.000049999999999999996 }
{ CHECK bd.b.tau -25 0.000024999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
bd.a.tau = 13.88888889
bd.a.w = 50
bd.b.tau = -25
```

<!-- verified-reference-example:end -->
