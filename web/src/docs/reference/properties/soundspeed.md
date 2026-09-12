---
name: soundspeed
category: Fluid Properties
summary: Fluid property: soundspeed from the real-fluid property backend.
related: []
examples: []
tags: [soundspeed, property, fluid, coolprop]
references: []
---

# soundspeed

Returns the **soundspeed** of a real fluid from any valid pair of independent state properties (rustprop, a pure-Rust port of CoolProp 8.0.0).

> Real-fluid/material/symbolic operation — see the inputs and references below.

## Syntax

```
soundspeed(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Find acoustic speed in liquid water

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = soundspeed(Water, T=300, P=101325)

{ CHECK result 1501.522647 0.001501522646750228 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 1501.522647 [m/s]
```

<!-- verified-reference-example:end -->
