---
name: c2d
category: Control Systems
summary: Continuous-to-discrete transfer-function conversion (ZOH / Tustin).
related: [d2c, tf, pole]
examples: [digital-control-c2d]
tags: [control, discretization, c2d, zoh, tustin, digital, sampling]
---

# c2d

Converts a continuous transfer function `G(s) = num/den` to its **discrete-time**
equivalent `G(z) = numz/denz` at sample time `Ts`, using the requested method
(`'zoh'` zero-order hold or `'tustin'` bilinear). Use it to design or implement a
controller on a digital (sampled) platform.

## Syntax

```
[numz, denz] = c2d(num, den, Ts, 'zoh')
[numz, denz] = c2d(num, den, Ts, 'tustin')
```

## Description

`'zoh'` assumes the input is held constant over each sample (the usual model for a
DAC); `'tustin'` (bilinear) maps the `s`-plane to the `z`-plane by a frequency-
warping substitution that preserves stability.

## Mathematical Formulation

Zero-order hold:

$$ G(z) = (1 - z^{-1})\,\mathcal{Z}\!\left\{\frac{G(s)}{s}\right\} $$

Tustin (bilinear):

$$ G(z) = G(s)\Big|_{\,s = \frac{2}{T_s}\frac{z-1}{z+1}} $$

> **Method:** ZOH step-invariant transform, or the bilinear substitution.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
num = [1]
den = [1, 2, 1]
Ts = 0.1
[nd, dd] = c2d(num, den, Ts)
[nc, dc] = d2c(nd, dd, Ts)
[np, dp] = pade(0.2, 2)

{ CHECK dc[1] 1 0.000001 }
{ CHECK dc[2] 2 0.0000019999999999999995 }
{ CHECK dc[3] 1 9.999999999999762e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
dc[1] = 1
dc[2] = 2
dc[3] = 1
```

<!-- verified-reference-example:end -->

### Example 1 — Discretize a controller

[Run: digital-control-c2d]

**Expected:** a `numz/denz` pair whose sampled response approximates the continuous
`G(s)` at the chosen `Ts`.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `num` | Vector | Yes | Continuous numerator (descending powers of `s`). |
| `den` | Vector | Yes | Continuous denominator. |
| `Ts` | Number | Yes | Sample time [s]. |
| `method$` | String | Yes | `'zoh'` or `'tustin'`. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `numz` | Vector | Discrete numerator (descending powers of `z`). |
| `denz` | Vector | Discrete denominator. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `BAD_SAMPLE_TIME` | `Ts ≤ 0` | Use a positive sample time. |
| `UNKNOWN_METHOD` | method not recognized | Use `'zoh'` or `'tustin'`. |
