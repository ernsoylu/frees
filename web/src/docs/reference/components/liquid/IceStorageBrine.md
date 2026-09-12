---
name: IceStorageBrine
category: Component (liquid)
summary: Acausal liquid-domain component IceStorageBrine with ports in, out.
related: []
examples: []
tags: [icestoragebrine, component, liquid, acausal]
references: []
generated: true
---

# IceStorageBrine

Reusable acausal **liquid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
IceStorageBrine inst(fluid$, UA, m, cp_p, L, Tm, dTm, T0)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `UA` | Number |
| `m` | Number |
| `cp_p` | Number |
| `L` | Number |
| `Tm` | Number |
| `dTm` | Number |
| `T0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
LiquidWallHX HX(fluid$=fluid$, UA=UA)
PCMMass      ICE(m=m, cp=cp_p, L=L, Tm=Tm, dTm=dTm, T0=T0)
connect(in, HX.in)
connect(HX.out, out)
connect(HX.wall, ICE.port)
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// IceStorageBrine (hierarchical: LiquidWallHX + PCMMass) on an EG50 brine
// loop near the melt band. With no DYNAMIC block the PCM state takes the
// steady branch (Qdot = 0), so the pack floats at the brine temperature.
LiquidSource   LS(b1, fluid$ = EG50, mdot = 0.4, P = 200000, T = 278)
IceStorageBrine IST(b1, b2, fluid$ = EG50, UA = 400, m = 500, cp_p = 2100, L = 334000, Tm = 273.15, dTm = 2, T0 = 273)
LiquidSink     SK(b2)

h_out = SK.h
p_out = SK.P
m_out = SK.mdot

{ CHECK b1.h -49478.83625 0.04947883624675133 }
{ CHECK b1.mdot 0.4 4e-7 }
{ CHECK b1.p 200000 0.19999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
b1.h = -49478.83625
b1.mdot = 0.4
b1.p = 200000
```

<!-- verified-reference-example:end -->
