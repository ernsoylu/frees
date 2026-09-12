---
name: ThreeZoneHX
category: Component (twophase)
summary: A three-zone (subcooled / two-phase / superheat) heat exchanger.
related: []
examples: []
tags: [threezonehx, component, twophase, acausal]
---

# ThreeZoneHX

A three-zone (subcooled / two-phase / superheat) heat exchanger.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`hot_in`, `hot_out`, `cold_in`, `cold_out`

## Usage

```
ThreeZoneHX inst(UA, hot$, cold$, arr$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `UA` | Number | Overall conductance UA [W/K]. |
| `hot$` | String | Hot-side fluid name (e.g. Water). |
| `cold$` | String | Cold-side fluid name (e.g. EG50). |
| `arr$` | String | Flow arrangement (passed to hx_effectiveness) — one of `counterflow`, `parallel`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
HeatExchanger Z1(UA=UA/3, hot$=hot$, cold$=cold$, arr$=arr$)
HeatExchanger Z2(UA=UA/3, hot$=hot$, cold$=cold$, arr$=arr$)
HeatExchanger Z3(UA=UA/3, hot$=hot$, cold$=cold$, arr$=arr$)
connect(hot_in, Z1.hot_in)
connect(Z1.hot_out, Z2.hot_in)
connect(Z2.hot_out, Z3.hot_in)
connect(Z3.hot_out, hot_out)
connect(cold_in, Z3.cold_in)
connect(Z3.cold_out, Z2.cold_in)
connect(Z2.cold_out, Z1.cold_in)
connect(Z1.cold_out, cold_out)
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// ThreeZoneHX: three chained counterflow HeatExchanger zones (UA/3 each) as an
// air-to-air recuperator — 450 K exhaust preheats 300 K charge air, so the
// cold outlet (~412 K) climbs above the hot outlet (~357 K), the signature of
// counterflow. Air on both sides is deliberate: with Water the unsolved
// intermediate enthalpies start at the default guess ~1 J/kg, one J above
// water's triple-point property cliff, and the 76-equation block stalls Newton
// after ~95 s of retry ladder; Air's reference state (h = 0 at the ~79 K NBP)
// leaves a wide valid neighborhood around the same guess and it solves in
// under a second.
Source      HOT(fluid$ = Air, mdot = 0.3, P = 110000, T = 450)
Source      COLD(fluid$ = Air, mdot = 0.25, P = 300000, T = 300)
ThreeZoneHX HX(UA = 600, hot$ = Air, cold$ = Air, arr$ = counter)
Sink        HSNK()
Sink        CSNK()
connect(HOT.out, HX.hot_in)
connect(HX.hot_out, HSNK.in)
connect(COLD.out, HX.cold_in)
connect(HX.cold_out, CSNK.in)
t_hot_out  = Temperature(Air, P = 110000, h = HSNK.h)
t_cold_out = Temperature(Air, P = 300000, h = CSNK.h)

{ CHECK cold.out.h 425848.6518 0.425848651817715 }
{ CHECK cold.out.mdot 0.25 2.5e-7 }
{ CHECK cold.out.p 300000 0.3 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cold.out.h = 425848.6518
cold.out.mdot = 0.25
cold.out.p = 300000
```

<!-- verified-reference-example:end -->
