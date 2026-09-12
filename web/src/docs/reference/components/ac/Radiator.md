---
name: Radiator
category: Component (ac)
summary: Acausal ac-domain component Radiator with ports cool_in, cool_out, air_in, air_out.
related: []
examples: []
tags: [radiator, component, ac, acausal]
references: []
generated: true
---

# Radiator

Reusable acausal **ac-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Radiator inst(cool$, UA_cool, eps_air)
```

## Ports

`cool_in`, `cool_out`, `air_in`, `air_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `cool$` | String |
| `UA_cool` | Number |
| `eps_air` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
LiquidWallHX   CL(fluid$=cool$, UA=UA_cool)
MoistAirWallHX AR(model$=eps_t, eps=eps_air)
connect(cool_in, CL.in)
connect(CL.out, cool_out)
connect(air_in, AR.in)
connect(AR.out, air_out)
connect(CL.wall, AR.wall)
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Radiator: hierarchical liquid/moist-air bridge — 95 C water coolant rejects
// ~24 kW to ambient air through the shared wall node (UA_cool on the coolant
// side, eps_t effectiveness on the air side).
LiquidSource   CLNT(fluid$ = Water, mdot = 0.4, P = 200000, T = 368)
MoistAirSource AIR(P = 101325, T = 305, W = 0.008, mdot = 1.2)
Radiator       RAD(cool$ = Water, UA_cool = 800, eps_air = 0.6)
LiquidSink     CSNK()
MoistAirSink   ASNK()
connect(CLNT.out, RAD.cool_in)
connect(RAD.cool_out, CSNK.in)
connect(AIR.out, RAD.air_in)
connect(RAD.air_out, ASNK.in)
t_cool_out = Temperature(Water, P = 200000, h = CSNK.h)
h_air_out  = ASNK.h

{ CHECK air.out.h 52517.83219 0.052517832193193385 }
{ CHECK air.out.mdot 1.2 0.0000012 }
{ CHECK air.out.p 101325 0.101325 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
air.out.h = 52517.83219
air.out.mdot = 1.2
air.out.p = 101325
```

<!-- verified-reference-example:end -->
