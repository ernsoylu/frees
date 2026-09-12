---
name: gaussintegral
category: Calculus
summary: Definite integral by Gauss-Legendre quadrature
related: []
examples: []
tags: [gaussintegral, calculus]
---

# gaussintegral

Definite integral by Gauss-Legendre quadrature


## Syntax

```
GaussIntegral(expr, var, lower, upper)
```

## Description

Definite integral by Gauss-Legendre quadrature

## Mathematical Formulation

$$ \int_a^b f(x)\,dx \approx \frac{b-a}{2}\sum_{i=1}^{n} w_i\,f\!\left(\tfrac{b-a}{2}\xi_i + \tfrac{a+b}{2}\right) \quad\text{(Gauss–Legendre)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ A point count beyond the [2, 64] clamp. }
G = GaussIntegral(x^2, x, 0, 1, 500)

{ CHECK G 0.3333333333 3.333333333333333e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
G = 0.3333333333
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `expr` | Number | Yes | Expression to evaluate. |
| `var` | Number | Yes | Integration variable. |
| `lower` | Number | Yes | Lower limit. |
| `upper` | Number | Yes | Upper limit. |
