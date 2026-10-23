---
name: SuctionAccumulator
category: Component (twophase)
summary: "Suction accumulator: traps liquid carryover and delivers SATURATED VAPOR to the compressor."
related: []
examples: []
tags: [suctionaccumulator, component, twophase, acausal]
references: []
---

# SuctionAccumulator

Suction accumulator: traps liquid carryover and delivers SATURATED VAPOR to the compressor.

The liquid inventory m is a state; its energy balance (liquid stored at h_f) closes the outlet flow. In steady state der(m)=0 forces h_in = h_g — a dry steady inlet, exactly the physical statement.

Reusable acausal **twophase-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/twophase.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SuctionAccumulator inst(fluid$, m0, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Refrigerant name (e.g. R134a, R744, R1234yf). |
| `m0` | Number | Initial liquid inventory [kg]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.p &= in.p \\
hf &= \text{Enthalpy}\left(\mathrm{fluid\$}, p=in.p, x=0\right) \\
hg &= \text{Enthalpy}\left(\mathrm{fluid\$}, p=in.p, x=1\right) \\
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
TwoPhaseSource     SRC(fluid$ = R134a, mdot = 0.05 [kg/s], P = 350000 [Pa], x = 0.95)
SuctionAccumulator ACC(fluid$ = R134a, m0 = 0.5 [kg])
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
