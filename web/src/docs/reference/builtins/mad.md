---
name: mad
category: Stats
summary: Median absolute deviation: median(|xᵢ − median(x)|).
related: [trimmedmean, skewness]
examples: []
tags: [mad, stats, robust, spread]
---

# mad

Median absolute deviation: median(|xᵢ − median(x)|).

## Syntax

```
d = mad(x1, x2, ...)
```

## Description

`mad(x1, x2, ...)` returns the unscaled median absolute deviation, a robust spread measure. Multiply by 1.4826 to estimate σ for normal data.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x1, x2, ...` | Number | Yes | One or more values. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `d` | Number | MAD, in the units of the values. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a scalar engineering calculation

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = mad(9, 10, 10, 11, 30)

{ CHECK result 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 1
```

<!-- verified-reference-example:end -->
