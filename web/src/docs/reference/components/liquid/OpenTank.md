---
name: OpenTank
category: Component (liquid)
summary: "Open (vented) tank: level state from the flow imbalance; the inlet sees the free surface (P0), the outlet the gravity head at the base."
related: []
examples: []
tags: [opentank, component, liquid, acausal]
references: []
---

# OpenTank

Open (vented) tank: level state from the flow imbalance; the inlet sees the free surface (P0), the outlet the gravity head at the base.

Well-mixed and adiabatic in enthalpy.

Reusable acausal **liquid-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/liquid.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
OpenTank inst(A_t, P0, rho, L0, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `A_t` | Number | Tank cross-section [m^2]. |
| `P0` | Number | Pressure on the free surface [Pa]. |
| `rho` | Number | Liquid density [kg/m^3]. |
| `L0` | Number | Initial liquid level [m]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(lvl\right) &= \frac{in.mdot - out.mdot}{rho\cdot a_{t}} \\
\text{init}\left(lvl\right) &= l0 \\
in.p &= p0 \\
out.p &= p0 + rho\cdot 9.80665\,\left[m/s^2\right]\cdot lvl \\
out.h &= in.h
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// OpenTank at steady throughflow: the free surface sees P0, the outlet the
// gravity head, and der(lvl) = 0 equalises the flows; the pinned outlet
// pressure sizes the level (~1.02 m of water).
OpenTank TK(o1, o2, A_t = 0.5 [m^2], P0 = 101325 [Pa], rho = 998 [kg/m^3], L0 = 1.0 [m])
LiquidSink SK(o2)

o1.mdot = 1.0
o1.h    = 105000
o2.P    = 111325
level   = TK.lvl
m_out   = SK.mdot

{ CHECK level 1.021759732 0.0000010217597324428142 }
{ CHECK m_out 1 0.000001 }
{ CHECK o1.p 101325 0.101325 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
level = 1.021759732
m_out = 1 [kg/s]
o1.p = 101325
```

<!-- verified-reference-example:end -->
