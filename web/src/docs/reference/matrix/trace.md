---
name: trace
category: Matrix
summary: Matrix trace
related: []
examples: [sensor-detrend-smooth-window]
tags: [trace, matrix]
---

# trace

Matrix trace


## Syntax

```
trace(A)
```

## Description

Matrix trace

## Mathematical Formulation

$$ \operatorname{tr}(A) = \sum_i A_{ii} = \sum_i \lambda_i $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
A = [1, 2; 3, 4]
t = Trace(A)
f = MatrixNorm(A)

{ CHECK f 5.477225575 0.000005477225575051661 }
{ CHECK t 5 0.0000049999999999999996 }
{ CHECK A[1,1] 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
f = 5.477225575
t = 5
A[1,1] = 1
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Square input matrix. |
