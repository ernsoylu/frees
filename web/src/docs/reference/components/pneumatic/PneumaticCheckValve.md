---
name: PneumaticCheckValve
category: Component (pneumatic)
summary: "Pneumatic check valve: ISO 6358 flow gated to forward ΔP."
related: []
examples: []
tags: [pneumaticcheckvalve, component, pneumatic, acausal]
references: []
---

# PneumaticCheckValve

Pneumatic check valve: ISO 6358 flow gated to forward ΔP.

Reusable acausal **pneumatic-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/pneumatic.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
PneumaticCheckValve inst(fluid$, C, b, eps, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Gas name (e.g. Air, Nitrogen, Hydrogen). |
| `C` | Number | ISO 6358 sonic conductance [m^3/s-Pa]. |
| `b` | Number | ISO 6358 critical pressure ratio [-]. |
| `eps` | Number | Width of the opening transition [Pa]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
g &= 0.5\,\left(1 + \tanh\left(\frac{in.p - out.p}{eps}\right)\right) \\
t_{in} &= \text{Temperature}\left(\mathrm{fluid\$}, p=in.p, h=in.h\right) \\
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
PneumaticSupply     SUP(fluid$=Air, P=700000 [Pa], T=300 [K])
PneumaticCheckValve CHK(fluid$=Air, C=1e-8 [m^3/s-Pa], b=0.3, eps=1000 [Pa])
PneumaticAtmosphere ATM(P=100000 [Pa])
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
