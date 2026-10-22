---
name: CapillaryTube
category: Component (twophase)
summary: "Capillary tube: the empirical power-law rating m = C·ΔP_eff^n (n ≈ 0.5), with the same flashing choke as the short tube (ΔP_eff clamps at the upstream saturation pressure)."
related: []
examples: []
tags: [capillarytube, component, twophase, acausal]
references: []
---

# CapillaryTube

Capillary tube: the empirical power-law rating m = C·ΔP_eff^n (n ≈ 0.5), with the same flashing choke as the short tube (ΔP_eff clamps at the upstream saturation pressure).

Reusable acausal **twophase-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/twophase.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
CapillaryTube inst(fluid$, C, n, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `C` | Number |
| `n` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
t_{in} &= \text{Temperature}\left(\mathrm{fluid\$}, p=in.p, h=in.h\right) \\
pf &= \text{P\_sat}\left(\mathrm{fluid\$}, t=t_{in}\right) \\
dp_{eff} &= in.p - \text{max}\left(out.p, pf\right) \\
in.mdot &= c\cdot \left(\frac{dp_{eff}}{1\,\left[Pa\right]}\right)^{n}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Capillary tube power-law rating with the flashing clamp, replicated from
// independent property calls.
// EXPECT d_law = 0 tol 1e-8
function [out] = PHSupply2(P, h, domain$ = twophase)
port(out)
  out.P = P
  out.h = h
end
hsub = Enthalpy(R134a, P=1000000, x=0)
PHSupply2            SC(P=1200000, h=hsub)
CapillaryTube        CT(fluid$=R134a, C=1e-7 [kg/s], n=0.5)
TwoPhasePressureSink KC(P=300000 [Pa])
connect(SC.out, CT.in)
connect(CT.out, KC.in)
T_chk  = Temperature(R134a, P=1200000, h=hsub)
Pf_chk = P_sat(R134a, T=T_chk)
d_law  = CT.in.mdot - 1e-7 * (1200000 - Pf_chk)^0.5

{ CHECK ct.dp_eff 199367.6091 0.19936760911446866 }
{ CHECK ct.in.h 255495.8561 0.25549585605985514 }
{ CHECK ct.in.mdot 0.00004465060012 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ct.dp_eff = 199367.6091
ct.in.h = 255495.8561
ct.in.mdot = 0.00004465060012
```

<!-- verified-reference-example:end -->
