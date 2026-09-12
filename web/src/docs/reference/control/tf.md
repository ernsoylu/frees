---
name: tf
category: Control Systems
summary: Create a transfer function from numerator and denominator coefficients.
related: [tf2ss, ss2tf, pole, zero]
examples: [partial-fractions]
tags: [control, transfer function, tf, model, laplace]
---

# tf

Builds a **transfer function** `G(s) = num(s)/den(s)` from coefficient vectors in
descending powers of `s`. It is the basic linear-systems model the analysis
(`pole`, `bode`, `step`) and design (`feedback`, `lqr`, `pidtune`) routines act on.

## Syntax

```
G = tf(num, den)
```

## Description

`num` and `den` list the polynomial coefficients from the highest power of `s` down
to the constant term. The result is the Laplace-domain ratio of output to input for
a SISO linear system.

## Mathematical Formulation

$$ G(s) = \frac{\text{num}(s)}{\text{den}(s)} = \frac{b_m s^m + \dots + b_0}{a_n s^n + \dots + a_0} $$

with `m ≤ n` for a proper system.

> **Method:** stores the coefficient pair as a transfer-function model.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
SYMBOLIC s
tf([1, 3], [1, 3, 2]) = A/(s+1) + B/(s+2)

{ CHECK A 2 0.000002 }
{ CHECK B -1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
A = 2
B = -1
```

<!-- verified-reference-example:end -->

### Example 1 — Transfer function for a partial-fraction expansion

[Run: partial-fractions]

**Expected:** the rational `G(s)` whose residues and poles the expansion resolves.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `num` | Vector | Yes | Numerator coefficients (descending powers of `s`). |
| `den` | Vector | Yes | Denominator coefficients (descending powers of `s`). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `G` | Transfer function | The model `num/den`. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `IMPROPER_TF` | `num` order exceeds `den` order | Provide a proper transfer function (`m ≤ n`). |
