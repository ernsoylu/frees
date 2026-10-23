---
name: HeaterCore
category: Component (ac)
summary: "Heater core: the cabin-heating radiator — hot coolant warms the ventilation air stream through the shared wall node."
related: []
examples: []
tags: [heatercore, component, ac, acausal]
references: []
---

# HeaterCore

Heater core: the cabin-heating radiator — hot coolant warms the ventilation air stream through the shared wall node.

Same structure as Radiator, named for the application (HVAC schematic clarity).

Reusable acausal **ac-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/ac.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HeaterCore inst(cool$, UA_cool, eps_air)
```

## Ports

`cool_in`, `cool_out`, `air_in`, `air_out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `cool$` | String | Coolant name (e.g. EG50, Water). |
| `UA_cool` | Number | Coolant-side conductance to the shared wall [W/K]. |
| `eps_air` | Number | Air-side effectiveness against the wall temperature [-]. |

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
LiquidSource   CLNT(fluid$ = Water, mdot = 0.15 [kg/s], P = 250000 [Pa], T = 358 [K])
MoistAirSource AIR(P = 101325 [Pa], T = 278 [K], W = 0.003, mdot = 0.12 [kg/s])
HeaterCore     HC(cool$ = Water, UA_cool = 300 [W/K], eps_air = 0.75)
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
