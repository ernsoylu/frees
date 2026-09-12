---
name: zp2tf
category: Control Systems
summary: Zero-pole-gain to transfer-function form.
related: [tf2zp, tf, pole, zero]
examples: []
tags: [control, zero pole gain, zpk, transfer function]
---

# zp2tf

Converts a **zero-pole-gain** description — zeros (`zr`/`zi`), poles (`pr`/`pi`),
and gain `k` — into a transfer function `num/den`. It is the inverse of
`tf2zp`, used to build a model from a factored (root) specification.

## Syntax

```
[num, den] = zp2tf(zr, zi, pr, pi, k)
[num, den] = zp2tf(zr, zi, pr, pi, k)
```

## Mathematical Formulation

$$ G(s) = k\,\frac{\prod_i (s - z_i)}{\prod_j (s - p_j)} = \frac{\text{num}(s)}{\text{den}(s)} $$

> **Method:** expand the zero and pole factors into polynomials and scale by `k`.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
zr = [-3.0]
zi = [0.0]
pr = [-1.0, -2.0]
pi = [0.0, 0.0]
k = 2.0
[num, den] = zp2tf(zr, zi, pr, pi, k)

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

```
{ [num, den] = zp2tf(zr, zi, pr, pi, k) }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `zr`, `zi` | Vector | Yes | Real / imaginary parts of the zeros. |
| `pr`, `pi` | Vector | Yes | Real / imaginary parts of the poles. |
| `k` | Number | Yes | Scalar gain. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `num` | Vector | Numerator coefficients (descending powers of `s`). |
| `den` | Vector | Denominator coefficients. |
