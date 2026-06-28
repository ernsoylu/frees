---
name: Designing a Controller (PID & LQR)
category: Cookbook
guide: true
summary: Tune a PID and an LQR state-feedback controller for a plant and check the closed loop.
examples: [controller-design-lqr-pid]
tags: [cookbook, control, pid, lqr, controller, state feedback, design]
related: [pidtune, lqr, place, feedback, pole, margin]
references:
  - "Nise, N.S., Control Systems Engineering (7th ed.), Ch. 9, 12"
  - "Ogata, K., Modern Control Engineering (5th ed.), Ch. 10"
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
adequate phase margin (Nise Ch. 9). The LQR minimizes

$$ J = \int_0^\infty (\mathbf{x}^\top Q\,\mathbf{x} + \mathbf{u}^\top R\,\mathbf{u})\,dt $$

giving `K = R⁻¹BᵀP` with `P` solving the algebraic Riccati equation (Ogata Ch. 10).
Verify each design with `pole`/`margin` on the closed loop, formed
with `feedback`.

## Worked example

[Run: controller-design-lqr-pid]

**What it tells you:** the PID gains and the LQR gain, plus where each places the
closed-loop poles. Increasing `Q/R` (or `ωc`) gives a faster, more aggressive
response; both should land the dominant poles in the left half-plane.

## References

1. Nise, N.S. *Control Systems Engineering* (7th ed.), Ch. 9, 12.
2. Ogata, K. *Modern Control Engineering* (5th ed.), Ch. 10.
