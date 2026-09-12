---
name: interp2
category: Built-in Functions
summary: Reference page for interp2.
related: []
examples: []
tags: [interp2]
---

# interp2

`interp2` is available in the frees built-in functions surface.

## Syntax

```
interp2(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Interpolate a calibration grid

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
x = [0, 1]
y = [0, 1]
z = [0, 1; 2, 3]
[result] = interp2(x, y, z, 0.5, 0.5)

{ CHECK result 1.5 0.0000015 }
{ CHECK x[1] 0 1e-8 }
{ CHECK x[2] 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 1.5
x[1] = 0
x[2] = 1
```

<!-- verified-reference-example:end -->
