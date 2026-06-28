---
name: dare
category: Control Systems
summary: Solve the discrete algebraic Riccati equation.
related: [dlqr, lqr, dlyap]
examples: []
tags: [control, riccati, discrete, optimal, dare]
references:
  - "Ogata, K., Discrete-Time Control Systems (2nd ed.), Ch. 8"
  - "Franklin, G.F. et al., Digital Control of Dynamic Systems (3rd ed.), Ch. 9"
---

# dare

Solves the **discrete algebraic Riccati equation** (DARE) for the stabilizing
solution `X`. It is the core of discrete optimal control — `dlqr` builds its
gain from this `X`.

## Syntax

```
CALL dare(A, B, Q, R : X)
X = dare(A, B, Q, R)
```

## Mathematical Formulation

$$ X = A^\top X A - A^\top X B\,(R + B^\top X B)^{-1} B^\top X A + Q $$

with `Q ⪰ 0` (state weight) and `R ≻ 0` (input weight); the stabilizing `X ⪰ 0`
is the one for which the closed loop is Schur-stable (Ogata, Discrete-Time, Ch. 8).

> **Method:** Schur / structured-eigenvector solve of the symplectic pencil.

## Examples

```
{ X = dare(A, B, Q, R); the LQR-optimal cost-to-go matrix }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | Discrete state matrix. |
| `B` | Matrix | Yes | Input matrix. |
| `Q` | Matrix | Yes | State weight (⪰ 0). |
| `R` | Matrix | Yes | Input weight (≻ 0). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `X` | Matrix | Stabilizing symmetric solution. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `NOT_STABILIZABLE` | `(A, B)` not stabilizable | A stabilizing solution requires a stabilizable pair. |

## References

1. Ogata, K. *Discrete-Time Control Systems* (2nd ed.), Ch. 8.
2. Franklin, G.F. et al. *Digital Control of Dynamic Systems* (3rd ed.), Ch. 9.
