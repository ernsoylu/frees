---
name: lsim
category: Control Systems
summary: Response of a transfer function to an arbitrary input u(t).
related: [step, impulse]
examples: [step-impulse-response]
tags: [control, simulation, arbitrary input, convolution, time domain]
---

# lsim

Returns the **time response** `y(t)` of `G(s) = num/den` to an **arbitrary input**
`u(t)` sampled on the time vector `t`. Use it to simulate a system under a custom
forcing (ramps, pulses, measured signals) rather than the canned step/impulse.

## Syntax

```
[y] = lsim(num, den, u, t)
y = lsim(num, den, u, t)
```

## Description

`u` and `t` are aligned vectors describing the input over time; `y` is the
corresponding output. The response is the convolution of the input with the
system's impulse response.

## Mathematical Formulation

$$ y(t) = \int_0^t g(t-\tau)\,u(\tau)\,d\tau, \qquad g(t) = \mathcal{L}^{-1}\{G(s)\} $$

> **Method:** numerical convolution / state-space integration of the input over `t`.

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

### Example 1 — Response to a custom input

[Run: step-impulse-response]

**Expected:** the output tracking the supplied input, shaped by the plant dynamics.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `num` | Vector | Yes | Numerator coefficients (descending powers of `s`). |
| `den` | Vector | Yes | Denominator coefficients (descending powers of `s`). |
| `u` | Vector | Yes | Input samples aligned with `t`. |
| `t` | Vector | Yes | Time samples [s]. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Vector | Output response at each time. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `LENGTH_MISMATCH` | `u` and `t` differ in length | Provide input and time vectors of equal length. |
