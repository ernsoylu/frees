---
name: Designing a Controller (PID & LQR)
category: Cookbook
guide: true
summary: Tune a PID and an LQR state-feedback controller for a plant and check the closed loop.
examples: [controller-design-lqr-pid]
tags: [cookbook, control, pid, lqr, controller, state feedback, design]
related: [pidtune, lqr, place, feedback, pole, margin]
---

# Designing a Controller (PID & LQR)

**Goal:** take a plant model and design two controllers — a classical **PID** by
loop shaping and a modern **LQR** state-feedback — then confirm the closed loop is
stable and well-damped.

## What you'll build

Starting from the plant `G(s) = num/den` (or its state space `(A, B)`):

- **PID:** pick a target crossover and let `pidtune` return `Kp, Ki, Kd`.
- **LQR:** choose state/effort weights `Q, R` and let `lqr` return the optimal
  gain `K` (the control `u = −Kx`).

## Approach

The PID controller `C(s) = Kp + Ki/s + Kd·s` is shaped to cross 0 dB near `ωc` with
adequate phase margin. The LQR minimizes

$$ J = \int_0^\infty (\mathbf{x}^\top Q\,\mathbf{x} + \mathbf{u}^\top R\,\mathbf{u})\,dt $$

giving `K = R⁻¹BᵀP` with `P` solving the algebraic Riccati equation.
Verify each design with `pole`/`margin` on the closed loop, formed
with `feedback`.

## Worked example

[Run: controller-design-lqr-pid]

**What it tells you:** the PID gains and the LQR gain, plus where each places the
closed-loop poles. Increasing `Q/R` (or `ωc`) gives a faster, more aggressive
response; both should land the dominant poles in the left half-plane.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Controller Design (LQR & PID)

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// Controller Design: LQR + PID

{ ---- LQR state feedback for a double integrator (unit mass) ---- }
{ x1' = x2 , x2' = u  ->  A = [0 1; 0 0],  B = [0; 1] }
A[1,1] = 0; A[1,2] = 1
A[2,1] = 0; A[2,2] = 0
B[1] = 0; B[2] = 1

{ State weight Q and input weight R }
Q[1,1] = 1; Q[1,2] = 0
Q[2,1] = 0; Q[2,2] = 1
R = 1

{ Optimal gain K minimizing the quadratic cost }
[K] = lqr(A, B, Q, R)

{ Closed-loop matrix Acl = A - B K, then verify the poles are stable }
Acl[1,1] = A[1,1] - B[1]*K[1]
Acl[1,2] = A[1,2] - B[1]*K[2]
Acl[2,1] = A[2,1] - B[2]*K[1]
Acl[2,2] = A[2,2] - B[2]*K[2]
[pcl_r, pcl_i] = pole(Acl)

{ ---- PID auto-tuning for plant G(s) = 1 / (s^2 + s) ---- }
{ Target gain crossover at wc with a 60 deg phase margin }
num = [1]
den = [1, 1, 0]
wc = 1 [rad/s]
[Kp, Ki, Kd] = pidtune(num, den, 'PID', wc)

{ CHECK Acl[1,1] 0 1e-8 }
{ CHECK Acl[1,2] 1 0.000001 }
{ CHECK Acl[2,1] -1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
Acl[1,1] = 0
Acl[1,2] = 1
Acl[2,1] = -1
```

<!-- verified-reference-example:end -->
