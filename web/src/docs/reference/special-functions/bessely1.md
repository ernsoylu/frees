---
name: bessely1
category: Special Functions
summary: Bessel function of the second kind, order 1 — Y_1(x).
related: [bessely, bessely0, besselj1]
examples: []
tags: [special function, bessel, y1, second kind, neumann]
---

# bessely1

Returns `Y_1(x)`, the **order-1 Bessel function of the second kind** (Neumann) — the
fixed-order specialization of `bessely`. Singular as `x → 0⁺`.

## Syntax

```
y = bessely1(x)
```

## Mathematical Formulation

$Y_1$ is the second independent order-one solution of Bessel's equation:

$$
x^2 y'' + x y' + (x^2-1)y = 0,\qquad Y_0'(x) = -Y_1(x).
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a radial-mode special function

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = bessely1(1)

{ CHECK result -0.781212821 7.812128209531196e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = -0.781212821
```

<!-- verified-reference-example:end -->

```
{ finite for x > 0 }
y = bessely1(1)
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Argument (> 0). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | Y_1(x). |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `DOMAIN_ERROR` | `x ≤ 0` | Singular at and below 0; use a positive argument. |
