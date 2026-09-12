---
name: SupervisoryECMS
category: Component (signal)
summary: Acausal signal-domain component SupervisoryECMS with ports soc, dem, eng, mot.
related: []
examples: []
tags: [supervisoryecms, component, signal, acausal]
references: []
generated: true
---

# SupervisoryECMS

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SupervisoryECMS inst(soc_ref, eps)
```

## Ports

`soc`, `dem`, `eng`, `mot`

## Parameters

| Parameter | Type |
| --- | --- |
| `soc_ref` | Number |
| `eps` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
s &= 0.5\,\left(1 + \tanh\left(\frac{soc.sig - soc_{ref}}{eps}\right)\right) \\
mot.sig &= s\cdot dem.sig \\
eng.sig &= \left(1 - s\right)\cdot dem.sig
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// HybridPowerSplit kinematics (Willis): with the carrier (engine) at 100 rad/s
// and the ring/output at 50, the sun (MG1) spins at (1+g)*100 - g*50 = 200
// for g = 2. Both machines idle (zero torque command) so the bus carries no
// power. SupervisoryECMS at SOC = reference splits demand exactly 50/50.
// EXPECT w_sun = 200 tol 1e-6
// EXPECT mot_cmd = 40 tol 1e-9
// EXPECT eng_cmd = 40 tol 1e-9

TABLE effm(w : tau = -100, 100)
  0    0.9  0.9
  400  0.9  0.9
END
SpeedSource   SE(w=100)
MechGround    GE()
SpeedSource   SR(w=50)
MechGround    GR2()
SigConstant   Z1(k=0)
SigConstant   Z2(k=0)
VoltageSource BUS(E=350)
Ground        GND()
ThermalSource COOL(T=300)
HybridPowerSplit HPS(g=2, eff1$=effm, eff2$=effm, epsP=10)
connect(SE.a, HPS.eng)
connect(SE.b, GE.port)
connect(SR.a, HPS.out)
connect(SR.b, GR2.port)
connect(BUS.p, HPS.p)
connect(BUS.n, HPS.n, GND.port)
connect(Z1.out, HPS.u1)
connect(Z2.out, HPS.u2)
connect(HPS.heat, COOL.port)
HPS.sun.tau = 0
w_sun = HPS.sun.w

SigConstant     SOC(k=0.6)
SigConstant     DEM(k=80)
SupervisoryECMS SUP(soc_ref=0.6, eps=0.05)
connect(SOC.out, SUP.soc)
connect(DEM.out, SUP.dem)
mot_cmd = SUP.mot.sig
eng_cmd = SUP.eng.sig

{ CHECK bus.n.i 0 1e-8 }
{ CHECK bus.n.v 0 1e-8 }
{ CHECK bus.p.i 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
bus.n.i = 0
bus.n.v = 0
bus.p.i = 0
```

<!-- verified-reference-example:end -->
