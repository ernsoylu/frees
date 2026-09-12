---
name: HeatExchanger
category: Component (fluid)
summary: Transfers heat between two fluid streams across a wall.
related: []
examples: []
tags: [heatexchanger, component, fluid, acausal]
---

# HeatExchanger

Transfers heat between two fluid streams across a wall.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`hot_in`, `hot_out`, `cold_in`, `cold_out`

## Usage

```
HeatExchanger inst(UA, hot$, cold$, arr$)
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

$$
\begin{aligned}
hot_{out.mdot} &= hot_{in.mdot} \\
hot_{out.p} &= hot_{in.p} \\
cold_{out.mdot} &= cold_{in.mdot} \\
cold_{out.p} &= cold_{in.p} \\
th &= \text{Temperature}\left(\mathrm{hot}, =hot_{in.p}, p=hot_{in.h}\right) \\
tc &= \text{Temperature}\left(\mathrm{cold}, =cold_{in.p}, p=cold_{in.h}\right) \\
c_{h} &= hot_{in.mdot}\cdot \text{Cp}\left(\mathrm{hot}, =hot_{in.p}, p=hot_{in.h}\right) \\
c_{c} &= cold_{in.mdot}\cdot \text{Cp}\left(\mathrm{cold}, =cold_{in.p}, p=cold_{in.h}\right) \\
cmin &= \text{min}\left(c_{h}, c_{c}\right) \\
cmax &= \text{max}\left(c_{h}, c_{c}\right) \\
eps &= \text{hx\_effectiveness}\left(arr\$, \frac{ua}{cmin}, \frac{cmin}{cmax}\right) \\
q &= eps\cdot cmin\cdot \left(th - tc\right) \\
hot_{out.h} &= hot_{in.h} - \frac{q}{hot_{in.mdot}} \\
cold_{out.h} &= cold_{in.h} + \frac{q}{cold_{in.mdot}}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
HeatExchanger HX(h_in, h_out, c_in, c_out, UA=5000 [W/K], hot$=Water, cold$=Water, arr$=counterflow)
h_in.P = 200000 [Pa];   h_in.mdot = 2 [kg/s]
h_in.h = Enthalpy(Water, T=350 [K], P=200000 [Pa])
c_in.P = 200000 [Pa];   c_in.mdot = 3 [kg/s]
c_in.h = Enthalpy(Water, T=290 [K], P=200000 [Pa])

{ CHECK c_in.h 70917.56958 0.07091756957554723 }
{ CHECK c_in.mdot 3 0.000003 }
{ CHECK c_in.p 200000 0.19999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c_in.h = 70917.56958
c_in.mdot = 3
c_in.p = 200000
```

<!-- verified-reference-example:end -->
