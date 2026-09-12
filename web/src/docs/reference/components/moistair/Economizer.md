---
name: Economizer
category: Component (moistair)
summary: Acausal moistair-domain component Economizer with ports oa_in, ret_in, mix_out.
related: []
examples: []
tags: [economizer, component, moistair, acausal]
references: []
generated: true
---

# Economizer

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Economizer inst(mdot_sup, f_min, lim, band, domain$, model$)
```

## Ports

`oa_in`, `ret_in`, `mix_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `mdot_sup` | Number |
| `f_min` | Number |
| `lim` | Number |
| `band` | Number |
| `domain$` | String |
| `model$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
mix_{out.p} &= oa_{in.p} \\
mix_{out.mdot} &= mdot_{sup} \\
oa_{in.mdot} &= f_{oa}\cdot mdot_{sup} \\
ret_{in.mdot} &= \left(1 - f_{oa}\right)\cdot mdot_{sup} \\
f_{oa} &= f_{min} + \left(1 - f_{min}\right)\cdot g_{diff}\cdot g_{lim} \\
mix_{out.mdot}\cdot mix_{out.w} &= oa_{in.mdot}\cdot oa_{in.w} + ret_{in.mdot}\cdot ret_{in.w} \\
mix_{out.mdot}\cdot mix_{out.h} &= oa_{in.mdot}\cdot oa_{in.h} + ret_{in.mdot}\cdot ret_{in.h}
\end{aligned}
$$

## Model Variants

Selected via the `model$` parameter; each adds its own equations (and `REQUIRE`d parameters):

### `drybulb`

$$
\begin{aligned}
t_{oa} &= \text{Temperature}\left(\mathrm{airh2o}, h=oa_{in.h}, p=oa_{in.p}, w=oa_{in.w}\right) \\
t_{ret} &= \text{Temperature}\left(\mathrm{airh2o}, h=ret_{in.h}, p=ret_{in.p}, w=ret_{in.w}\right) \\
g_{diff} &= 0.5\,\left(1 + \tanh\left(\frac{t_{ret} - t_{oa}}{band}\right)\right) \\
g_{lim} &= 0.5\,\left(1 + \tanh\left(\frac{lim - t_{oa}}{band}\right)\right)
\end{aligned}
$$

### `enthalpy`

$$
\begin{aligned}
g_{diff} &= 0.5\,\left(1 + \tanh\left(\frac{ret_{in.h} - oa_{in.h}}{band}\right)\right) \\
g_{lim} &= 0.5\,\left(1 + \tanh\left(\frac{lim - oa_{in.h}}{band}\right)\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Mix outdoor and return air for free cooling

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
Economizer C(mdot_sup=2, f_min=0.2, lim=298.15, band=1)
C.oa_in.P = 101325 [Pa]
C.oa_in.W = 0.006
C.oa_in.h = Enthalpy(AirH2O, T=288.15, P=101325, W=0.006)
C.ret_in.P = 101325 [Pa]
C.ret_in.W = 0.01
C.ret_in.h = Enthalpy(AirH2O, T=298.15, P=101325, W=0.01)

{ CHECK c.f_oa 0.9999999967 9.99999996702154e-7 }
{ CHECK c.g_diff 0.9999999979 9.999999979388463e-7 }
{ CHECK c.g_lim 0.9999999979 9.999999979388463e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.f_oa = 0.9999999967
c.g_diff = 0.9999999979
c.g_lim = 0.9999999979
```

<!-- verified-reference-example:end -->
