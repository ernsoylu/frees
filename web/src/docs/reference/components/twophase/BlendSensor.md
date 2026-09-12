---
name: BlendSensor
category: Component (twophase)
summary: A sensor reading the state of a gas-blend stream.
related: []
examples: []
tags: [blendsensor, component, twophase, acausal]
---

# BlendSensor

A sensor reading the state of a gas-blend stream.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
BlendSensor inst(fluid$, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
out.h &= in.h \\
out.z &= in.z \\
hf &= \text{Enthalpy}\left(\mathrm{fluid}, =in.p, p=0\right) \\
hg &= \text{Enthalpy}\left(\mathrm{fluid}, =in.p, p=1\right) \\
x &= \frac{in.h - hf}{hg - hf} \\
bubble &= \text{Temperature}\left(\mathrm{fluid}, =in.p, p=0\right) \\
dew &= \text{Temperature}\left(\mathrm{fluid}, =in.p, p=1\right) \\
glide &= dew - bubble
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
BlendSource SRC(fluid$=R134a, mdot=0.02, P=400000, x=0.3, z=0.35)
BlendSensor SEN(fluid$=R134a)
BlendSink SNK()
connect(SRC.out, SEN.in)
connect(SEN.out, SNK.in)

{ CHECK sen.bubble 282.0806039 0.00028208060394490617 }
{ CHECK sen.dew 282.0806039 0.00028208060394490617 }
{ CHECK sen.glide 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
sen.bubble = 282.0806039
sen.dew = 282.0806039
sen.glide = 0
```

<!-- verified-reference-example:end -->
