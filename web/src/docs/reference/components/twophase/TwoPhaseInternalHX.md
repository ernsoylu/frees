---
name: TwoPhaseInternalHX
category: Component (twophase)
summary: "Internal (suction-line) heat exchanger: subcools the liquid line against the suction vapor at an effectiveness on the vapor side (the usual Cmin side)."
related: []
examples: []
tags: [twophaseinternalhx, component, twophase, acausal]
references: []
---

# TwoPhaseInternalHX

Internal (suction-line) heat exchanger: subcools the liquid line against the suction vapor at an effectiveness on the vapor side (the usual Cmin side).

Isobaric on both sides; energy is conserved exactly.

Reusable acausal **twophase-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/twophase.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhaseInternalHX inst(fluid$, eps, domain$)
```

## Ports

`liq_in`, `liq_out`, `vap_in`, `vap_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `eps` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
liq_{out.mdot} &= liq_{in.mdot} \\
vap_{out.mdot} &= vap_{in.mdot} \\
liq_{out.p} &= liq_{in.p} \\
vap_{out.p} &= vap_{in.p} \\
t_{liq} &= \text{Temperature}\left(\mathrm{fluid\$}, p=liq_{in.p}, h=liq_{in.h}\right) \\
t_{vap} &= \text{Temperature}\left(\mathrm{fluid\$}, p=vap_{in.p}, h=vap_{in.h}\right) \\
cp_{v} &= \text{Cp}\left(\mathrm{fluid\$}, p=vap_{in.p}, h=vap_{in.h}\right) \\
q &= eps\cdot vap_{in.mdot}\cdot cp_{v}\cdot \left(t_{liq} - t_{vap}\right) \\
vap_{out.h} &= vap_{in.h} + \frac{q}{vap_{in.mdot}} \\
liq_{out.h} &= liq_{in.h} - \frac{q}{liq_{in.mdot}}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// TwoPhaseInternalHX: suction-line heat exchanger — the 1.2 MPa liquid line
// subcools against the 350 kPa suction vapor at eps = 0.6 on the vapor side.
TwoPhaseSourcePH   LIQ(mdot = 0.03 [kg/s], P = 1200000 [Pa], h = 260000 [J/kg])
TwoPhaseSourcePH   VAP(mdot = 0.03 [kg/s], P = 350000 [Pa], h = 405000 [J/kg])
TwoPhaseInternalHX IHX(fluid$ = R134a, eps = 0.6)
TwoPhaseSink       LSNK()
TwoPhaseSink       VSNK()
connect(LIQ.out, IHX.liq_in)
connect(IHX.liq_out, LSNK.in)
connect(VAP.out, IHX.vap_in)
connect(IHX.vap_out, VSNK.in)
q         = IHX.Q
h_liq_out = LSNK.h
h_vap_out = VSNK.h

{ CHECK h_liq_out 241597.6514 0.24159765143801204 }
{ CHECK h_vap_out 423402.3486 0.42340234856198794 }
{ CHECK ihx.cp_v 913.4598895 0.0009134598894734091 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
h_liq_out = 241597.6514 [J/kg]
h_vap_out = 423402.3486 [J/kg]
ihx.cp_v = 913.4598895
```

<!-- verified-reference-example:end -->
