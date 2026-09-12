---
name: gemm
category: Math
summary: BLAS L3: αAB + βC
related: []
examples: []
tags: [gemm, math]
references: []
---

# gemm

BLAS L3: αAB + βC


## Syntax

```
gemm(α, A, B, β, C)
```

## Description

BLAS L3: αAB + βC

## Mathematical Formulation

$$ C \leftarrow \alpha A B + \beta C \quad\text{(BLAS level 3)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compose linear transforms

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
A = [1, 2; 3, 4]
B = [2, 0; 0, 3]
C = [0, 0; 0, 0]
D = gemm(1, A, B, 0, C)

{ CHECK A[1,1] 1 0.000001 }
{ CHECK A[1,2] 2 0.000002 }
{ CHECK A[2,1] 3 0.000003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
A[1,1] = 1
A[1,2] = 2
A[2,1] = 3
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `α` | Number | Yes | Scalar coefficient α. |
| `A` | Number | Yes | Matrix. |
| `B` | Number | Yes | Matrix operand. |
| `β` | Number | Yes | Scalar coefficient β. |
| `C` | Number | Yes | Empirical constant. |
