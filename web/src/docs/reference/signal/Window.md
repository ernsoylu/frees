---
name: Window
category: Stats
summary: Multiplies a series by a symmetric taper (Hann, Hamming, Blackman, Bartlett or rectangular).
related: [FFT, Welch, Detrend, Smooth]
examples: [sensor-detrend-smooth-window]
tags: [window, taper, hann, hamming, blackman, bartlett, leakage, spectrum]
---

# Window

Tapers a finite record to zero at both ends before a transform, so the discontinuity between the last sample and the first does not smear energy across the whole spectrum.

## Syntax

```
[y] = Window(x, 'hann')
```

## Description

An `FFT` treats its input as one period of a periodic signal. A record that does not happen to contain a whole number of cycles therefore has a step in it, and that step leaks energy into every bin — enough to bury a small tone sitting next to a large one. Multiplying by a taper that reaches zero at both ends removes the step.

The windows here are **symmetric** (denominator `n − 1`), which is the right taper for a single finite record and matches MATLAB's `hann(n)` and SciPy's `get_window(..., fftbins=False)`. **Welch** uses the *periodic* form internally, because there the segments tile a longer record; the two differ by one sample and the difference is not cosmetic.

Every window trades resolution for leakage: Hann is the usual default, Blackman suppresses distant leakage further at the cost of a wider main lobe, Hamming sits between them, Bartlett is the simple triangle, and `'rect'` is the identity — the taper you already have when you do nothing.

## Mathematical Formulation

With $t = j/(n-1)$,

$$ w^{\text{hann}}_j = 0.5 - 0.5\cos 2\pi t, \quad w^{\text{hamming}}_j = 0.54 - 0.46\cos 2\pi t $$
$$ w^{\text{blackman}}_j = 0.42 - 0.5\cos 2\pi t + 0.08\cos 4\pi t, \quad w^{\text{bartlett}}_j = 1 - |2t - 1| $$

and $y_j = w_j x_j$.

> **Method:** the closed-form weights, evaluated through `libm` so native and browser runs agree bit for bit.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Taper a sampled signal before spectral analysis

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
x = [1, 3, 2, 6, 4, 9, 5, 12]
[y] = Window(x, 'hann')

{ CHECK x[1] 1 0.000001 }
{ CHECK x[2] 3 0.000003 }
{ CHECK x[3] 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
x[1] = 1
x[2] = 3
x[3] = 2
```

<!-- verified-reference-example:end -->

### Example 1 — tapering before a transform

```
x  = [1, 2, 3, 4, 5, 6, 7, 8]
im = [0, 0, 0, 0, 0, 0, 0, 0]
[xw] = Window(x, 'hann')
[re, imf] = FFT(xw, im)
```

**Expected:** `xw[1] = 0` and `xw[8] = 0` — a symmetric Hann closes on zero at both ends.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Vector | Yes | The series to taper. |
| `'kind'` | String | Yes | `'rect'`, `'hann'`, `'hamming'`, `'blackman'` or `'bartlett'`. `'hanning'`, `'boxcar'`, `'rectangular'`, `'none'` and `'triangular'` are accepted spellings. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Vector | `x` multiplied by the window, same length. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `Unknown window` | A name outside the list. | Use one of the five; the name is matched case-insensitively. |
| `Window option 2 must be a quoted name` | The kind was passed unquoted. | Write `'hann'`, with quotes. |
