---
name: besselj0
category: Special Functions
summary: Bessel function of the first kind, order 0 — J_0(x).
related: [besselj, besselj1, bessely0]
examples: []
tags: [special function, bessel, j0, first kind]
---

# besselj0

Returns `J_0(x)`, the **order-0 Bessel function of the first kind** — the
fixed-order specialization of `besselj`. `J_0(0) = 1`, then it
oscillates with decaying amplitude.

## Syntax

```
y = besselj0(x)
```

## Mathematical Formulation

$$ J_0(x) = \sum_{k=0}^{\infty}\frac{(-1)^k}{(k!)^2}\left(\frac{x}{2}\right)^{2k} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a radial-mode special function

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = besselj0(1)

{ CHECK result 0.7651976838 7.651976837548592e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.7651976838
```

<!-- verified-reference-example:end -->

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
