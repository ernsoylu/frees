---
name: quality
category: Fluid Properties
summary: Vapour mass fraction, or -1 for single-phase states.
related: [enthalpy, temperature, pressure]
examples: []
tags: [quality, property, fluid, coolprop]
references: []
---

# quality

Returns the vapour mass fraction of a real fluid, or `-1` outside the two-phase region.

## Syntax

```
x = Quality(Fluid, P=p, h=h)
```

```
x = Quality(Fluid, P=p, T=t)
```

## Description

Supply a real-fluid name and two independent state coordinates supported by the
backend. Names are case-insensitive. In the two-phase region, quality is between
0 (saturated liquid) and 1 (saturated vapour). At saturation, temperature and
pressure alone do not determine quality; use pressure and enthalpy, for example.
For a single-phase state, the default rustprop backend returns `-1`. Do not
interpret this sentinel as a negative physical vapour fraction or clamp it to zero.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
Vol_vessel = 0.080
m = 4
P_ves = 160000
v_avg = Vol_vessel / m
T_sat = Temperature(R134a, P=P_ves, x=0)
x = Quality(R134a, P=P_ves, v=v_avg)
vol_f = Volume(R134a, P=P_ves, x=0)
vol_g = Volume(R134a, P=P_ves, x=1)
x_check = (v_avg - vol_f) / (vol_g - vol_f)
h_f = Enthalpy(R134a, P=P_ves, x=0)
h_g = Enthalpy(R134a, P=P_ves, x=1)
h_fg = h_g - h_f
m_vap = x * m
Vol_vapor = m_vap * vol_g

{ CHECK h_f 179370.2684 0.1793702684251069 }
{ CHECK h_fg 209898.2539 0.20989825388788363 }
{ CHECK h_g 389268.5223 0.38926852231299053 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
h_f = 179370.2684 [J/kg]
h_fg = 209898.2539 [J/kg]
h_g = 389268.5223 [J/kg]
```

<!-- verified-reference-example:end -->

### Superheated steam

Paste this document into the editor and solve:

```frees
x = Quality(Water, T=400 [K], P=101325 [Pa])
{ CHECK x -1 0 }
```

Expected result:

```text
x = -1
```

## Input Arguments

### Fluid — Real-fluid name

Name or alias recognized by the real-fluid backend.

**Example:** `Water`

**Data Types:** `identifier` | `string`

### p — Absolute pressure

Pressure coordinate in pascals; unit-annotated values convert to SI.

**Example:** `P=101325 [Pa]`

**Data Types:** `number`

### h — Specific enthalpy

Enthalpy coordinate in J/kg, used with pressure to identify a two-phase state.

**Example:** `h=1000000 [J/kg]`

**Data Types:** `number`

### t — Absolute temperature

Temperature coordinate in kelvin, used with pressure for a single-phase state.

**Example:** `T=400 [K]`

**Data Types:** `number`

## Output Arguments

### x — Vapour mass fraction or sentinel

Dimensionless scalar; `-1` denotes a single-phase state for the default backend.

**Example:** `x = -1`

**Data Types:** `number`

## Version History

**Introduced in current version.** Since the D12 backend change (September 2026),
native builds also use rustprop by default and return `-1` for single-phase states.
