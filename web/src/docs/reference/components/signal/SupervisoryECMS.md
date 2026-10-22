---
name: SupervisoryECMS
category: Component (signal)
summary: "ECMS-lite torque-split supervisor: a C1 blend between engine-lean and motor-lean operation driven by battery SOC around its reference — an honest smooth surrogate for the argmin equivalence-cost rule (documented as such)."
related: []
examples: []
tags: [supervisoryecms, component, signal, acausal]
references: []
---

# SupervisoryECMS

ECMS-lite torque-split supervisor: a C1 blend between engine-lean and motor-lean operation driven by battery SOC around its reference — an honest smooth surrogate for the argmin equivalence-cost rule (documented as such).

dem is the total demand; mot + eng always reconstruct it exactly.

Reusable acausal **signal-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/signal.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

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

TABLE effm(w [rad/s] : tau = -100, 100) [-]
  0    0.9  0.9
  400  0.9  0.9
END
SpeedSource   SE(w=100 [rad/s])
MechGround    GE()
SpeedSource   SR(w=50 [rad/s])
MechGround    GR2()
SigConstant   Z1(k=0 [N-m])
SigConstant   Z2(k=0 [N-m])
VoltageSource BUS(E=350 [V])
Ground        GND()
ThermalSource COOL(T=300 [K])
HybridPowerSplit HPS(g=2, eff1$=effm, eff2$=effm, epsP=10 [W])
connect(SE.a, HPS.eng)
connect(SE.b, GE.port)
connect(SR.a, HPS.out)
connect(SR.b, GR2.port)
connect(BUS.p, HPS.p)
connect(BUS.n, HPS.n, GND.port)
connect(Z1.out, HPS.u1)
connect(Z2.out, HPS.u2)
connect(HPS.heat, COOL.port)
HPS.sun.tau = 0 [N-m]
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
