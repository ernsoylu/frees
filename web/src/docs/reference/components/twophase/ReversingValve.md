---
name: ReversingValve
category: Component (twophase)
summary: Acausal twophase-domain component ReversingValve with ports d, s, i, o.
related: []
examples: []
tags: [reversingvalve, component, twophase, acausal]
references: []
generated: true
---

# ReversingValve

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ReversingValve inst(mode, domain$)
```

## Ports

`d`, `s`, `i`, `o`

## Parameters

| Parameter | Type |
| --- | --- |
| `mode` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
o.p &= \left(1 - mode\right)\cdot d.p + mode\cdot s.p \\
i.p &= \left(1 - mode\right)\cdot s.p + mode\cdot d.p \\
o.mdot &= \left(1 - mode\right)\cdot d.mdot + mode\cdot s.mdot \\
i.mdot &= \left(1 - mode\right)\cdot s.mdot + mode\cdot d.mdot \\
\left(1 - mode\right)\cdot \left(o.h - d.h\right) + mode\cdot \left(s.h - o.h\right) &= 0 \\
\left(1 - mode\right)\cdot \left(s.h - i.h\right) + mode\cdot \left(i.h - d.h\right) &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Four-way reversing valve routing, both modes. Cooling (mode=0): discharge d
// goes to the outdoor coil o and the indoor return i goes to suction s.
// Heating (mode=1): discharge goes indoors, outdoor return goes to suction.
// EXPECT rv1.o.h = 450000
// EXPECT rv1.o.p = 2000000
// EXPECT rv1.s.h = 410000
// EXPECT rv1.s.p = 400000
// EXPECT rv1.o.mdot = 0.1
// EXPECT rv2.i.h = 450000
// EXPECT rv2.i.p = 2000000
// EXPECT rv2.s.h = 410000
TwoPhaseSourcePH D1(mdot=0.1, P=2000000, h=450000)
TwoPhaseSourcePH I1(mdot=0.1, P=400000, h=410000)
ReversingValve   RV1(mode=0)
TwoPhaseSink     O1()
TwoPhaseSink     S1()
connect(D1.out, RV1.d)
connect(I1.out, RV1.i)
connect(RV1.o, O1.in)
connect(RV1.s, S1.in)
TwoPhaseSourcePH D2(mdot=0.1, P=2000000, h=450000)
TwoPhaseSourcePH O2S(mdot=0.1, P=400000, h=410000)
ReversingValve   RV2(mode=1)
TwoPhaseSink     I2()
TwoPhaseSink     S2()
connect(D2.out, RV2.d)
connect(O2S.out, RV2.o)
connect(RV2.i, I2.in)
connect(RV2.s, S2.in)

{ CHECK d1.out.h 450000 0.44999999999999996 }
{ CHECK d1.out.mdot 0.1 1e-7 }
{ CHECK d1.out.p 2000000 2 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
d1.out.h = 450000
d1.out.mdot = 0.1
d1.out.p = 2000000
```

<!-- verified-reference-example:end -->
