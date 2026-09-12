---
name: temperature
category: Fluid Properties
summary: Fluid property: temperature from the real-fluid property backend.
related: []
examples: [pressure-cooker, uncertain-tank-inventory]
tags: [temperature, property, fluid, coolprop]
references: []
---

# temperature

Returns the **temperature** of a real fluid from any valid pair of independent state properties (rustprop, a pure-Rust port of CoolProp 8.0.0).

> Real-fluid/material/symbolic operation — see the inputs and references below.

## Syntax

```
temperature(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
P1 = 500000
h1 = 2890000
T1 = Temperature(Steam, P=P1, h=h1)

{ CHECK T1 489.2130218 0.0004892130217524351 }
{ CHECK h1 2890000 2.8899999999999997 }
{ CHECK P1 500000 0.5 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
T1 = 489.2130218 [K]
h1 = 2890000
P1 = 500000
```

<!-- verified-reference-example:end -->
