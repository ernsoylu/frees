---
name: besselj0
category: Special Functions
summary: Bessel function of the first kind, order 0 — J_0(x).
related: [besselj, besselj1, bessely0]
examples: []
tags: [special function, bessel, j0, first kind]
references:
  - "Abramowitz, M. & Stegun, I.A., Handbook of Mathematical Functions, §9.1"
---

# besselj0

Returns `J_0(x)`, the **order-0 Bessel function of the first kind** — the
fixed-order specialization of [`besselj`](besselj). `J_0(0) = 1`, then it
oscillates with decaying amplitude.

## Syntax

```
y = besselj0(x)
```

## Mathematical Formulation

$$ J_0(x) = \sum_{k=0}^{\infty}\frac{(-1)^k}{(k!)^2}\left(\frac{x}{2}\right)^{2k} \qquad \text{(A\&S §9.1)} $$

## Examples

```
{ besselj0(0) = 1 }
y = besselj0(0)
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Argument. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | J_0(x). |

## References

1. Abramowitz, M. & Stegun, I.A. *Handbook of Mathematical Functions*, §9.1.
