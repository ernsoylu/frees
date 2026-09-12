---
name: bessely0
category: Special Functions
summary: Bessel function of the second kind, order 0 — Y_0(x).
related: [bessely, bessely1, besselj0]
examples: []
tags: [special function, bessel, y0, second kind, neumann]
---

# bessely0

Returns `Y_0(x)`, the **order-0 Bessel function of the second kind** (Neumann) — the
fixed-order specialization of `bessely`. `Y_0(x) → −∞` as `x → 0⁺`.

## Syntax

```
y = bessely0(x)
```

## Mathematical Formulation

$$ Y_0(x) = \frac{2}{\pi}\left[\ln\!\frac{x}{2} + \gamma\right]J_0(x) + \dots $$

the second independent order-0 solution of Bessel's equation.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a radial-mode special function

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = bessely0(1)

{ CHECK result 0.0882569714 8.825697139770806e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.0882569714
```

<!-- verified-reference-example:end -->

```
{ finite for x > 0 }
y = bessely0(1)
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Argument (> 0). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | Y_0(x). |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `DOMAIN_ERROR` | `x ≤ 0` | Singular at and below 0; use a positive argument. |
