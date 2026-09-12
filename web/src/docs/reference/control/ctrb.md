---
name: ctrb
category: Control Systems
summary: Controllability matrix of a state-space pair (A, B).
related: [obsv, place, acker, gram]
examples: []
tags: [control, controllability, state space, rank]
---

# ctrb

Returns the **controllability matrix** `Co` of the pair `(A, B)`. The system is
controllable — every state reachable by the input, hence arbitrary pole placement
is possible — iff `Co` has full rank.

## Syntax

```
[Co] = ctrb(A, B)
Co = ctrb(A, B)
```

## Mathematical Formulation

For an `n`-state system:

$$ \mathcal{C} = \begin{bmatrix} B & AB & A^2B & \cdots & A^{n-1}B \end{bmatrix} $$

The pair is controllable iff `rank(C) = n`.

> **Method:** assemble the Krylov block `[B, AB, …, Aⁿ⁻¹B]`.

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

```
{ Co = ctrb(A, B); controllable iff rank(Co) = n }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | State matrix (n×n). |
| `B` | Matrix | Yes | Input matrix. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `Co` | Matrix | Controllability matrix. |
