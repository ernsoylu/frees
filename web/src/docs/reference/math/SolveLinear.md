---
name: SolveLinear
category: Math
summary: Solve A·x = b (same as A \\ b)
related: []
examples: []
tags: [solvelinear, math]
---

# SolveLinear

Solve A·x = b (same as A \\ b)


## Syntax

```
SolveLinear(A, b)
```

## Description

Solve A·x = b (same as A \\ b)

## Mathematical Formulation

$$ A\,x = b \;\Rightarrow\; x = A^{-1}b \quad\text{(via } PA = LU\text{, forward/back substitution)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
A = [2 0; 0 4]
b = [6; 8]
x = SolveLinear(A, b)

{ CHECK A[1,1] 2 0.000002 }
{ CHECK A[1,2] 0 1e-8 }
{ CHECK A[2,1] 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
A[1,1] = 2
A[1,2] = 0
A[2,1] = 0
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Matrix. |
| `b` | Number | Yes | Second operand. |
