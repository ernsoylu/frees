---
name: ss2tfij
category: Control Systems
summary: Reference page for ss2tfij.
related: []
examples: []
tags: [ss2tfij]
---

# ss2tfij

Converts one input/output channel of a state-space model to transfer-function coefficients.

## Syntax

```
[num, den] = ss2tfij(A, B, C, D, i, j)
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
A = [-1, 0; 0, -2]
B = [1, 0; 0, 1]
C = [1, 0; 0, 1]
D = [0, 0; 0, 0]
[num, den] = ss2tfij(A, B, C, D, 1, 1)

{ CHECK den[1] 1 0.000001 }
{ CHECK den[2] 3 0.000003 }
{ CHECK den[3] 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
den[1] = 1
den[2] = 3
den[3] = 2
```

<!-- verified-reference-example:end -->
