---
name: BlendMixer
category: Component (twophase)
summary: A gas-blend (mixture) mixing junction carrying the species rider.
related: []
examples: []
tags: [blendmixer, component, twophase, acausal]
---

# BlendMixer

A gas-blend (mixture) mixing junction carrying the species rider.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in1`, `in2`, `out`

## Usage

```
BlendMixer inst(domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.p &= in1.p \\
out.mdot &= in1.mdot + in2.mdot \\
out.mdot\cdot out.h &= in1.mdot\cdot in1.h + in2.mdot\cdot in2.h \\
out.mdot\cdot out.z &= in1.mdot\cdot in1.z + in2.mdot\cdot in2.z
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
BlendSource S1(fluid$=R134a, mdot=0.01, P=400000, x=0.3, z=0.2)
BlendSource S2(fluid$=R134a, mdot=0.03, P=400000, x=0.3, z=0.6)
BlendMixer  MIX()
BlendSink   SNK()
connect(S1.out, MIX.in1)
connect(S2.out, MIX.in2)
connect(MIX.out, SNK.in)

{ CHECK mix.in1.h 269593.5997 0.2695935997420933 }
{ CHECK mix.in1.mdot 0.01 1e-8 }
{ CHECK mix.in1.p 400000 0.39999999999999997 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
mix.in1.h = 269593.5997
mix.in1.mdot = 0.01
mix.in1.p = 400000
```

<!-- verified-reference-example:end -->
