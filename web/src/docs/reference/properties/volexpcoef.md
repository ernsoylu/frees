---
name: volexpcoef
category: Fluid Properties
summary: Fluid property: volexpcoef from the real-fluid property backend.
related: []
examples: []
tags: [volexpcoef, property, fluid, coolprop]
references: []
---

# volexpcoef

Returns the **volexpcoef** of a real fluid from any valid pair of independent state properties (rustprop, a pure-Rust port of CoolProp 8.0.0).

> Real-fluid/material/symbolic operation — see the inputs and references below.

## Syntax

```
volexpcoef(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Find liquid-water thermal expansion

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = volexpcoef(Water, T=300, P=101325)

{ CHECK result 0.0002748050321 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.0002748050321
```

<!-- verified-reference-example:end -->
