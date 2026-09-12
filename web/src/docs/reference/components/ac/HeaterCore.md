---
name: HeaterCore
category: Component (ac)
summary: Acausal ac-domain component HeaterCore with ports cool_in, cool_out, air_in, air_out.
related: []
examples: []
tags: [heatercore, component, ac, acausal]
references: []
generated: true
---

# HeaterCore

Reusable acausal **ac-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HeaterCore inst(cool$, UA_cool, eps_air)
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
// HeaterCore: the cabin-heating radiator — 85 C engine coolant warms a cold
// ventilation air stream (278 K, W = 0.003) through the shared wall node.
LiquidSource   CLNT(fluid$ = Water, mdot = 0.15, P = 250000, T = 358)
MoistAirSource AIR(P = 101325, T = 278, W = 0.003, mdot = 0.12)
HeaterCore     HC(cool$ = Water, UA_cool = 300, eps_air = 0.75)
LiquidSink     CSNK()
MoistAirSink   ASNK()
connect(CLNT.out, HC.cool_in)
connect(HC.cool_out, CSNK.in)
connect(AIR.out, HC.air_in)
connect(HC.air_out, ASNK.in)
t_cool_out = Temperature(Water, P = 250000, h = CSNK.h)
t_air_out  = Temperature(AirH2O, h = ASNK.h, P = 101325, W = ASNK.W)

{ CHECK air.out.h 12404.99902 0.012404999019747271 }
{ CHECK air.out.mdot 0.12 1.2e-7 }
{ CHECK air.out.p 101325 0.101325 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
air.out.h = 12404.99902
air.out.mdot = 0.12
air.out.p = 101325
```

<!-- verified-reference-example:end -->
