---
name: impulse
category: Control Systems
summary: Impulse response of a transfer function over a time vector.
related: [step, lsim, pole]
examples: [step-impulse-response]
tags: [control, impulse response, transient, time domain]
---

# impulse

Returns the **impulse response** `y(t)` of `G(s) = num/den` sampled at the times in
`t` — the system output to a unit impulse input. It is the inverse Laplace
transform of `G(s)` itself and the kernel of the convolution that gives any
response.

## Syntax

```
[y] = impulse(num, den, t)
y = impulse(num, den, t)
```

## Description

The impulse response characterizes the system's natural modes directly; it is also
the derivative of the step response.

## Mathematical Formulation

$$ y(t) = \mathcal{L}^{-1}\{G(s)\}, \qquad g(t) = \frac{d}{dt}\,y_{\text{step}}(t) $$

> **Method:** numerical evaluation of the impulse response at each `t`.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
num = [0, 0, 1]
den = [1, 0.6, 1]
tv = [0, 0.5, 1, 1.5, 2, 3, 5, 8, 12]
[ys] = step(num, den, tv)
[yi] = impulse(num, den, tv)
uu = [0, 1, 1, 1, 1, 1, 1, 1, 1]
[yl] = lsim(num, den, uu, tv)
[Tr, Tp, Ts2, OS] = stepinfo(tv, ys)
om = [0.1, 0.5, 1, 2, 5, 10]
[mg, ph] = bode(num, den, om)
[re, im] = nyquist(num, den, om)
[nmg, nph] = nichols(num, den, om)
[gm, pm, wg, wp] = margin(num, den)

{ CHECK den[1] 1 0.000001 }
{ CHECK den[2] 0.6 6e-7 }
{ CHECK den[3] 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
den[1] = 1
den[2] = 0.6
den[3] = 1
```

<!-- verified-reference-example:end -->

### Example 1 — Impulse response of a plant

[Run: step-impulse-response]

**Expected:** a decaying (and, for complex poles, oscillating) response returning to
zero, reflecting the open-loop poles.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `num` | Vector | Yes | Numerator coefficients (descending powers of `s`). |
| `den` | Vector | Yes | Denominator coefficients (descending powers of `s`). |
| `t` | Vector | Yes | Time samples [s]. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Vector | Impulse response at each time. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `IMPROPER_TF` | `num` order exceeds `den` order | Provide a proper transfer function. |
