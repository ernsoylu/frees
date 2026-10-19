---
name: intenergy
category: Fluid Properties
summary: Specific internal energy [J/kg] of a fluid at a state fixed by named inputs.
related: []
examples: []
tags: [intenergy, property, fluid, rustprop]
references: []
---

# intenergy

Specific internal energy [J/kg] of a fluid at a state fixed by named inputs.

## Syntax

```
u = IntEnergy(Fluid, X1=…, X2=…)
```

## Description

`IntEnergy(Fluid, X1=…, X2=…)` returns the specific internal energy [J/kg] of `Fluid` at the state fixed by two named inputs (see *Valid input pairs*). `Fluid` is a fluid name or alias, bare (`Water`) or as a string variable (`fluid$`); names and indicators are case-insensitive. Results are in SI base units.

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
| Ideal gases (spelled formulas: `N2`, `CO2`, `CH4`, …) | ✓ | `T` only |
| Incompressibles and glycols (`EG50`, …) | ✓ | `(T, P)`, `(P, h)`, `(P, s)`; no quality |
| Humid air (`AirH2O`) | — | Not a humid-air output |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
T1 = 353.15
P1 = 5000000
u_exact = IntEnergy(Water, T=T1, P=P1)
u_approx = IntEnergy(Water, T=T1, x=0)
err_pct = (u_approx - u_exact) / u_exact * 100

{ CHECK err_pct 0.3421867481 3.42186748147324e-7 }
{ CHECK u_approx 334963.5612 0.334963561194217 }
{ CHECK u_exact 333821.269 0.333821269049034 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
err_pct = 0.3421867481
u_approx = 334963.5612 [J/kg]
u_exact = 333821.269 [J/kg]
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Fluid` | Name or string | Yes | Fluid name or alias (`Water`, `R134a`, `r744`, …) or a string variable such as `fluid$`. See *Supported Fluids*. |
| `X1=…, X2=…` | Number | Yes | Two named state inputs from *Valid input pairs*, in SI units. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `u` | Number | Specific internal energy [J/kg]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `IntEnergy requires a fluid and exactly two property indicators, e.g. …` | One indicator (or three) was given | Pass exactly two, e.g. `T=…, P=…`. |
| `Unknown property indicator 'z' in IntEnergy(...). Supported: d, h, p, q, rho, s, t, u, v, x` | Misspelled indicator | Use one of the listed indicators. |
| `Input pair variable is invalid and output(s) are non-trivial; cannot do state update` | Unsupported pair, e.g. `(h, u)`, or the same indicator twice | Use a pair from *Valid input pairs*. The message appears inside “Newton iteration stalled after 0 iteration(s)”. |
| `Unknown fluid 'name' in …. Check the spelling against Help → Supported Fluids.` | The fluid name is not one frees or CoolProp knows | Check the spelling against *Supported Fluids*. |
| `For now, we don't support T [200 K] below Tmelt(p) [273.15… K]` | State below the melting line | Raise `T`, or check the unit annotation (`[C]` vs K). |
| `For pseudo-pure fluid, quality must be equal to 0 or 1.` | Two-phase quality on a pseudo-pure mixture such as `Air` | Use `x=0` or `x=1`, or a single-phase pair. |
| `IntEnergy(N2, ...) is an ideal-gas function of temperature only, e.g. IntEnergy(N2, T=300)` | Ideal gas called with a pressure | Pass only `T` for an ideal gas. |
| `Unknown humid-air function: …. Supported: cp, dewpoint, enthalpy, entropy, gibbs, humrat, relhum, specheat, temperature, volume, wetbulb` | `IntEnergy` called with `AirH2O` | Use one of the humid-air functions listed. |
