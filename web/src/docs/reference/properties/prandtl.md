---
name: prandtl
category: Fluid Properties
summary: Fluid property: prandtl from the real-fluid property backend.
related: []
examples: []
tags: [prandtl, property, fluid, coolprop]
references: []
---

# prandtl

Returns the **prandtl** of a real fluid from any valid pair of independent state properties (rustprop, a pure-Rust port of CoolProp 8.0.0).

> Real-fluid/material/symbolic operation — see the inputs and references below.

## Syntax

```
prandtl(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a scalar engineering calculation

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = prandtl(Water, T=300, P=101325)

{ CHECK result 5.855926515 0.000005855926514897941 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 5.855926515
```

<!-- verified-reference-example:end -->
