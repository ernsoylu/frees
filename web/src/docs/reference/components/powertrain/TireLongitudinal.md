---
name: TireLongitudinal
category: Component (powertrain)
summary: Acausal powertrain-domain component TireLongitudinal with ports wheel, veh.
related: []
examples: []
tags: [tirelongitudinal, component, powertrain, acausal]
references: []
generated: true
---

# TireLongitudinal

Reusable acausal **powertrain-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TireLongitudinal inst(r, Fz, B, C, D, epsv)
```

## Ports

`wheel`, `veh`

## Parameters

| Parameter | Type |
| --- | --- |
| `r` | Number |
| `Fz` | Number |
| `B` | Number |
| `C` | Number |
| `D` | Number |
| `epsv` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
v_{w} &= r\cdot wheel.w \\
slip &= \frac{v_{w} - veh.vel}{\left|veh.vel\right| + epsv} \\
fx &= fz\cdot d\cdot \sin\left(c\cdot \arctan\left(b\cdot slip\right)\right) \\
veh.f &= -fx \\
wheel.tau &= r\cdot fx
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// TirePacejka at E = 0 must equal TireLongitudinal exactly (twin variant);
// at E = -2 the hand-evaluated magic formula gives Fx = 3695.175 N for
// slip = (0.3*40 - 10)/(10 + 0.1) = 0.19802. Steady document: the drive-cycle
// sources read the reserved time global, pinned here.
// EXPECT d_fx = 0 tol 1e-9
// EXPECT fx_e = 3695.175 tol 0.01

time = 0
TABLE flat10(t)
  0    10
  100  10
END
SpeedSource       W1(w=40)
MechGround        WG1()
TirePacejka       TP0(r=0.3, Fz=4000, B=10, C=1.5, D=1, E=0, epsv=0.1)
DriveCycleSource  V1(map$=flat10)
connect(W1.a, TP0.wheel)
connect(W1.b, WG1.port)
connect(TP0.veh, V1.port)

SpeedSource       W2(w=40)
MechGround        WG2()
TireLongitudinal  TL(r=0.3, Fz=4000, B=10, C=1.5, D=1, epsv=0.1)
DriveCycleSource  V2(map$=flat10)
connect(W2.a, TL.wheel)
connect(W2.b, WG2.port)
connect(TL.veh, V2.port)
d_fx = TP0.Fx - TL.Fx

SpeedSource       W3(w=40)
MechGround        WG3()
TirePacejka       TPE(r=0.3, Fz=4000, B=10, C=1.5, D=1, E=-2, epsv=0.1)
DriveCycleSource  V3(map$=flat10)
connect(W3.a, TPE.wheel)
connect(TPE.veh, V3.port)
connect(W3.b, WG3.port)
fx_e = TPE.Fx

{ CHECK d_fx 0 1e-8 }
{ CHECK fx_e 3695.175263 0.003695175262998573 }
{ CHECK tl.fx 3985.916842 0.003985916841634444 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
d_fx = 0
fx_e = 3695.175263
tl.fx = 3985.916842
```

<!-- verified-reference-example:end -->
