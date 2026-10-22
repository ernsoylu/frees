---
name: GearboxScheduled
category: Component (powertrain)
summary: "Scheduled gearbox: the ratio arrives on a signal port (a shift schedule via SigMap on speed, or any command source); torque transfer with efficiency."
related: []
examples: []
tags: [gearboxscheduled, component, powertrain, acausal]
references: []
---

# GearboxScheduled

Scheduled gearbox: the ratio arrives on a signal port (a shift schedule via SigMap on speed, or any command source); torque transfer with efficiency.

Reusable acausal **powertrain-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/powertrain.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

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
SpeedSource      SO(w=10 [rad/s])
MechGround       G1()
TorqueSource     TI(T=5 [N-m])
MechGround       G2()
connect(TI.a, GB.in)
connect(TI.b, G2.port)
connect(GB.out, SO.a)
connect(SO.b, G1.port)
connect(GS.out, GB.u)
tq_out = GB.out.tau

TABLE wotmap(w [rad/s]) [N-m]
  0    200
  500  200
END
TABLE bmap(w [rad/s] : tau = 0, 200) [kg/J]
  0    6e-8  6e-8
  500  6e-8  6e-8
END
SpeedSource EW1(w=100 [rad/s])
MechGround  EG1()
MeanValueEngine E1(throttle=0.5, Tpeak=200 [N-m], w_peak=100 [rad/s], FMEP_a=10 [N-m], FMEP_b=0.05 [N-m-s], model$=parabolic)
connect(E1.shaft, EW1.a)
connect(EW1.b, EG1.port)

SpeedSource EW2(w=100 [rad/s])
MechGround  EG2()
MeanValueEngine E2(throttle=0.5, Tpeak=200 [N-m], w_peak=100 [rad/s], FMEP_a=10 [N-m], FMEP_b=0.05 [N-m-s], FMEP_c=0 [kg-m^2], model$=chenflynn)
connect(E2.shaft, EW2.a)
connect(EW2.b, EG2.port)
d_tau = E1.shaft.tau - E2.shaft.tau

SpeedSource EW3(w=100 [rad/s])
MechGround  EG3()
MeanValueEngine EB(throttle=0.5, map_wot$=wotmap, bsfc$=bmap, FMEP_a=10 [N-m], FMEP_b=0 [N-m-s], model$=bsfc)
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
