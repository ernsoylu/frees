---
name: GearboxScheduled
category: Component (powertrain)
summary: Acausal powertrain-domain component GearboxScheduled with ports in, out, u.
related: []
examples: []
tags: [gearboxscheduled, component, powertrain, acausal]
references: []
generated: true
---

# GearboxScheduled

Reusable acausal **powertrain-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
GearboxScheduled inst(eta)
```

## Ports

`in`, `out`, `u`

## Parameters

| Parameter | Type |
| --- | --- |
| `eta` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
in.w &= u.sig\cdot out.w \\
out.tau &= -u.sig\cdot eta\cdot in.tau
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// GearboxScheduled: ratio 3 from a signal, eta 0.9. Output held at 10 rad/s
// -> input spins at 30; 5 N·m fed into the input delivers 3*0.9*5 = 13.5 N·m
// at the output (sign: torque delivered TO the output node).
// EXPECT gb.in.w = 30 tol 1e-9
// EXPECT tq_out = -13.5 tol 1e-9
// MeanValueEngine twin-variant invariance: chenflynn with FMEP_c = 0 must
// reproduce parabolic exactly; the bsfc rung's fuel flow is bsfc*P_b by hand:
// tau_b = 0.5*200 - 10 = 90, P_b = 90*100 = 9000 W, mdot_f = 6e-8*9000.
// EXPECT d_tau = 0 tol 1e-12
// EXPECT eb.mdot_f = 5.4e-4 tol 1e-9
// EXPECT eb.P_b = 9000 tol 1e-6

SigConstant      GS(k=3)
GearboxScheduled GB(eta=0.9)
SpeedSource      SO(w=10)
MechGround       G1()
TorqueSource     TI(T=5)
MechGround       G2()
connect(TI.a, GB.in)
connect(TI.b, G2.port)
connect(GB.out, SO.a)
connect(SO.b, G1.port)
connect(GS.out, GB.u)
tq_out = GB.out.tau

TABLE wotmap(w)
  0    200
  500  200
END
TABLE bmap(w : tau = 0, 200)
  0    6e-8  6e-8
  500  6e-8  6e-8
END
SpeedSource EW1(w=100)
MechGround  EG1()
MeanValueEngine E1(throttle=0.5, Tpeak=200, w_peak=100, FMEP_a=10, FMEP_b=0.05, model$=parabolic)
connect(E1.shaft, EW1.a)
connect(EW1.b, EG1.port)

SpeedSource EW2(w=100)
MechGround  EG2()
MeanValueEngine E2(throttle=0.5, Tpeak=200, w_peak=100, FMEP_a=10, FMEP_b=0.05, FMEP_c=0, model$=chenflynn)
connect(E2.shaft, EW2.a)
connect(EW2.b, EG2.port)
d_tau = E1.shaft.tau - E2.shaft.tau

SpeedSource EW3(w=100)
MechGround  EG3()
MeanValueEngine EB(throttle=0.5, map_wot$=wotmap, bsfc$=bmap, FMEP_a=10, FMEP_b=0, model$=bsfc)
connect(EB.shaft, EW3.a)
connect(EW3.b, EG3.port)

{ CHECK d_tau 0 1e-8 }
{ CHECK e1.shaft.tau -85 0.00008499999999999999 }
{ CHECK e1.shaft.w 100 0.00009999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
d_tau = 0 [J]
e1.shaft.tau = -85
e1.shaft.w = 100
```

<!-- verified-reference-example:end -->
