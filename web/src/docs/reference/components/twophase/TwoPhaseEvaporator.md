---
name: TwoPhaseEvaporator
category: Component (twophase)
summary: A two-phase evaporator absorbing heat into the refrigerant.
related: []
examples: []
tags: [twophaseevaporator, component, twophase, acausal]
---

# TwoPhaseEvaporator

A two-phase evaporator absorbing heat into the refrigerant.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
TwoPhaseEvaporator inst(fluid$, SH_set, dP, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `SH_set` | Number | Target superheat [K]. |
| `dP` | Number | Nominal pressure drop [Pa]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p - dp \\
tsat &= \text{T\_sat}\left(\mathrm{fluid}, =out.p\right) \\
out.h &= \text{Enthalpy}\left(\mathrm{fluid}, =out.p, p=tsat + sh_{set}\right) \\
q &= in.mdot\cdot \left(out.h - in.h\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// TwoPhaseEvaporator: lumped non-isobaric evaporator — two-phase R134a in at
// 360 kPa leaves 10 kPa lower with a set 5 K exit superheat; Q is an output.
TwoPhaseSourcePH   SRC(mdot = 0.03, P = 360000, h = 260000)
TwoPhaseEvaporator EV(fluid$ = R134a, SH_set = 5, dP = 10000)
TwoPhaseSink       SNK()
connect(SRC.out, EV.in)
connect(EV.out, SNK.in)
q     = EV.Q
h_out = SNK.h

{ CHECK ev.in.h 260000 0.26 }
{ CHECK ev.in.mdot 0.03 3e-8 }
{ CHECK ev.in.p 360000 0.36 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ev.in.h = 260000
ev.in.mdot = 0.03
ev.in.p = 360000
```

<!-- verified-reference-example:end -->
