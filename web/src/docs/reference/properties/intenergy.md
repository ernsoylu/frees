---
name: intenergy
category: Fluid Properties
summary: Fluid property: intenergy from the real-fluid property backend.
related: []
examples: []
tags: [intenergy, property, fluid, coolprop]
references: []
---

# intenergy

Returns the **intenergy** of a real fluid from any valid pair of independent state properties (rustprop, a pure-Rust port of CoolProp 8.0.0).

> Real-fluid/material/symbolic operation — see the inputs and references below.

## Syntax

```
intenergy(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

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
