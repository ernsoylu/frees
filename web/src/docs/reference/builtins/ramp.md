---
name: ramp
category: Built-in Functions
summary: Reference page for ramp.
related: []
examples: []
tags: [ramp]
---

# ramp

`ramp` is available in the frees built-in functions surface.

## Syntax

```
ramp(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
DYNAMIC ramp (t = 0 .. 10, points = 101)
  der(y) = 1
  y(0) = 0
END
t7 = TimeAt('y', 7)
y3 = ODEValue('y', 3)

{ CHECK t7 7 0.000006999999999999998 }
{ CHECK y3 3 0.0000030000000000000005 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
t7 = 7
y3 = 3
```

<!-- verified-reference-example:end -->
