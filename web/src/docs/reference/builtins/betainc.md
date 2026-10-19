---
name: betainc
category: Special Functions
summary: Regularized incomplete beta function I_x(a, b).
related: [beta, fcdf, tcdf]
examples: []
tags: [betainc, special, beta]
---

# betainc

Regularized incomplete beta function I_x(a, b).

## Syntax

```
y = betainc(x, a, b)
```

## Description

`betainc(x, a, b)` returns I_x(a, b) = B(x; a, b)/B(a, b), which is P(X ≤ x) for X ~ Beta(a, b). Note the argument order: x first.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Upper limit in [0, 1]. |
| `a` | Number | Yes | Shape parameter (> 0). |
| `b` | Number | Yes | Shape parameter (> 0). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | Value in [0, 1]. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate an incomplete beta function

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = betainc(0.5, 2, 3)

{ CHECK result 0.6875 6.874999999999999e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.6875
```

<!-- verified-reference-example:end -->
