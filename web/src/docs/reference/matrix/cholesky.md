---
name: cholesky
category: Matrix
summary: Cholesky decomposition
related: []
examples: []
tags: [cholesky, matrix]
---

# cholesky

Cholesky decomposition


## Syntax

```
[L] = cholesky(A)
```

## Description

Cholesky decomposition

## Mathematical Formulation

$$ A = L\,L^\top \quad\text{(} A \text{ symmetric positive-definite)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Analyze a two-channel matrix

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
A = [4, 0; 0, 9]
[result] = cholesky(A)

{ CHECK result[1,1] 2 0.000002 }
{ CHECK result[1,2] 0 1e-8 }
{ CHECK result[2,1] 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result[1,1] = 2
result[1,2] = 0
result[2,1] = 0
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Square input matrix. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `L` | Number/Array | Length [m]. |
