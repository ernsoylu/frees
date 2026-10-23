---
name: IceStorageBrine
category: Component (liquid)
summary: "Ice/PCM storage on a brine loop: the latent mass sits behind a UA wall in the brine stream — charge below the melt band, discharge above it."
related: []
examples: []
tags: [icestoragebrine, component, liquid, acausal]
references: []
---

# IceStorageBrine

Ice/PCM storage on a brine loop: the latent mass sits behind a UA wall in the brine stream — charge below the melt band, discharge above it.

Reusable acausal **liquid-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/liquid.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
IceStorageBrine inst(fluid$, UA, m, cp_p, L, Tm, dTm, T0)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Brine name (e.g. EG50). |
| `UA` | Number | Brine-to-ice conductance [W/K]. |
| `m` | Number | Mass of the storage medium [kg]. |
| `cp_p` | Number | Sensible specific heat of the storage medium [J/kg-K]. |
| `L` | Number | Latent heat of fusion [J/kg]. |
| `Tm` | Number | Melting temperature [K]. |
| `dTm` | Number | Width of the mushy zone [K]. |
| `T0` | Number | Initial storage temperature [K]. |

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
LiquidSource   LS(b1, fluid$ = EG50, mdot = 0.4 [kg/s], P = 200000 [Pa], T = 278 [K])
IceStorageBrine IST(b1, b2, fluid$ = EG50, UA = 400 [W/K], m = 500 [kg], cp_p = 2100 [J/kg-K], L = 334000 [J/kg], Tm = 273.15 [K], dTm = 2 [K], T0 = 273 [K])
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
