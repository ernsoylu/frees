---
name: scal
category: Matrix Functions
summary: Reference page for scal.
related: []
examples: []
tags: [scal]
---

# scal

`scal` is available in the frees matrix functions surface.

## Syntax

```
scal(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Scale a measurement vector

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
x = [1, 2, 3]
y = scal(2, x)

{ CHECK x[1] 1 0.000001 }
{ CHECK x[2] 2 0.000002 }
{ CHECK x[3] 3 0.000003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
x[1] = 1
x[2] = 2
x[3] = 3
```

<!-- verified-reference-example:end -->
