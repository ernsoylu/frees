---
name: Differential
category: Component (powertrain)
summary: Acausal powertrain-domain component Differential with ports in, left, right.
related: []
examples: []
tags: [differential, component, powertrain, acausal]
references: []
generated: true
---

# Differential

Reusable acausal **powertrain-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Differential inst(ratio)
```

## Ports

`in`, `left`, `right`

## Parameters

| Parameter | Type |
| --- | --- |
| `ratio` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
in.w &= ratio\cdot 0.5\cdot \left(left.w + right.w\right) \\
left.tau &= -0.5\cdot ratio\cdot in.tau \\
right.tau &= -0.5\cdot ratio\cdot in.tau
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Torque converter at SR = 0.5 with K = 25 and TR = 1.6: pump absorbs
// (250/25)^2 = 100 N·m, turbine delivers 160 N·m. Open differential
// (ratio 3, both wheels on c = 2 dampers): wheels at 100/3 rad/s, input
// torque 2*(100/3)*2/... = 44.444 N·m (power conserving).
// EXPECT tc.pump.tau = 100 tol 1e-6
// EXPECT tq_turb = -160 tol 1e-6
// EXPECT df.in.tau = 44.4444 tol 1e-3
TABLE kmap(sr)
  0   25
  1   25
END
TABLE trmap(sr)
  0    2.0
  0.5  1.6
  1    1.0
END
SpeedSource     SP(w=250)
MechGround      GP()
SpeedSource     ST(w=125)
MechGround      GT()
TorqueConverter TC(Kmap$=kmap, TRmap$=trmap)
connect(SP.a, TC.pump)
connect(SP.b, GP.port)
connect(ST.a, TC.turb)
connect(ST.b, GT.port)
tq_turb = TC.turb.tau

SpeedSource      SI(w=100)
MechGround       GI()
Differential     DF(ratio=3)
RotationalDamper WL(c=2)
RotationalDamper WR(c=2)
MechGround       GL()
MechGround       GR()
connect(SI.a, DF.in)
connect(SI.b, GI.port)
connect(DF.left, WL.a)
connect(WL.b, GL.port)
connect(DF.right, WR.a)
connect(WR.b, GR.port)

{ CHECK df.in.tau 44.44444444 0.000044444444444444447 }
{ CHECK df.in.w 100 0.00009999999999999999 }
{ CHECK df.left.tau -66.66666667 0.00006666666666666667 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
df.in.tau = 44.44444444
df.in.w = 100
df.left.tau = -66.66666667
```

<!-- verified-reference-example:end -->
