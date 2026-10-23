---
name: TwoPhaseEjector
category: Component (twophase)
summary: "Two-phase ejector, lumped: motive m entrains suction s; mass and energy mix exactly, and the diffuser recovers a pressure lift parameterized as the pressure-lift ratio PLR = P_out / P_suction (rate it from CFD/test data)."
related: []
examples: []
tags: [twophaseejector, component, twophase, acausal]
references: []
---

# TwoPhaseEjector

Two-phase ejector, lumped: motive m entrains suction s; mass and energy mix exactly, and the diffuser recovers a pressure lift parameterized as the pressure-lift ratio PLR = P_out / P_suction (rate it from CFD/test data).

Reusable acausal **twophase-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/twophase.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhaseEjector inst(PLR, domain$)
```

## Ports

`m`, `s`, `out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `PLR` | Number | Pressure lift ratio, outlet over suction pressure [-]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= m.mdot + s.mdot \\
out.mdot\cdot out.h &= m.mdot\cdot m.h + s.mdot\cdot s.h \\
out.p &= plr\cdot s.p
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Ejector: exact mass/energy mix + the parameterized diffuser lift.
// EXPECT ej.out.mdot = 0.15
// EXPECT ej.out.h = 423333.3333 tol 1e-3
// EXPECT ej.out.p = 390000
// Oil separator: 2% bleed at saturated liquid, main stream from the exact
// energy balance (replicated).
// EXPECT os.bleed.mdot = 0.002 tol 1e-9
// EXPECT d_os = 0 tol 1e-6
TwoPhaseSourcePH M1(mdot=0.1 [kg/s], P=800000 [Pa], h=430000 [J/kg])
TwoPhaseSourcePH S1(mdot=0.05 [kg/s], P=300000 [Pa], h=410000 [J/kg])
TwoPhaseEjector  EJ(PLR=1.3)
TwoPhaseSink     KE()
connect(M1.out, EJ.m)
connect(S1.out, EJ.s)
connect(EJ.out, KE.in)

TwoPhaseSourcePH DIS(mdot=0.1 [kg/s], P=1500000 [Pa], h=440000 [J/kg])
OilSeparator     OS(fluid$=R134a, f=0.02)
TwoPhaseSink     KO()
TwoPhaseSink     KB()
connect(DIS.out, OS.in)
connect(OS.out, KO.in)
connect(OS.bleed, KB.in)
hf_chk = Enthalpy(R134a, P=1500000 [Pa], x=0)
d_os   = 0.098 [kg/s] * OS.out.h - (0.1 [kg/s] * 440000 [J/kg] - 0.002 [kg/s] * hf_chk)

{ CHECK d_os 0 1e-8 }
{ CHECK dis.out.h 440000 0.44 }
{ CHECK dis.out.mdot 0.1 1e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
d_os = 0 [J/kg]
dis.out.h = 440000
dis.out.mdot = 0.1
```

<!-- verified-reference-example:end -->
