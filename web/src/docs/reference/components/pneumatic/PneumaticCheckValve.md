---
name: PneumaticCheckValve
category: Component (pneumatic)
summary: Acausal pneumatic-domain component PneumaticCheckValve with ports in, out.
related: []
examples: []
tags: [pneumaticcheckvalve, component, pneumatic, acausal]
references: []
generated: true
---

# PneumaticCheckValve

Reusable acausal **pneumatic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
PneumaticCheckValve inst(fluid$, C, b, eps, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `C` | Number |
| `b` | Number |
| `eps` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
g &= 0.5\,\left(1 + \tanh\left(\frac{in.p - out.p}{eps}\right)\right) \\
t_{in} &= \text{Temperature}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
in.mdot &= g\cdot \text{iso6358}\left(c, b, in.p, t_{in}, out.p\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Pneumatic check valve in its forward (conducting) direction: 7 bar supply
// into a 1 bar exhaust, well past the eps = 1 kPa gate width, so the tanh
// gate is fully open and the ISO 6358 law carries the whole flow.
PneumaticSupply     SUP(fluid$=Air, P=700000, T=300)
PneumaticCheckValve CHK(fluid$=Air, C=1e-8, b=0.3, eps=1000)
PneumaticAtmosphere ATM(P=100000)
connect(SUP.out, CHK.in)
connect(CHK.out, ATM.port)
m_fwd  = CHK.in.mdot
g_gate = CHK.g

{ CHECK atm.port.h 424949.9736 0.424949973620621 }
{ CHECK atm.port.mdot 0.008199751902 1e-8 }
{ CHECK atm.port.p 100000 0.09999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
atm.port.h = 424949.9736
atm.port.mdot = 0.008199751902
atm.port.p = 100000
```

<!-- verified-reference-example:end -->
