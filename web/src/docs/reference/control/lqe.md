---
name: lqe
category: Control Systems
summary: Linear-quadratic (Kalman) estimator gain.
related: [lqr, gram, balreal, obsv]
examples: [estimator-gramian-balreal]
tags: [control, kalman, estimator, observer, lqe, riccati]
---

# lqe

Returns the **optimal estimator (Kalman) gain** `L` for a linear system with process
noise (intensity via `G`, `Q`) and measurement noise (`R`). It is the dual of
`lqr`: the observer `x̂̇ = Ax̂ + Bu + L(y − Cx̂)` reconstructs the state from
noisy measurements with minimum error variance.

## Syntax

```
[L] = lqe(A, G, C, Q, R)
L = lqe(A, G, C, Q, R)
```

## Description

`Q` is the process-noise covariance entering through `G`; `R` is the measurement-
noise covariance. The gain balances trust in the model against trust in the sensor.

## Mathematical Formulation

`L = PCᵀR⁻¹`, where `P` (the error covariance) solves the filter algebraic Riccati
equation (dual of the LQR ARE):

$$ A P + P A^\top - P C^\top R^{-1} C P + G Q G^\top = 0 $$

> **Method:** solve the filter ARE for `P`, then `L = PCᵀR⁻¹`.

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

### Example 1 — Estimator gain for a plant

[Run: estimator-gramian-balreal]

**Expected:** an observer gain `L` that places the estimator poles `(A − LC)` for
the chosen noise weights.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | State matrix. |
| `G` | Matrix | Yes | Process-noise input matrix. |
| `C` | Matrix | Yes | Output matrix. |
| `Q` | Matrix | Yes | Process-noise covariance (≥ 0). |
| `R` | Matrix | Yes | Measurement-noise covariance (> 0). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `L` | Matrix | Optimal estimator gain. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `NOT_DETECTABLE` | `(A, C)` not detectable | The pair must be detectable for a solution to exist. |
