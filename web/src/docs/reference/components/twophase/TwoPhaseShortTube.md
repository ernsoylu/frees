---
name: TwoPhaseShortTube
category: Component (twophase)
summary: Acausal twophase-domain component TwoPhaseShortTube with ports in, out.
related: []
examples: []
tags: [twophaseshorttube, component, twophase, acausal]
references: []
generated: true
---

# TwoPhaseShortTube

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhaseShortTube inst(fluid$, CdA, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `CdA` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
rho_{in} &= \text{Density}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
t_{in} &= \text{Temperature}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
pf &= \text{P\_sat}\left(\mathrm{fluid}, =t_{in}\right) \\
dp_{eff} &= in.p - \text{max}\left(out.p, pf\right) \\
in.mdot\cdot \left|in.mdot\right| &= cda^{2}\cdot 2\cdot rho_{in}\cdot dp_{eff}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Short-tube choking: two identical short tubes with the same subcooled feed
// (12 bar, saturated-liquid-at-10-bar enthalpy) but DIFFERENT downstream
// pressures (4 bar vs 2 bar) pass the SAME flow — the flow rides on
// (P_up - Psat(T_up)), not on the evaporator pressure. The magnitude matches
// the replicated law exactly.
// EXPECT r_choke = 1 tol 1e-9
// EXPECT d_law = 0 tol 1e-8
function [out] = PHSupply(P, h, domain$ = twophase)
port(out)
  out.P = P
  out.h = h
end
hsub = Enthalpy(R134a, P=1000000, x=0)
PHSupply             SA(P=1200000, h=hsub)
TwoPhaseShortTube    STA(fluid$=R134a, CdA=2e-6)
TwoPhasePressureSink KA(P=400000)
connect(SA.out, STA.in)
connect(STA.out, KA.in)
PHSupply             SB(P=1200000, h=hsub)
TwoPhaseShortTube    STB(fluid$=R134a, CdA=2e-6)
TwoPhasePressureSink KB(P=200000)
connect(SB.out, STB.in)
connect(STB.out, KB.in)
r_choke = STA.in.mdot / STB.in.mdot
rho_chk = Density(R134a, P=1200000, h=hsub)
T_chk   = Temperature(R134a, P=1200000, h=hsub)
Pf_chk  = P_sat(R134a, T=T_chk)
d_law   = STA.in.mdot - 2e-6 * sqrt(2 * rho_chk * (1200000 - Pf_chk))

{ CHECK d_law 0 1e-8 }
{ CHECK hsub 255495.8561 0.25549585605985514 }
{ CHECK ka.in.h 255495.8561 0.25549585605985514 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
d_law = 0
hsub = 255495.8561 [J/kg]
ka.in.h = 255495.8561
```

<!-- verified-reference-example:end -->
