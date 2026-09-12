---
name: cp
category: Fluid Properties
summary: Fluid property: cp from the real-fluid property backend.
related: []
examples: []
tags: [cp, property, fluid, coolprop]
references: []
---

# cp

Returns the **cp** of a real fluid from any valid pair of independent state properties (rustprop, a pure-Rust port of CoolProp 8.0.0).

> Real-fluid/material/symbolic operation — see the inputs and references below.

## Syntax

```
cp(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
rho = Density(EG50, T=293.15, P=101325)
cp = Cp(EG50, T=293.15, P=101325)

{ CHECK cp 3312.041904 0.0033120419037405693 }
{ CHECK rho 1064.928663 0.0010649286628298255 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cp = 3312.041904 [J/kg-K]
rho = 1064.928663 [kg/m^3]
```

<!-- verified-reference-example:end -->
