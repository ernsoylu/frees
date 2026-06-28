---
name: obsv
category: Control Systems
summary: Observability matrix of a state-space pair (A, C).
related: [ctrb, lqe, gram]
examples: []
tags: [control, observability, state space, observer, rank]
references:
  - "Nise, N.S., Control Systems Engineering (7th ed.), Ch. 12, §12.5"
  - "Ogata, K., Modern Control Engineering (5th ed.), Ch. 9, §9.7"
---

# obsv

Returns the **observability matrix** `Ob` of the pair `(A, C)`. The system is
observable — its full state can be reconstructed from the output, so an observer of
arbitrary speed exists — iff `Ob` has full rank.

## Syntax

```
CALL obsv(A, C : Ob)
Ob = obsv(A, C)
```

## Mathematical Formulation

For an `n`-state system (Nise §12.5), the dual of `ctrb`:

$$ \mathcal{O} = \begin{bmatrix} C \\ CA \\ CA^2 \\ \vdots \\ CA^{n-1} \end{bmatrix} $$

The pair is observable iff `rank(O) = n`.

> **Method:** stack `[C; CA; …; CAⁿ⁻¹]`.

## Examples

```
{ Ob = obsv(A, C); observable iff rank(Ob) = n }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | State matrix (n×n). |
| `C` | Matrix | Yes | Output matrix. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `Ob` | Matrix | Observability matrix. |

## References

1. Nise, N.S. *Control Systems Engineering* (7th ed.), Ch. 12, §12.5.
2. Ogata, K. *Modern Control Engineering* (5th ed.), Ch. 9, §9.7.
