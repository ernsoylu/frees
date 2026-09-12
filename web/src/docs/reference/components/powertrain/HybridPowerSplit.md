---
name: HybridPowerSplit
category: Component (powertrain)
summary: Acausal powertrain-domain component HybridPowerSplit with ports eng, out, sun, p, n, u1, u2, heat.
related: []
examples: []
tags: [hybridpowersplit, component, powertrain, acausal]
references: []
generated: true
---

# HybridPowerSplit

Reusable acausal **powertrain-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HybridPowerSplit inst(g, eff1$, eff2$, epsP)
```

## Ports

`eng`, `out`, `sun`, `p`, `n`, `u1`, `u2`, `heat`

## Parameters

| Parameter | Type |
| --- | --- |
| `g` | Number |
| `eff1$` | String |
| `eff2$` | String |
| `epsP` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
Planetary PL(g=g)
MotorMap  MG1(eff$=eff1$, epsP=epsP)
MotorMap  MG2(eff$=eff2$, epsP=epsP)
connect(eng, PL.carrier)
connect(PL.sun, MG1.shaft, sun)
connect(PL.ring, MG2.shaft, out)
connect(MG1.p, MG2.p, p)
connect(MG1.n, MG2.n, n)
connect(MG1.u, u1)
connect(MG2.u, u2)
connect(MG1.heat, MG2.heat, heat)
```

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
