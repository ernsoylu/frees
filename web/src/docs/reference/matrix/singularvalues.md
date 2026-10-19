---
name: singularvalues
category: Matrix
summary: Singular values of a matrix, largest first.
related: [svd, Eigenvalues, cond]
examples: []
tags: [singularvalues]
---

# singularvalues

Singular values of a matrix, largest first.

## Syntax

```
[s] = SingularValues(A)
```

## Description

`[s] = SingularValues(A)` returns the singular values σ of `A` in descending order. The ratio `s[1] / s[n]` is the 2-norm condition number (see `cond`).

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

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | Real matrix. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `s` | Vector | Singular values, largest first. |
