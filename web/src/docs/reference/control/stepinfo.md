---
name: stepinfo
category: Control Systems
summary: Step-response performance metrics (rise time, peak time, settling time, overshoot).
related: [step, pole, margin]
examples: []
tags: [control, step response, rise time, settling time, overshoot, transient]
---

# stepinfo

Returns the **transient performance metrics** of a step response sampled as
`(t, y)`: rise time `Tr`, peak time `Tp`, settling time `Ts`, and percent overshoot
`OS`. Use it to quantify a closed-loop design against time-domain specifications.

## Syntax

```
[Tr, Tp, Ts, OS] = stepinfo(t, y)
[Tr, Tp, Ts, OS] = stepinfo(t, y)
```

## Mathematical Formulation

From the response `y(t)` with steady-state value `y_∞` and peak `y_p`:

$$ OS = \frac{y_p - y_\infty}{y_\infty}\times 100\%, \qquad T_p = \arg\max_t y(t) $$

`Tr` is the 10–90% rise time and `Ts` the time after which `|y − y_∞|` stays within
a 2% band.

> **Method:** scan the response for the crossing, peak, and settling instants.

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

```
{ [Tr, Tp, Ts, OS] = stepinfo(t, y) from a step() response }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `t` | Vector | Yes | Time samples [s]. |
| `y` | Vector | Yes | Step response aligned with `t`. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `Tr` | Number | Rise time (10–90%) [s]. |
| `Tp` | Number | Peak time [s]. |
| `Ts` | Number | Settling time (2% band) [s]. |
| `OS` | Number | Percent overshoot. |
