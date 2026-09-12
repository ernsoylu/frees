---
name: SteamHumidifier
category: Component (moistair)
summary: Acausal moistair-domain component SteamHumidifier with ports in, out.
related: []
examples: []
tags: [steamhumidifier, component, moistair, acausal]
references: []
generated: true
---

# SteamHumidifier

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SteamHumidifier inst(W_set, h_steam, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `W_set` | Number |
| `h_steam` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
out.w &= w_{set} \\
mdot_{w} &= in.mdot\cdot \left(w_{set} - in.w\right) \\
out.h &= in.h + \frac{mdot_{w}\cdot h_{steam}}{in.mdot}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rate an HVAC component at specified inlet conditions

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
SteamHumidifier C(W_set=0.015, h_steam=2676000)
C.in.mdot = 1 [kg/s]
C.in.P = 101325 [Pa]
C.in.W = 0.012
C.in.h = Enthalpy(AirH2O, T=303.15, P=101325, W=0.012)

{ CHECK c.in.h 60848.84667 0.06084884666848224 }
{ CHECK c.mdot_w 0.003 1e-8 }
{ CHECK c.out.h 68876.84667 0.06887684666848223 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.in.h = 60848.84667
c.mdot_w = 0.003
c.out.h = 68876.84667
```

<!-- verified-reference-example:end -->
