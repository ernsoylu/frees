---
name: tf2zp
category: Control Systems
summary: Transfer function to zero-pole-gain form.
related: [zp2tf, pole, zero, tf]
examples: []
tags: [control, zero pole gain, zpk, transfer function, factorization]
---

# tf2zp

Converts a transfer function `G(s) = num/den` to **zero-pole-gain** form: the zeros
(`zr`/`zi`), poles (`pr`/`pi`), and scalar gain `k`. It is the factored view of the
rational system, the inverse of `zp2tf`.

## Syntax

```
[zr, zi, pr, pi, k] = tf2zp(num, den)
```

## Mathematical Formulation

$$ G(s) = k\,\frac{\prod_i (s - z_i)}{\prod_j (s - p_j)} $$

where the zeros are the roots of `num`, the poles the roots of `den`, and `k` the
leading-coefficient ratio.

> **Method:** factor `num` and `den` (root-finding) and extract the gain.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Zeros, poles and gain of a third-order model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation. `num` may be shorter than `den`; it is read with leading zeros.

```frees
num = [1, 3, 2]
den = [1, 2, 5, 4]
[zr, zi, pr, pi, k] = tf2zp(num, den)

{ CHECK zr[1] -2 0.000002 }
{ CHECK zr[2] -1 0.000001 }
{ CHECK pr[1] -0.5 0.0000005 }
{ CHECK pi[1] 1.936491673 0.000001936491673 }
{ CHECK pr[3] -1 0.000001 }
{ CHECK k 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
zr = [-2, -1]
pr = [-0.5, -0.5, -1]
pi = [1.936491673, -1.936491673, 0]
k = 1
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `num` | Vector | Yes | Numerator coefficients (descending powers of `s`). |
| `den` | Vector | Yes | Denominator coefficients. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `zr`, `zi` | Vector | Real / imaginary parts of the zeros, one slot per numerator degree. A numerator with leading zeros has fewer finite zeros; the surplus slots read 0. |
| `pr`, `pi` | Vector | Real / imaginary parts of the poles. |
| `k` | Number | Scalar gain. |
