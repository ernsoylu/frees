---
name: CapillaryTube
category: Component (twophase)
summary: Acausal twophase-domain component CapillaryTube with ports in, out.
related: []
examples: []
tags: [capillarytube, component, twophase, acausal]
references: []
generated: true
---

# CapillaryTube

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

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
t_{in} &= \text{Temperature}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
pf &= \text{P\_sat}\left(\mathrm{fluid}, =t_{in}\right) \\
dp_{eff} &= in.p - \text{max}\left(out.p, pf\right) \\
in.mdot &= c\cdot dp_{eff}^{n}
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
CapillaryTube        CT(fluid$=R134a, C=1e-7, n=0.5)
TwoPhasePressureSink KC(P=300000)
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
