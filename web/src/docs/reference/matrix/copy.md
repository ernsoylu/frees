---
name: copy
category: Matrix
summary: BLAS vector copy.
related: [scal, axpy]
examples: []
tags: [copy]
---

# copy

BLAS vector copy.

## Syntax

```
y = copy(x)
```

## Description

`y = copy(x)` returns a copy of the vector `x` (BLAS level-1 `copy`).

## Examples

<!-- verified-reference-example:start -->

### Verified example — Copy a measurement vector

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
x = [1, 2, 3]
y = copy(x)

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

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Vector | Yes | Vector. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Vector | Same values as `x`. |
