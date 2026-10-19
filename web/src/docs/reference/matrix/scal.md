---
name: scal
category: Matrix
summary: BLAS vector scaling α·x.
related: [axpy, copy, ger]
examples: []
tags: [scal]
---

# scal

BLAS vector scaling α·x.

## Syntax

```
y = scal(alpha, x)
```

## Description

`y = scal(alpha, x)` returns the BLAS level-1 scaling `alpha · x`.

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

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `alpha` | Number | Yes | Scale factor. |
| `x` | Vector | Yes | Vector. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Vector | Scaled vector, same length as `x`. |
