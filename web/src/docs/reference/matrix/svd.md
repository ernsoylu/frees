---
name: svd
category: Matrix
summary: Singular value decomposition
related: []
examples: []
tags: [svd, matrix]
---

# svd

Singular value decomposition


## Syntax

```
[U, S, V] = svd(A)
```

## Description

Singular value decomposition

## Mathematical Formulation

$$ A = U\,\Sigma\,V^\top, \qquad \Sigma = \operatorname{diag}(\sigma_1 \ge \dots \ge \sigma_r > 0) $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
A = [3, 2, 2; 2, 3, -2]
[u, s, v] = svd(A)

{ CHECK A[1,1] 3 0.000003 }
{ CHECK A[1,2] 2 0.000002 }
{ CHECK A[1,3] 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
A[1,1] = 3
A[1,2] = 2
A[1,3] = 2
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Square input matrix. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `U` | Number/Array | Computed `U`. |
| `S` | Number/Array | Nucleate-suppression factor. |
| `V` | Number/Array | Velocity [m/s]. |
