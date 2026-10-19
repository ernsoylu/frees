---
name: ss2tfij
category: Control Systems
summary: Transfer function from input j to output i of a state-space model.
related: [ss2tf, tf2ss, bode]
examples: []
tags: [ss2tfij]
---

# ss2tfij

Transfer function from input j to output i of a state-space model.

## Syntax

```
[num, den] = ss2tfij(A, B, C, D, i, j)
```

## Description

`[num, den] = ss2tfij(A, B, C, D, i, j)` returns the SISO transfer function `G_ij(s) = C_i (sI − A)⁻¹ B_j + D_ij` from input `j` to output `i`, using row `i` of `C`, column `j` of `B` and `D[i, j]`. Coefficients are in descending powers of `s`.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
A = [-1, 0; 0, -2]
B = [1, 0; 0, 1]
C = [1, 0; 0, 1]
D = [0, 0; 0, 0]
[num, den] = ss2tfij(A, B, C, D, 1, 1)

{ CHECK den[1] 1 0.000001 }
{ CHECK den[2] 3 0.000003 }
{ CHECK den[3] 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
den[1] = 1
den[2] = 3
den[3] = 2
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | n × n state matrix. |
| `B` | Matrix | Yes | n × m input matrix. |
| `C` | Matrix | Yes | p × n output matrix. |
| `D` | Matrix | Yes | p × m feed-through matrix. |
| `i` | Number | Yes | Output index (1-based). |
| `j` | Number | Yes | Input index (1-based). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `num` | Vector | Numerator coefficients. |
| `den` | Vector | Denominator coefficients (length n + 1). |
