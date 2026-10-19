---
name: eigvec
category: Matrix
summary: Eigenvectors of a square matrix — the eigenvector half of Eigen.
related: [Eigen, Eigenvalues, eig]
examples: []
tags: [eigvec, eigenvectors, matrix, modes]
---

# eigvec

Returns the **eigenvectors** of a square matrix `A` as the columns of `V`.
`[V] = eigvec(A)` is `[~, V] = Eigen(A)`: the same vectors, in the same order
as the eigenvalues `eig` returns.

## Syntax

```
[V] = eigvec(A)
```

## Description

Column `k` of `V` is the unit-length eigenvector for the `k`-th eigenvalue in
ascending order. Use `Eigen` when you need the eigenvalues alongside them.

## Mathematical Formulation

$$ A v_i = \lambda_i v_i \quad\text{(columns are the eigenvectors)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Mode shapes of a coupled two-state system

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
A = [4, 1; 2, 3]
[V] = eigvec(A)

{ The first column belongs to lambda = 2, the second to lambda = 5. }
{ CHECK V[1,1] -0.4472135955 0.0000004472135955 }
{ CHECK V[2,1] 0.894427191 0.000000894427191 }
{ CHECK V[1,2] 0.7071067812 0.0000007071067812 }
{ CHECK V[2,2] 0.7071067812 0.0000007071067812 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
V = [-0.4472135955, 0.7071067812; 0.894427191, 0.7071067812]
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | Square input matrix. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `V` | Matrix | Unit eigenvectors as columns, ordered like `eig(A)`. |
