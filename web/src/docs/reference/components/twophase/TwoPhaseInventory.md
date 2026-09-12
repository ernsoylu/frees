---
name: TwoPhaseInventory
category: Component (twophase)
summary: Tracks the refrigerant charge inventory across the circuit.
related: []
examples: []
tags: [twophaseinventory, component, twophase, acausal]
---

# TwoPhaseInventory

Tracks the refrigerant charge inventory across the circuit.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
TwoPhaseInventory inst(fluid$, V, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `V` | Number | Volume [m³]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
out.h &= in.h \\
hf &= \text{Enthalpy}\left(\mathrm{fluid}, =in.p, p=0\right) \\
hg &= \text{Enthalpy}\left(\mathrm{fluid}, =in.p, p=1\right) \\
x &= \frac{in.h - hf}{hg - hf} \\
rho_{l} &= \text{Density}\left(\mathrm{fluid}, =in.p, p=0\right) \\
rho_{g} &= \text{Density}\left(\mathrm{fluid}, =in.p, p=1\right) \\
alpha &= \text{void\_zivi}\left(x, rho_{l}, rho_{g}\right) \\
rho_{mix} &= alpha\cdot rho_{g} + \left(1 - alpha\right)\cdot rho_{l} \\
m &= v\cdot rho_{mix}
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
