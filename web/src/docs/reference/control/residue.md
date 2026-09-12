---
name: residue
category: Control Systems
summary: Partial-fraction residues and poles of a transfer function.
related: [pole, tf, zero]
examples: [inverse-laplace-residue]
tags: [control, partial fraction, residue, poles, inverse laplace]
---

# residue

Returns the **partial-fraction expansion** of `G(s) = num/den`: the residues
(`rr`/`ri`, real/imaginary parts), the poles (`pr`/`pi`), and the direct term `k`.
It is the basis for analytic inverse-Laplace transforms — each pole/residue pair
maps to a time-domain mode.

## Syntax

```
[rr, ri, pr, pi, k] = residue(num, den)
[rr, ri, pr, pi, k] = residue(num, den)
```

## Description

The expansion decomposes a rational function into a sum of simple terms over its
poles, so the time response is read off as a sum of exponentials/sinusoids.

## Mathematical Formulation

$$ G(s) = \frac{\text{num}(s)}{\text{den}(s)} = \sum_{i} \frac{r_i}{s - p_i} + k(s) $$

with the residue at a simple pole `p_i` given by:

$$ r_i = \big[(s - p_i)\,G(s)\big]_{s = p_i} $$

> **Method:** factor `den` for the poles, then evaluate the residues (and any
> polynomial direct term `k` when `num` and `den` are equal order).

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
num = [0, 1, 3]
den = [1, 3, 2]
[rr, ri, pr2, pi2, kk] = residue(num, den)
dr = [1, 1, 2, 8]
[nrhp, stable] = routh(dr)
[lk, lcpr, lcpi] = rlocus(num, den)
[Kpos, Kvel, Kacc] = errorconst(num, den)

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

### Example 1 — Residues for an inverse Laplace transform

[Run: inverse-laplace-residue]

**Expected:** residue/pole pairs that reconstruct the time response as a sum of
modal terms.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `num` | Vector | Yes | Numerator coefficients (descending powers of `s`). |
| `den` | Vector | Yes | Denominator coefficients (descending powers of `s`). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `rr`, `ri` | Vector | Real / imaginary parts of the residues. |
| `pr`, `pi` | Vector | Real / imaginary parts of the poles. |
| `k` | Vector | Direct (polynomial) term, empty if `num` order < `den` order. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `REPEATED_POLE` | high-multiplicity poles | Repeated poles need the extended residue form; check the result. |
