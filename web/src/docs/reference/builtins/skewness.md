---
name: skewness
category: Stats
summary: Bias-corrected sample skewness (Fisher).
related: [kurtosis, mad]
examples: []
tags: [skewness, stats, moment]
---

# skewness

Bias-corrected sample skewness (Fisher).

## Syntax

```
s = skewness(x1, x2, x3, ...)
```

## Description

`skewness(x1, x2, x3, ...)` returns the bias-corrected sample skewness (SciPy `skew(bias=False)`). Needs at least three values.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x1, x2, x3, ...` | Number | Yes | Three or more values. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `s` | Number | Skewness (dimensionless). |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a scalar engineering calculation

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = skewness(1, 2, 2, 3, 7)

{ CHECK result 1.744369497 0.0000017443694974549943 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 1.744369497
```

<!-- verified-reference-example:end -->
