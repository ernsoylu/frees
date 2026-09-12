---
name: rank
category: Matrix
summary: Matrix rank
related: []
examples: []
tags: [rank, matrix]
---

# rank

Matrix rank


## Syntax

```
rank(A)
```

## Description

Matrix rank

## Mathematical Formulation

$$ \operatorname{rank}(A) = \#\{\sigma_i > \text{tol}\} \quad\text{(numerical, via SVD)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
A[1,1] = 0; A[1,2] = 1
A[2,1] = -2; A[2,2] = -3
B[1,1] = 0; B[2,1] = 1
C[1,1] = 1; C[1,2] = 0
[Co] = ctrb(A, B)
[Ob] = obsv(A, C)
[rc] = rank(Co)
[ro] = rank(Ob)
[Wc] = gram(A, B, 'c')
[Wo] = gram(A, C, 'o')

{ CHECK Co[1,1] 0 1e-8 }
{ CHECK Co[1,2] 1 0.000001 }
{ CHECK Co[2,1] 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
Co[1,1] = 0
Co[1,2] = 1
Co[2,1] = 1
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Square input matrix. |
