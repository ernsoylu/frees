---
name: besselk0
category: Special Functions
summary: Modified Bessel function of the second kind, order 0 — K_0(x).
related: [besselk, besselk1, besseli0]
examples: []
tags: [special function, modified bessel, k0, second kind, macdonald]
---

# besselk0

Returns `K_0(x)`, the **order-0 modified Bessel function of the second kind**
(Macdonald) — the fixed-order specialization of `besselk`. Singular as
`x → 0⁺`, decaying like `e^{−x}`.

## Syntax

```
y = besselk0(x)
```

## Mathematical Formulation

$K_0$ is the decaying order-zero solution of the modified Bessel equation:

$$
x^2 y'' + x y' - x^2 y = 0,
\qquad K_0(x) \sim \sqrt{\frac{\pi}{2x}}\,e^{-x}
\quad (x \to +\infty).
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a radial-mode special function

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = besselk0(1)

{ CHECK result 0.4210244211 4.2102442108341797e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.4210244211
```

<!-- verified-reference-example:end -->

```
{ decays for large x }
y = besselk0(1)
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Argument (> 0). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | K_0(x). |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `DOMAIN_ERROR` | `x ≤ 0` | Singular at and below 0; use a positive argument. |
