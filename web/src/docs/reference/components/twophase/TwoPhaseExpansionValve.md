---
name: TwoPhaseExpansionValve
category: Component (twophase)
summary: A refrigerant expansion valve (isenthalpic throttle).
related: []
examples: []
tags: [twophaseexpansionvalve, component, twophase, acausal]
---

# TwoPhaseExpansionValve

A refrigerant expansion valve (isenthalpic throttle).

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
TwoPhaseExpansionValve inst(fluid$, Cv, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `Cv` | Number | Flow coefficient. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
rho_{in} &= \text{Density}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
in.mdot\cdot \left|in.mdot\right| &= cv^{2}\cdot 2\cdot rho_{in}\cdot \left(in.p - out.p\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TwoPhaseSource SRC(fluid$=R1234yf, mdot=0.025, P=350000, x=0.2)
TwoPhaseEvaporator EVP(fluid$=R1234yf, SH_set=8, dP=0)
TwoPhaseCompressor CMP(fluid$=R1234yf, eta=0.7)
TwoPhaseCondenser CND(fluid$=R1234yf, SC_set=5, dP=0)
TwoPhaseExpansionValve EXV(fluid$=R1234yf, Cv=5e-7)
TwoPhaseSink SNK()
connect(SRC.out, EVP.in)
connect(EVP.out, CMP.in)
connect(CMP.out, CND.in)
connect(CND.out, EXV.in)
connect(EXV.out, SNK.in)
CMP.out.P = 1500000

{ CHECK cmp.h_s 399852.1323 0.3998521323050279 }
{ CHECK cmp.in.h 372965.7028 0.3729657027848153 }
{ CHECK cmp.in.mdot 0.025 2.5e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cmp.h_s = 399852.1323
cmp.in.h = 372965.7028
cmp.in.mdot = 0.025
```

<!-- verified-reference-example:end -->
