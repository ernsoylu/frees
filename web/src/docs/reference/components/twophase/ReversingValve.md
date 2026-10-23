---
name: ReversingValve
category: Component (twophase)
summary: Four-way reversing valve (heat pump mode switch).
related: []
examples: []
tags: [reversingvalve, component, twophase, acausal]
references: []
---

# ReversingValve

Four-way reversing valve (heat pump mode switch).

Ports: compressor discharge d, compressor suction s, indoor coil i, outdoor coil o. mode = 0 (cooling): d→o and i→s.  mode = 1 (heating): d→i and o→s. Each tie is a mode-blend of the two routings, so the equation COUNT is constant across modes (intermediate mode values model transfer leakage).

Reusable acausal **twophase-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/twophase.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ReversingValve inst(mode, domain$)
```

## Ports

`d`, `s`, `i`, `o`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `mode` | Number | Valve position, 0 for cooling and 1 for heating [-]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

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
TwoPhaseSourcePH D1(mdot=0.1 [kg/s], P=2000000 [Pa], h=450000 [J/kg])
TwoPhaseSourcePH I1(mdot=0.1 [kg/s], P=400000 [Pa], h=410000 [J/kg])
ReversingValve   RV1(mode=0)
TwoPhaseSink     O1()
TwoPhaseSink     S1()
connect(D1.out, RV1.d)
connect(I1.out, RV1.i)
connect(RV1.o, O1.in)
connect(RV1.s, S1.in)
TwoPhaseSourcePH D2(mdot=0.1 [kg/s], P=2000000 [Pa], h=450000 [J/kg])
TwoPhaseSourcePH O2S(mdot=0.1 [kg/s], P=400000 [Pa], h=410000 [J/kg])
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
