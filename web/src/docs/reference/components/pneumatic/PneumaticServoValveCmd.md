---
name: PneumaticServoValveCmd
category: Component (pneumatic)
summary: Acausal pneumatic-domain component PneumaticServoValveCmd with ports in, out, u.
related: []
examples: []
tags: [pneumaticservovalvecmd, component, pneumatic, acausal]
references: []
generated: true
---

# PneumaticServoValveCmd

Reusable acausal **pneumatic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
PneumaticServoValveCmd inst(fluid$, Cmax, b, domain$)
```

## Ports

`in`, `out`, `u`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `Cmax` | Number |
| `b` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.h &= in.h \\
t_{in} &= \text{Temperature}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
in.mdot &= \text{iso6358}\left(u.sig\cdot cmax, b, in.p, t_{in}, out.p\right) \\
out.mdot &= in.mdot
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Signal-commanded pneumatic servo valve at 60% spool: ISO 6358 flow with the
// sonic conductance scaled to 0.6 * Cmax, blowing 7 bar supply down to
// atmosphere (choked: P_atm/P_sup = 0.143 < b = 0.3).
SigConstant           CMD(k=0.6)
PneumaticSupply       SUP(fluid$=Air, P=700000, T=300)
PneumaticServoValveCmd SVC(fluid$=Air, Cmax=1e-8, b=0.3)
PneumaticAtmosphere   ATM(P=100000)
connect(SUP.out, SVC.in)
connect(SVC.out, ATM.port)
connect(CMD.out, SVC.u)
m_valve = SVC.in.mdot

{ CHECK atm.port.h 424949.9736 0.424949973620621 }
{ CHECK atm.port.mdot 0.004919851141 1e-8 }
{ CHECK atm.port.p 100000 0.09999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
atm.port.h = 424949.9736
atm.port.mdot = 0.004919851141
atm.port.p = 100000
```

<!-- verified-reference-example:end -->
