---
name: diag
category: Matrix
summary: Diagonal matrix built from a vector.
related: [eye, zeros, Transpose]
examples: [estimator-gramian-balreal]
tags: [matrix, diagonal, construction, linear algebra]
references: []
---

# diag

Builds a square **diagonal matrix** whose diagonal is the supplied vector and whose
off-diagonal entries are zero. Common for assembling weighting matrices (e.g. the
`Q`/`R` of an LQR/LQE design).

## Syntax

```
M = diag(v)
```

## Description

For a length-`n` vector `v`, returns the `n×n` matrix `M` with `M[i,i] = v[i]`.

## Mathematical Formulation

$$ M_{ij} = \begin{cases} v_i & i = j \\ 0 & i \neq j \end{cases} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
I = eye(3)
Z = zeros(2,2)
u = ones(3,1)
D = diag([2; 5; 7])
g = linspace(0, 10, 5)

{ CHECK D[1,1] 2 0.000002 }
{ CHECK D[1,2] 0 1e-8 }
{ CHECK D[1,3] 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
D[1,1] = 2
D[1,2] = 0
D[1,3] = 0
```

<!-- verified-reference-example:end -->

### Example 1 — Weighting matrix for an estimator design

[Run: estimator-gramian-balreal]

**Expected:** a diagonal matrix used as a noise/weighting matrix in the design.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `v` | Vector | Yes | The diagonal entries. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `M` | Matrix | `n×n` diagonal matrix. |
