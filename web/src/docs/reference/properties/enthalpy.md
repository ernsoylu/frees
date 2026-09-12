---
name: enthalpy
category: Fluid Properties
summary: Fluid property: enthalpy from the real-fluid property backend.
related: []
examples: [rankine-cycle, state-tables-multifluid, rankine-cycle, refrigeration-vcr]
tags: [enthalpy, property, fluid, coolprop]
references: []
---

# enthalpy

Returns the **enthalpy** of a real fluid from any valid pair of independent state properties (rustprop, a pure-Rust port of CoolProp 8.0.0).

> Real-fluid/material/symbolic operation — see the inputs and references below.

## Syntax

```
enthalpy(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
h = Enthalpy(AirH2O, T=298.15, P=101325, R=0.5)
v = Volume(AirH2O, T=298.15, P=101325, R=0.5)

{ CHECK h 50423.45039 0.05042345039075701 }
{ CHECK v 0.8577882434 8.577882434265997e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
h = 50423.45039 [J/kg]
v = 0.8577882434 [m^3/kg]
```

<!-- verified-reference-example:end -->
