---
name: ger
category: Matrix Functions
summary: Reference page for ger.
related: []
examples: []
tags: [ger]
---

# ger

`ger` is available in the frees matrix functions surface.

## Syntax

```
ger(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Update a matrix with an outer product

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
x = [1; 2]
y = [3; 4]
A = [0, 0; 0, 0]
B = ger(1, x, y, A)

{ CHECK A[1,1] 0 1e-8 }
{ CHECK A[1,2] 0 1e-8 }
{ CHECK A[2,1] 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
A[1,1] = 0
A[1,2] = 0
A[2,1] = 0
```

<!-- verified-reference-example:end -->
