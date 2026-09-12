---
name: Rankine Steam Power Cycle
category: Cookbook
guide: true
summary: Model an ideal steam Rankine cycle and compute its thermal efficiency.
examples: [rankine-cycle]
tags: [cookbook, rankine, steam, power cycle, efficiency, thermodynamics]
related: [Enthalpy, Entropy, Quality, Pump, Boiler, Turbine, Condenser]
---

# Rankine Steam Power Cycle

**Goal:** model the ideal steam power cycle and read off its **thermal efficiency**
from real-water properties.

## What you'll build

[Diagram: RankineCycle]

Water is carried around four state points:

1. **Pump** — isentropic compression of saturated liquid to the boiler pressure.
2. **Boiler** — heat addition `q_in` to superheated vapor.
3. **Turbine** — isentropic expansion to the condenser pressure, producing `w_turb`.
4. **Condenser** — heat rejection `q_out` back to saturated liquid.

## Approach

Fix the boiler and condenser pressures, then evaluate each enthalpy from the
fluid state. The ideal-cycle balances are:

$$ w_{turb} = h_3 - h_4,\quad w_{pump} = h_2 - h_1,\quad q_{in} = h_3 - h_2,\quad \eta_{th} = \frac{w_{turb} - w_{pump}}{q_{in}} $$

The isentropic turbine sets `s_4 = s_3` (use `Entropy` at state 3, then
`Enthalpy` at the condenser pressure with that entropy). Check the
turbine-exit `Quality` — too low risks blade erosion (reheat fixes it).

## Worked example

[Run: rankine-cycle]

**What it tells you:** the thermal efficiency and the turbine-exit quality. Raising
the boiler pressure/temperature or lowering the condenser pressure increases `η_th`;
a reheat stage keeps the exit quality acceptable.

## Build it from components

A connected plant chains `Pump` → `Boiler` → `Turbine`
→ `Condenser` on a single `fluid$` stream.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rankine Cycle

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// Rankine Cycle (Steam)
{ Ideal steam Rankine cycle using real-water properties. }
P_boiler = 8000 [kPa]
P_cond = 10 [kPa]

{ State 1: saturated liquid leaving the condenser }
h1 = Enthalpy(Water, P=P_cond, x=0)
v1 = Volume(Water, P=P_cond, x=0)

{ Pump (state 1 -> 2) }
w_pump = v1 * (P_boiler - P_cond)
h2 = h1 + w_pump

{ State 3: boiler exit (superheated) }
h3 = Enthalpy(Water, P=P_boiler, T=480 [C])
s3 = Entropy(Water, P=P_boiler, T=480 [C])

{ State 4: turbine exit (isentropic, s4 = s3) }
h4 = Enthalpy(Water, P=P_cond, s=s3)

{ Performance }
q_in = h3 - h2
w_turb = h3 - h4
eta_th = (w_turb - w_pump) / q_in

{ CHECK eta_th 0.3911971621 3.911971620899029e-7 }
{ CHECK h1 191805.9446 0.1918059445588841 }
{ CHECK h2 199878.011 0.19987801103599243 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
eta_th = 0.3911971621
h1 = 191805.9446 [J/kg]
h2 = 199878.011 [J/kg]
```

<!-- verified-reference-example:end -->
