---
name: AutomaticTransmission
category: Component (powertrain)
summary: Acausal powertrain-domain component AutomaticTransmission with ports in, out, gear, lock.
related: []
examples: []
tags: [automatictransmission, component, powertrain, acausal]
references: []
generated: true
---

# AutomaticTransmission

Reusable acausal **powertrain-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
AutomaticTransmission inst(Kmap$, TRmap$, eta, Tlock, eps)
```

## Ports

`in`, `out`, `gear`, `lock`

## Parameters

| Parameter | Type |
| --- | --- |
| `Kmap$` | String |
| `TRmap$` | String |
| `eta` | Number |
| `Tlock` | Number |
| `eps` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
TorqueConverter  TC(Kmap$=Kmap$, TRmap$=TRmap$)
GearboxScheduled GB(eta=eta)
ClutchCmd        LU(Tmax=Tlock, eps=eps)
connect(in, TC.pump, LU.a)
connect(TC.turb, LU.b, GB.in)
connect(GB.out, out)
connect(gear, GB.u)
connect(lock, LU.u)
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// AutomaticTransmission, lockup open: pump pinned at 250 rad/s, output at
// 62.5 with gear ratio 3 -> turbine at 187.5, SR = 0.75. K = 25 flat gives
// pump torque (250/25)^2 = 100 N·m; TR(0.75) interpolates to 1.3 -> 130 N·m
// on the turbine; through the 0.9-efficient gearbox the output node receives
// 3*0.9*130 = 351 N·m; the holding source's reaction is signed into the
// source, so the probe reads -351.
// EXPECT tq_hold = -351 tol 1e-6

TABLE kmap(sr)
  0   25
  1   25
END
TABLE trmap(sr)
  0    2.0
  0.5  1.6
  1    1.0
END
SigConstant GEAR(k=3)
SigConstant LOCK(k=0)
SpeedSource SI(w=250)
MechGround  GI()
SpeedSource SO(w=62.5)
MechGround  GO()
AutomaticTransmission AT(Kmap$=kmap, TRmap$=trmap, eta=0.9, Tlock=5000, eps=0.5)
connect(SI.a, AT.in)
connect(SI.b, GI.port)
connect(AT.out, SO.a)
connect(SO.b, GO.port)
connect(GEAR.out, AT.gear)
connect(LOCK.out, AT.lock)
tq_hold = SO.a.tau

{ CHECK at.gear.sig 3 0.000003 }
{ CHECK at.in.tau -100 0.00009999999999999999 }
{ CHECK at.in.w 250 0.00025 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
at.gear.sig = 3
at.in.tau = -100
at.in.w = 250
```

<!-- verified-reference-example:end -->
