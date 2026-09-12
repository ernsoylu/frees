---
name: SuctionAccumulator
category: Component (twophase)
summary: Acausal twophase-domain component SuctionAccumulator with ports in, out.
related: []
examples: []
tags: [suctionaccumulator, component, twophase, acausal]
references: []
generated: true
---

# SuctionAccumulator

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SuctionAccumulator inst(fluid$, m0, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `m0` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.p &= in.p \\
hf &= \text{Enthalpy}\left(\mathrm{fluid}, =in.p, p=0\right) \\
hg &= \text{Enthalpy}\left(\mathrm{fluid}, =in.p, p=1\right) \\
out.h &= hg \\
\text{der}\left(m\right) &= in.mdot - out.mdot \\
\text{init}\left(m\right) &= m0 \\
hf\cdot \left(in.mdot - out.mdot\right) &= in.mdot\cdot in.h - out.mdot\cdot hg
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Simulate a component transient and inspect its final state

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// SuctionAccumulator: a wet suction stream (x = 0.95) feeds the accumulator,
// which delivers saturated vapor and traps the liquid carryover — the stored
// mass m grows at mdot*(1 - x_in) = 2.5 g/s over the 60 s run.
TwoPhaseSource     SRC(fluid$ = R134a, mdot = 0.05, P = 350000, x = 0.95)
SuctionAccumulator ACC(fluid$ = R134a, m0 = 0.5)
TwoPhaseSink       SNK()
connect(SRC.out, ACC.in)
connect(ACC.out, SNK.in)

DYNAMIC fill (method = ida, time = 0 .. 60, points = 61, rtol = 1e-6, atol = 1e-8)
END

final_state = FinalValue('acc$m')

{ CHECK final_state 0.65 6.499999999999998e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
final_state = 0.65
```

<!-- verified-reference-example:end -->
