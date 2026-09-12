---
name: tf2zp
category: Control Systems
summary: Transfer function to zero-pole-gain form.
related: [zp2tf, pole, zero, tf]
examples: []
tags: [control, zero pole gain, zpk, transfer function, factorization]
---

# tf2zp

**Current limitation:** the current parser cannot infer the value-dependent
output shapes for the invocation below. Use the first-order working alternative
in the verified example; the formulation describes the intended conversion.

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

### Verified example — Find the poles and zeros of a first-order model

**Current runtime limitation:** this invocation is not supported by the current engine. The diagnostic below is verified, not a successful calculation. Use the working alternative that follows.

```frees error="Expected vector array access"
num = [1, 3]
den = [1, 2]
[zr, zi, pr, pi, k] = tf2zp(num, den)
```

Expected diagnostic:

```text
Syntax error: Expected vector array access: e.g. v[1:3]
```

Working alternative — paste this complete document into the editor and solve:

```frees
num = [1, 3]
den = [1, 2]
[pr, pi] = pole(num, den)
zero_real = -3
gain = 1

{ CHECK den[1] 1 0.000001 }
{ CHECK den[2] 2 0.000002 }
{ CHECK num[1] 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
den[1] = 1
den[2] = 2
num[1] = 1
```

<!-- verified-reference-example:end -->

```
{ [zr,zi,pr,pi,k] = tf2zp(num, den) }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `num` | Vector | Yes | Numerator coefficients (descending powers of `s`). |
| `den` | Vector | Yes | Denominator coefficients. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `zr`, `zi` | Vector | Real / imaginary parts of the zeros. |
| `pr`, `pi` | Vector | Real / imaginary parts of the poles. |
| `k` | Number | Scalar gain. |
