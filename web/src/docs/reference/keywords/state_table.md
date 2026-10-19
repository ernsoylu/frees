---
name: STATE TABLE
category: Language Keywords
summary: Groups numbered state-point variables of one circuit and binds them to a fluid.
related: [Enthalpy, Temperature, PLOT]
examples: []
tags: [keyword, block, state points, cycle, fluid, thermodynamics]
references: []
---

# STATE TABLE

Groups the variables of one thermodynamic circuit and declares its fluid. The Fluid States window uses it to fill missing properties and to overlay the cycle on a property chart.

## Syntax

```
STATE TABLE name(P1, T1, h1, P2, T2, h2)
  FLUID = Water
END
```

## Description

Every member must carry a **state number** (`T1`, `P_2`, `h[3]`). Variables in different state tables stay separate, so a `P1` in a water loop never mixes with one in a refrigerant loop. The block adds no equations: properties are still computed by your property calls.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Heating water by 100 kJ/kg

```frees
STATE TABLE WaterLoop(P1, T1, h1, P2, T2, h2)
  FLUID = Water
END
P1 = 200000
T1 = 300
h1 = Enthalpy(Water, T=T1, P=P1)
P2 = P1
h2 = h1 + 100000
T2 = Temperature(Water, P=P2, h=h2)

{ CHECK h1 112745.7491 0.001 }
{ CHECK T2 323.9254095 0.000001 }
```

Expected output:

```text
h1 = 112745.7 [J/kg]
T2 = 323.9254 [K]
```

<!-- verified-reference-example:end -->

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `STATE TABLE 'L': variable 'p' has no state number. State variables must be numbered (e.g. p1 or p[1]).` | An unnumbered member. | Number every state variable. |
