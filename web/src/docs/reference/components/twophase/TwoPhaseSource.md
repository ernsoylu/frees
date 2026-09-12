---
name: TwoPhaseSource
category: Component (twophase)
summary: A boundary supplying a two-phase stream.
related: []
examples: []
tags: [twophasesource, component, twophase, acausal]
---

# TwoPhaseSource

A boundary supplying a two-phase stream.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`out`

## Usage

```
TwoPhaseSource inst(fluid$, mdot, P, x, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `mdot` | Number | Mass flow rate [kg/s]. |
| `P` | Number | Pressure [Pa]. |
| `x` | Number | Vapor quality / fraction (0–1). |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= mdot \\
out.p &= p \\
out.h &= \text{Enthalpy}\left(\mathrm{fluid}, =p, p=x\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TwoPhaseSource SRC(fluid$=R134a, mdot=0.02, P=500000, x=0.5)
TwoPhaseInventory INV(fluid$=R134a, V=0.001)
TwoPhaseSink SNK()
connect(SRC.out, INV.in)
connect(INV.out, SNK.in)

{ CHECK inv.alpha 0.9322346308 9.322346307575955e-7 }
{ CHECK inv.hf 221501.6737 0.2215016736533679 }
{ CHECK inv.hg 407471.3462 0.4074713461783659 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
inv.alpha = 0.9322346308
inv.hf = 221501.6737
inv.hg = 407471.3462
```

<!-- verified-reference-example:end -->
