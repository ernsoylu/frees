---
name: margin
category: Control Systems
summary: Gain and phase margins and their crossover frequencies.
related: [bode, nyquist, pole]
examples: [control-analysis-report]
tags: [control, gain margin, phase margin, stability, crossover, frequency response]
---

# margin

Returns the **gain margin** `gm`, **phase margin** `pm`, and the gain- and
phase-crossover frequencies (`w_cg`, `w_cp`) of an open-loop transfer function —
the classical frequency-domain measures of relative stability for the closed loop.

## Syntax

```
[gm, pm, w_cg, w_cp] = margin(num, den)
[gm, pm, w_cg, w_cp] = margin(num, den)
```

## Description

Applied to the open-loop `L(s) = num/den`, the margins quantify how much
additional gain or phase lag the loop tolerates before the closed loop goes
unstable. Positive `gm` (in dB) and positive `pm` (in degrees) indicate a stable
closed loop.

## Mathematical Formulation

At the **phase-crossover** frequency $\omega_{cg}$ where $\angle L(j\omega_{cg}) = -180°$:

$$ GM = \frac{1}{|L(j\omega_{cg})|} \quad\text{(often in dB: } 20\log_{10} GM\text{)} $$

At the **gain-crossover** frequency $\omega_{cp}$ where $|L(j\omega_{cp})| = 1$:

$$ PM = 180° + \angle L(j\omega_{cp}) $$

> **Method:** locate the crossover frequencies on the open-loop frequency response,
> then evaluate the margins there.

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

### Example 1 — Margins of a second-order plant

[Run: control-analysis-report]

**Expected:** with no `−180°` crossing, the gain margin is infinite and the phase
margin is large — consistent with the stable left-half-plane poles.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `num` | Vector | Yes | Open-loop numerator coefficients (descending powers of `s`). |
| `den` | Vector | Yes | Open-loop denominator coefficients (descending powers of `s`). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `gm` | Number | Gain margin (factor; report as `20·log10(gm)` dB). |
| `pm` | Number | Phase margin [deg]. |
| `w_cg` | Number | Gain-margin (phase-crossover) frequency [rad/s]. |
| `w_cp` | Number | Phase-margin (gain-crossover) frequency [rad/s]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `NO_CROSSOVER` | The response never crosses `−180°` or `0 dB` | Margin is infinite/undefined for this loop — interpret accordingly. |
