---
name: AnodeRecirc
category: Component (pneumatic)
summary: Acausal pneumatic-domain component AnodeRecirc with ports sup_in, ret_in, out.
related: []
examples: []
tags: [anoderecirc, component, pneumatic, acausal]
references: []
generated: true
---

# AnodeRecirc

Reusable acausal **pneumatic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
AnodeRecirc inst(fluid$, C, b, ER, domain$)
```

## Ports

`sup_in`, `ret_in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `C` | Number |
| `b` | Number |
| `ER` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
t_{s} &= \text{Temperature}\left(\mathrm{fluid}, =sup_{in.p}, p=sup_{in.h}\right) \\
sup_{in.mdot} &= \text{iso6358}\left(c, b, sup_{in.p}, t_{s}, out.p\right) \\
ret_{in.mdot} &= er\cdot sup_{in.mdot} \\
out.mdot &= sup_{in.mdot} + ret_{in.mdot} \\
out.mdot\cdot out.h &= sup_{in.mdot}\cdot sup_{in.h} + ret_{in.mdot}\cdot ret_{in.h}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Anode recirculation ejector (gas bond exercised with Air, the served fluid):
// 3 bar fresh supply entrains ER = 1.2 times its own flow from the 1.6 bar,
// 330 K stack return; the mixed stream feeds the 1.5 bar stack inlet with the
// flow-weighted enthalpy.
PneumaticSupply     FRESH(fluid$=Air, P=300000, T=310)
PneumaticSupply     RET(fluid$=Air, P=160000, T=330)
AnodeRecirc         AR(fluid$=Air, C=1.5e-8, b=0.3, ER=1.2)
PneumaticAtmosphere STACK(P=150000)
connect(FRESH.out, AR.sup_in)
connect(RET.out, AR.ret_in)
connect(AR.out, STACK.port)
m_fresh = AR.sup_in.mdot
m_ret   = AR.ret_in.mdot
m_mix   = AR.out.mdot

{ CHECK ar.out.h 447102.5542 0.4471025541849566 }
{ CHECK ar.out.mdot 0.01093266056 1.0932660558258078e-8 }
{ CHECK ar.out.p 150000 0.15 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ar.out.h = 447102.5542
ar.out.mdot = 0.01093266056
ar.out.p = 150000
```

<!-- verified-reference-example:end -->
