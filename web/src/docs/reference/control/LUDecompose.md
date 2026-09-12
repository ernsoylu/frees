---
name: LUDecompose
category: Matrix
summary: LU decomposition of a matrix (A = L·U).
related: [SolveLinear, Inverse, Determinant]
examples: []
tags: [matrix, lu decomposition, factorization, linear solve]
---

# LUDecompose

Returns the **LU decomposition** of a square matrix `A` — a lower-triangular `L`
and upper-triangular `U` whose product is `A` (with partial pivoting). It is the
workhorse factorization behind linear solves and determinants.

## Syntax

```
[L, U] = LUDecompose(A)
[L, U] = LUDecompose(A)
```

## Mathematical Formulation

With a permutation `P` for partial pivoting:

$$ P A = L U $$

where `L` is unit-lower-triangular and `U` upper-triangular. Then `det(A) = ±∏ U_{ii}`.

> **Method:** Gaussian elimination with partial pivoting.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Factor a coupled linear system

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
A = [4, 1; 2, 3]
[L, U] = LUDecompose(A)

{ CHECK A[1,1] 4 0.000004 }
{ CHECK A[1,2] 1 0.000001 }
{ CHECK A[2,1] 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
A[1,1] = 4
A[1,2] = 1
A[2,1] = 2
```

<!-- verified-reference-example:end -->

```
{ [L, U] = LUDecompose(A) }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | Square matrix. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `L` | Matrix | Lower-triangular factor. |
| `U` | Matrix | Upper-triangular factor. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `SINGULAR_MATRIX` | a zero pivot remains | The matrix is singular; LU is not unique. |
