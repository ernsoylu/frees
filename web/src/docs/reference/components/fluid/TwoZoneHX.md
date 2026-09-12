---
name: TwoZoneHX
category: Component (fluid)
summary: A two-zone heat exchanger resolving distinct thermal regions.
related: []
examples: []
tags: [twozonehx, component, fluid, acausal]
---

# TwoZoneHX

A two-zone heat exchanger resolving distinct thermal regions.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`hot_in`, `hot_out`, `cold_in`, `cold_out`

## Usage

```
TwoZoneHX inst(UA, hot$, cold$, arr$)
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
HeatExchanger C1(UA=UA/2, hot$=hot$, cold$=cold$, arr$=arr$)
HeatExchanger C2(UA=UA/2, hot$=hot$, cold$=cold$, arr$=arr$)
connect(hot_in, C1.hot_in)
connect(C1.hot_out, C2.hot_in)
connect(C2.hot_out, hot_out)
connect(cold_in, C2.cold_in)
connect(C2.cold_out, C1.cold_in)
connect(C1.cold_out, cold_out)
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// TwoZoneHX: the hierarchical two-cell counterflow exchanger (two nested
// HeatExchangers at UA/2 each, counter-plumbed). Air on both sides — the
// wide (P,h) surface keeps the 49-equation inner block Newton-stable.
Source    HS(h1, fluid$ = Air, mdot = 0.4, P = 110000, T = 450)
Source    CS(c1, fluid$ = Air, mdot = 0.5, P = 200000, T = 300)
TwoZoneHX HX(h1, h2, c1, c2, UA = 300, hot$ = Air, cold$ = Air, arr$ = counterflow)
Sink      SKH(h2)
Sink      SKC(c2)

th_out = SKH.h
tc_out = SKC.h
q_hot  = 0.4 * (h1.h - h2.h)

{ CHECK c1.h 426074.4802 0.4260744801707202 }
{ CHECK c1.mdot 0.5 5e-7 }
{ CHECK c1.p 200000 0.19999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c1.h = 426074.4802
c1.mdot = 0.5
c1.p = 200000
```

<!-- verified-reference-example:end -->
