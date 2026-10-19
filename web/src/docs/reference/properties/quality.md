---
name: quality
category: Fluid Properties
summary: Vapour quality (mass fraction of vapour) [–] of a fluid at a state fixed by named inputs.
related: [enthalpy, temperature, pressure]
examples: []
tags: [quality, property, fluid, rustprop]
references: []
---

# quality

Vapour quality (mass fraction of vapour) [–] of a fluid at a state fixed by named inputs.

## Syntax

```
x = Quality(Fluid, X1=…, X2=…)
```

## Description

`Quality(Fluid, X1=…, X2=…)` returns the vapour quality (mass fraction of vapour) [–] of `Fluid` at the state fixed by two named inputs (see *Valid input pairs*). `Fluid` is a fluid name or alias, bare (`Water`) or as a string variable (`fluid$`); names and indicators are case-insensitive. Results are in SI base units.

Returns a value in [0, 1] inside the two-phase dome and **−1** for any single-phase state (subcooled liquid, superheated vapour or supercritical) — the CoolProp convention, so test `x >= 0` before using it as a fraction.

## Valid input pairs

A real-fluid state is fixed by **two** named inputs, in any order and any case. Indicators: `T` [K], `P` [Pa], `h` [J/kg], `s` [J/kg-K], `u` [J/kg], `v` [m^3/kg] (or `d`/`rho` [kg/m^3]), `x` (or `q`) [–]. Pairs verified through the engine for real fluids:

| Pair | Single phase |
| --- | --- |
| `T`, `P` | ✓ |
| `T`, `h` | ✓ |
| `T`, `s` | ✓ |
| `T`, `u` | ✓ |
| `T`, `v` | ✓ |
| `P`, `h` | ✓ |
| `P`, `s` | ✓ |
| `P`, `u` | ✓ |
| `P`, `v` | ✓ |
| `h`, `s` | ✓ |
| `h`, `v` | ✓ |
| `s`, `v` | ✓ |
| `u`, `v` | ✓ |

Inside the two-phase dome use quality with `T`, `P` or `v`: `(T, x)`, `(P, x)`, `(v, x)`. **Not supported:** `(h, u)`, `(s, u)`, and quality with `h`, `s` or `u` — the engine reports *Input pair variable is invalid*.

## Fluid support

| Fluid class | Supported | Inputs |
| --- | --- | --- |
| Real fluids (`Water`, `R134a`, `CarbonDioxide`, …) | ✓ | Every pair in the table above |
| Pseudo-pure mixtures (`Air`) | ✓ | Pairs containing `T` or `P`; `x` only 0 or 1 |
| Ideal gases (spelled formulas: `N2`, `CO2`, `CH4`, …) | — | Use the full fluid name for the real-fluid value |
| Incompressibles and glycols (`EG50`, …) | — | — |
| Humid air (`AirH2O`) | — | Not a humid-air output |

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

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Fluid` | Name or string | Yes | Fluid name or alias (`Water`, `R134a`, `r744`, …) or a string variable such as `fluid$`. See *Supported Fluids*. |
| `X1=…, X2=…` | Number | Yes | Two named state inputs from *Valid input pairs*, in SI units. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `x` | Number | Vapour quality (mass fraction of vapour) [–]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `Quality requires a fluid and exactly two property indicators, e.g. …` | One indicator (or three) was given | Pass exactly two, e.g. `T=…, P=…`. |
| `Unknown property indicator 'z' in Quality(...). Supported: d, h, p, q, rho, s, t, u, v, x` | Misspelled indicator | Use one of the listed indicators. |
| `Input pair variable is invalid and output(s) are non-trivial; cannot do state update` | Unsupported pair, e.g. `(h, u)`, or the same indicator twice | Use a pair from *Valid input pairs*. The message appears inside “Newton iteration stalled after 0 iteration(s)”. |
| `Unknown fluid 'name' in …. Check the spelling against Help → Supported Fluids.` | The fluid name is not one frees or CoolProp knows | Check the spelling against *Supported Fluids*. |
| `For now, we don't support T [200 K] below Tmelt(p) [273.15… K]` | State below the melting line | Raise `T`, or check the unit annotation (`[C]` vs K). |
| `For pseudo-pure fluid, quality must be equal to 0 or 1.` | Two-phase quality on a pseudo-pure mixture such as `Air` | Use `x=0` or `x=1`, or a single-phase pair. |
| `Function 'quality' is not available for the ideal gas N2. Use the full fluid name for real-fluid properties.` | Spelled formula selects the ideal-gas model | Use `Nitrogen`, `CarbonDioxide`, … for the real fluid. |
| `Unknown humid-air function: …. Supported: cp, dewpoint, enthalpy, entropy, gibbs, humrat, relhum, specheat, temperature, volume, wetbulb` | `Quality` called with `AirH2O` | Use one of the humid-air functions listed. |

## Version History

**Introduced in current version.** Since the D12 backend change (September 2026),
native builds also use rustprop by default and return `-1` for single-phase states.
