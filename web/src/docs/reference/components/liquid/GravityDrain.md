---
name: GravityDrain
category: Component (liquid)
summary: "Gravity drain (Torricelli): the C1 odd-symmetric flow law mdot|mdot| = (Cd*A)^2 * 2*rho*dP — smooth through zero head, reversible."
related: []
examples: []
tags: [gravitydrain, component, liquid, acausal]
references: []
---

# GravityDrain

Gravity drain (Torricelli): the C1 odd-symmetric flow law mdot|mdot| = (Cd*A)^2 * 2*rho*dP — smooth through zero head, reversible.

Reusable acausal **liquid-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/liquid.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
GravityDrain inst(Cd, A_d, rho, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Cd` | Number | Discharge coefficient [-]. |
| `A_d` | Number | Drain flow area [m^2]. |
| `rho` | Number | Liquid density [kg/m^3]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
dp &= in.p - out.p \\
in.mdot\cdot \left|in.mdot\right| &= \left(cd\cdot a_{d}\right)^{2}\cdot 2\cdot rho\cdot dp \\
out.mdot &= in.mdot \\
out.h &= in.h
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// GravityDrain: Torricelli square law through Cd*A = 6.2e-5 m^2 under
// ~1.9 m of water head (dP = 18.7 kPa) -> mdot ~ 0.38 kg/s.
GravityDrain GD(g1, g2, Cd = 0.62, A_d = 1e-4 [m^2], rho = 998 [kg/m^3])

g1.P  = 120000
g1.h  = 100000
g2.P  = 101325
m     = GD.out.mdot
h_out = g2.h

{ CHECK g1.mdot 0.378531707 3.785317069942754e-7 }
{ CHECK g2.h 100000 0.09999999999999999 }
{ CHECK g2.mdot 0.378531707 3.785317069942754e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
g1.mdot = 0.378531707
g2.h = 100000
g2.mdot = 0.378531707
```

<!-- verified-reference-example:end -->
