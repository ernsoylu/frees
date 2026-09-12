---
name: obsv
category: Control Systems
summary: Observability matrix of a state-space pair (A, C).
related: [ctrb, lqe, gram]
examples: []
tags: [control, observability, state space, observer, rank]
---

# obsv

Returns the **observability matrix** `Ob` of the pair `(A, C)`. The system is
observable — its full state can be reconstructed from the output, so an observer of
arbitrary speed exists — iff `Ob` has full rank.

## Syntax

```
[Ob] = obsv(A, C)
Ob = obsv(A, C)
```

## Mathematical Formulation

For an `n`-state system, the dual of `ctrb`:

$$ \mathcal{O} = \begin{bmatrix} C \\ CA \\ CA^2 \\ \vdots \\ CA^{n-1} \end{bmatrix} $$

The pair is observable iff `rank(O) = n`.

> **Method:** stack `[C; CA; …; CAⁿ⁻¹]`.

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
{ Ob = obsv(A, C); observable iff rank(Ob) = n }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | State matrix (n×n). |
| `C` | Matrix | Yes | Output matrix. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `Ob` | Matrix | Observability matrix. |
