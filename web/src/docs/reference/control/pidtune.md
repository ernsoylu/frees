---
name: pidtune
category: Control Systems
summary: Automatic PID gain tuning by loop-shaping to a target crossover.
related: [margin, feedback, lqr]
examples: [controller-design-lqr-pid]
tags: [control, pid, tuning, loop shaping, crossover, kp ki kd]
---

# pidtune

Returns tuned **PID gains** `Kp`, `Ki`, `Kd` for a plant `G(s) = num/den`, designed
to achieve a target gain-crossover frequency `wc` with adequate phase margin. Use it
for a quick, systematic classical controller without manual loop shaping.

## Syntax

```
[Kp, Ki, Kd] = pidtune(num, den, 'PID', wc)
[Kp, Ki, Kd] = pidtune(num, den, 'PID', wc)
```

## Description

The controller `C(s) = Kp + Ki/s + Kd·s` is shaped so the open loop `C·G` crosses
0 dB near `wc` with a phase margin that yields a well-damped closed loop. The type
string selects `'P'`, `'PI'`, `'PD'`, or `'PID'`.

## Mathematical Formulation

$$ C(s) = K_p + \frac{K_i}{s} + K_d\,s $$

The gains are chosen so that at the target crossover `ωc`:

$$ |C(j\omega_c)G(j\omega_c)| = 1, \qquad \angle C(j\omega_c)G(j\omega_c) = -180° + \text{PM} $$

> **Method:** solve the magnitude/phase loop-shaping conditions at `wc` for the
> controller gains.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
A[1,1] = 0; A[1,2] = 1
A[2,1] = -2; A[2,2] = -3
G[1,1] = 1; G[2,1] = 0
C[1,1] = 1; C[1,2] = 0
Qn[1,1] = 1
Rn[1,1] = 0.1
[L] = lqe(A, G, C, Qn, Rn)
np = [1]
dp = [1, 1, 0]
wc = 1
[Kp, Ki, Kd] = pidtune(np, dp, 'PID', wc)
[Kp2, Ki2, Kd2] = pidtune(np, dp, 'PI', wc)

{ CHECK dp[1] 1 0.000001 }
{ CHECK dp[2] 1 0.000001 }
{ CHECK dp[3] 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
dp[1] = 1
dp[2] = 1
dp[3] = 0
```

<!-- verified-reference-example:end -->

### Example 1 — Tune a PID controller

[Run: controller-design-lqr-pid]

**Expected:** `Kp`, `Ki`, `Kd` giving a stable closed loop with the targeted
crossover and margin.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `num` | Vector | Yes | Plant numerator (descending powers of `s`). |
| `den` | Vector | Yes | Plant denominator. |
| `type$` | String | Yes | `'P'`, `'PI'`, `'PD'`, or `'PID'`. |
| `wc` | Number | Yes | Target gain-crossover frequency [rad/s]. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `Kp` | Number | Proportional gain. |
| `Ki` | Number | Integral gain. |
| `Kd` | Number | Derivative gain. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `INFEASIBLE_WC` | target crossover unreachable | Choose a `wc` consistent with the plant bandwidth. |
