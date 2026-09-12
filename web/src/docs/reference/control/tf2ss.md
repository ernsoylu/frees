---
name: tf2ss
category: Control Systems
summary: Convert a transfer function to a state-space realization (A, B, C, D).
related: [ss2tf, tf, pole]
examples: [multi-output-destructuring]
tags: [control, transfer function, state space, tf2ss, realization, controllable canonical]
---

# tf2ss

Converts a transfer function `G(s) = num/den` into a **state-space realization**
`(A, B, C, D)` — the inverse of `ss2tf`. Use it to move from a frequency-
domain model to the state form needed for modern (state-feedback, observer,
LQR/LQE) design.

## Syntax

```
[A, B, C, D] = tf2ss(num, den)
```

## Description

The realization returned is the controllable canonical form, one valid choice among
the infinitely many state-space models sharing the same input-output behavior.

## Mathematical Formulation

For `G(s) = num/den`, the controllable canonical realization places the denominator
coefficients in the companion `A` and the numerator in `C`:

$$ \dot{\mathbf{x}} = A\mathbf{x} + B u, \qquad y = C\mathbf{x} + D u, \qquad C(sI-A)^{-1}B + D = G(s) $$

> **Method:** build the controllable canonical companion form from the coefficients.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
num = [0, 0, 1]
den = [1, 3, 2]
[A, B] = tf2ss(num, den)

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

### Example 1 — Realize a transfer function

[Run: multi-output-destructuring]

**Expected:** an `(A, B, C, D)` set whose transfer function recovers the original
`num/den`.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `num` | Vector | Yes | Numerator coefficients (descending powers of `s`). |
| `den` | Vector | Yes | Denominator coefficients (descending powers of `s`). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `A` | Matrix | State matrix (companion form). |
| `B` | Vector | Input matrix. |
| `C` | Vector | Output matrix. |
| `D` | Number | Direct feedthrough. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `IMPROPER_TF` | `num` order exceeds `den` order | Provide a proper transfer function. |
