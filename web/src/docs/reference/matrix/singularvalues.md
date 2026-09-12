---
name: singularvalues
category: Matrix
summary: Reference page for singularvalues.
related: []
examples: []
tags: [singularvalues]
---

# singularvalues

Returns the singular values of a matrix.

## Syntax

```
[s] = singularvalues(A)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Analyze a two-channel matrix

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
A = [4, 0; 0, 9]
[result] = singularvalues(A)

{ CHECK result[1] 9 0.000009 }
{ CHECK result[2] 4 0.000004 }
{ CHECK A[1,1] 4 0.000004 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result[1] = 9
result[2] = 4
A[1,1] = 4
```

<!-- verified-reference-example:end -->
