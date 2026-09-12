---
name: PumpMap
category: Component (fluid)
summary: A pump whose head comes from a tabulated performance map (head vs volumetric flow).
related: [Pump, LiquidPumpMap]
examples: []
tags: [pump, pump-family, pumpmap, map, data:rho-map, ports:in-out, flow-closed, energy-pressure, steady, map-driven, component, fluid, acausal]
---

# PumpMap

A pump whose head comes from a tabulated performance map (head vs volumetric flow).

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
PumpMap inst(rho, map$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `rho` | Number | Density [kg/m³]. |
| `map$` | String | Name of a TABLE/FUNCTION giving head [m] vs volumetric flow [m³/s]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
q &= \frac{in.mdot}{rho} \\
head &= \text{map\$}\left(q\right) \\
out.mdot &= in.mdot \\
out.p &= in.p + rho\cdot 9.80665\cdot head
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// PumpMap: head-curve pump, dP = rho*g*map$(Q). Water-like density; the
// head map droops 25 m -> 15 m over 0..0.02 m^3/s, Q = 0.01 gives 20 m.
TABLE hmap(q)
  0      25
  0.02   15
END

PumpMap PM(w1, w2, rho = 998, map$ = hmap)

w1.P    = 150000
w1.mdot = 9.98
dp_pump = w2.P - w1.P
m_out   = w2.mdot

{ CHECK dp_pump 195740.734 0.19574073399999992 }
{ CHECK m_out 9.98 0.00000998 }
{ CHECK pm.head 20 0.000019999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
dp_pump = 195740.734 [Pa]
m_out = 9.98 [kg/s]
pm.head = 20
```

<!-- verified-reference-example:end -->
