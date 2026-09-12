---
name: besselk1
category: Special Functions
summary: Modified Bessel function of the second kind, order 1 — K_1(x).
related: [besselk, besselk0, besseli1]
examples: []
tags: [special function, modified bessel, k1, second kind, macdonald]
---

# besselk1

Returns `K_1(x)`, the **order-1 modified Bessel function of the second kind**
(Macdonald) — the fixed-order specialization of `besselk`. Singular as
`x → 0⁺`, decaying like `e^{−x}`, with `K_0'(x) = −K_1(x)`.

## Syntax

```
y = besselk1(x)
```

## Mathematical Formulation

$K_1$ is the decaying order-one solution of the modified Bessel equation:

$$
x^2 y'' + x y' - (x^2+1)y = 0,\qquad
K_0'(x) = -K_1(x),\qquad
K_1(x) \sim \sqrt{\frac{\pi}{2x}}\,e^{-x}
\quad (x \to +\infty).
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a radial-mode special function

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = besselk1(1)

{ CHECK result 0.6019072317 6.019072316669058e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.6019072317
```

<!-- verified-reference-example:end -->

```
{ decays for large x }
y = besselk1(1)
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Argument (> 0). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | K_1(x). |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `DOMAIN_ERROR` | `x ≤ 0` | Singular at and below 0; use a positive argument. |
