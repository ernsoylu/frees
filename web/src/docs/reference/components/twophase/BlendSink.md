---
name: BlendSink
category: Component (twophase)
summary: A boundary absorbing a gas-blend stream.
related: []
examples: []
tags: [blendsink, component, twophase, acausal]
---

# BlendSink

A boundary absorbing a gas-blend stream.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`

## Usage

```
BlendSink inst(domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
mdot &= in.mdot \\
p &= in.p \\
h &= in.h \\
z &= in.z
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
BlendSource SRC(fluid$=R134a, mdot=0.02, P=400000, x=0.3, z=1)
BlendSink SNK()
connect(SRC.out, SNK.in)

{ CHECK snk.h 269593.5997 0.2695935997420933 }
{ CHECK snk.in.h 269593.5997 0.2695935997420933 }
{ CHECK snk.in.mdot 0.02 2e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
snk.h = 269593.5997
snk.in.h = 269593.5997
snk.in.mdot = 0.02
```

<!-- verified-reference-example:end -->
