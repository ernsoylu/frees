---
name: DCDCConverter
category: Component (electrical)
summary: Acausal electrical-domain component DCDCConverter with ports in_p, in_n, out_p, out_n.
related: []
examples: []
tags: [dcdcconverter, component, electrical, acausal]
references: []
generated: true
---

# DCDCConverter

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
DCDCConverter inst(ratio, eta, epsP)
```

## Ports

`in_p`, `in_n`, `out_p`, `out_n`

## Parameters

| Parameter | Type |
| --- | --- |
| `ratio` | Number |
| `eta` | Number |
| `epsP` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out_{p.v} - out_{n.v} &= ratio\cdot \left(in_{p.v} - in_{n.v}\right) \\
in_{p.i} + in_{n.i} &= 0 \\
out_{p.i} + out_{n.i} &= 0 \\
pout &= \left(out_{p.v} - out_{n.v}\right)\cdot \left(0 - out_{p.i}\right) \\
s &= 0.5\,\left(1 + \tanh\left(\frac{pout}{epsp}\right)\right) \\
pin &= \frac{s\cdot pout}{eta} + \left(1 - s\right)\cdot pout\cdot eta \\
pin &= \left(in_{p.v} - in_{n.v}\right)\cdot in_{p.i}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// MotorMap at 100 rad/s, +50 N·m command, flat 0.9 map: P_mech = 5000 W,
// P_elec = 5555.56 W, bus current 13.889 A at 400 V, loss 555.56 W.
// The regen twin (-50 N·m) returns P_mech*eta = -4500 W.
// EXPECT pe1 = 5555.5556 tol 0.01
// EXPECT i1 = 13.888889 tol 1e-4
// EXPECT pe2 = -4500 tol 0.01
// InverterLoss at ~100 A: dV = (1+1)*tanh(100) + 1e-3*100 = 2.1 V, Q = 210 W.
// EXPECT il = 100 tol 1e-3
// EXPECT qiv = 210 tol 0.05
// DCDC 400 V -> 12 V into 1.2 ohm: Pout = 120 W, Pin = 133.333 W at eta 0.9,
// input current 0.33333 A.
// EXPECT iin = 0.333333 tol 1e-4
TABLE effm(w : tau = -100, 100)
  0     0.9   0.9
  200   0.9   0.9
END
VoltageSource BUS(E=400)
Ground        GB()
SigConstant   CMD1(k=50)
SpeedSource   SPD1(w=100)
MechGround    MG1()
ThermalSource TS1(T=300)
MotorMap      MOT1(eff$=effm, epsP=1)
connect(BUS.p, MOT1.p)
connect(BUS.n, MOT1.n, GB.port)
connect(CMD1.out, MOT1.u)
connect(SPD1.a, MOT1.shaft)
connect(SPD1.b, MG1.port)
connect(MOT1.heat, TS1.port)
pe1 = MOT1.Pe
i1  = MOT1.p.I
VoltageSource BUS2(E=400)
Ground        GB2()
SigConstant   CMD2(k=-50)
SpeedSource   SPD2(w=100)
MechGround    MG2()
ThermalSource TS2(T=300)
MotorMap      MOT2(eff$=effm, epsP=1)
connect(BUS2.p, MOT2.p)
connect(BUS2.n, MOT2.n, GB2.port)
connect(CMD2.out, MOT2.u)
connect(SPD2.a, MOT2.shaft)
connect(SPD2.b, MG2.port)
connect(MOT2.heat, TS2.port)
pe2 = MOT2.Pe

VoltageSource SRC(E=400)
Ground        GI()
InverterLoss  INV(V0=1, r=1e-3, Esw=0.02, fsw=10000, Iref=200, Vref=400, Vnom=400, epsI=1)
Resistor      RL(R=3.979)
ThermalSource TSI(T=300)
connect(SRC.p, INV.in_p)
connect(INV.out_p, RL.a)
connect(RL.b, SRC.n, GI.port)
connect(INV.heat, TSI.port)
il  = INV.in_p.I
qiv = INV.Q

VoltageSource HV(E=400)
Ground        GD()
DCDCConverter DC(ratio=0.03, eta=0.9, epsP=1)
Resistor      RLV(R=1.2)
connect(HV.p, DC.in_p)
connect(HV.n, DC.in_n, GD.port)
Ground        GD2()
connect(DC.out_p, RLV.a)
connect(RLV.b, DC.out_n, GD2.port)
iin = DC.in_p.I

{ CHECK bus.n.i 13.88888889 0.000013888888888888888 }
{ CHECK bus.n.v 0 1e-8 }
{ CHECK bus.p.i -13.88888889 0.000013888888888888888 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
bus.n.i = 13.88888889
bus.n.v = 0
bus.p.i = -13.88888889
```

<!-- verified-reference-example:end -->
