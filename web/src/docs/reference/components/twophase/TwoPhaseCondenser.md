---
name: TwoPhaseCondenser
category: Component (twophase)
summary: A two-phase condenser rejecting heat from the refrigerant.
related: []
examples: []
tags: [twophasecondenser, component, twophase, acausal]
---

# TwoPhaseCondenser

A two-phase condenser rejecting heat from the refrigerant.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
TwoPhaseCondenser inst(fluid$, SC_set, dP, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `SC_set` | Number | Target subcooling [K]. |
| `dP` | Number | Nominal pressure drop [Pa]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p - dp \\
tsat &= \text{T\_sat}\left(\mathrm{fluid}, =out.p\right) \\
out.h &= \text{Enthalpy}\left(\mathrm{fluid}, =out.p, p=tsat - sc_{set}\right) \\
q &= in.mdot\cdot \left(in.h - out.h\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// TwoPhaseCondenser: lumped non-isobaric condenser — superheated R134a at
// 1.21 MPa leaves 10 kPa lower as liquid with a set 5 K exit subcooling.
TwoPhaseSourcePH  SRC(mdot = 0.03, P = 1210000, h = 430000)
TwoPhaseCondenser CND(fluid$ = R134a, SC_set = 5, dP = 10000)
TwoPhaseSink      SNK()
connect(SRC.out, CND.in)
connect(CND.out, SNK.in)
q     = CND.Q
h_out = SNK.h

{ CHECK cnd.in.h 430000 0.43 }
{ CHECK cnd.in.mdot 0.03 3e-8 }
{ CHECK cnd.in.p 1210000 1.21 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cnd.in.h = 430000
cnd.in.mdot = 0.03
cnd.in.p = 1210000
```

<!-- verified-reference-example:end -->
