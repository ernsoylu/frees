---
name: chebyshevu
category: Special Functions
summary: Chebyshev polynomial of the second kind, U_n(x).
related: [chebyshevt, legendrep]
examples: []
tags: [special function, chebyshev, orthogonal polynomial, second kind]
references:
  - "NIST Digital Library of Mathematical Functions, §18.3"
---

# chebyshevu

Returns the **Chebyshev polynomial of the second kind** `U_n(x)` of degree `n` —
orthogonal on `[−1, 1]` with weight `√(1 − x²)`, and the derivative partner of
`chebyshevt`.

## Syntax

```
y = chebyshevu(n, x)
```

## Description

On `[−1, 1]`, `U_n(cos θ) = sin((n+1)θ)/sin θ`. `U_0 = 1`, `U_1 = 2x`, with
`T_n'(x) = n·U_{n−1}(x)`.

## Mathematical Formulation

$$ U_n(\cos\theta) = \frac{\sin((n+1)\theta)}{\sin\theta}, \qquad U_{n+1}(x) = 2x\,U_n(x) - U_{n-1}(x) $$

> **Method:** three-term recurrence from `U_0 = 1`, `U_1 = 2x`.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a third-order approximation basis

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = chebyshevu(3, 0.5)

{ CHECK result -1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = -1
```

<!-- verified-reference-example:end -->

```
{ U_1(x) = 2x; chebyshevu(1, 1) = 2 }
y = chebyshevu(1, 1)
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `n` | Number | Yes | Polynomial degree (≥ 0). |
| `x` | Number | Yes | Argument. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | U_n(x). |

## References

1. NIST *Digital Library of Mathematical Functions*, §18.3.
