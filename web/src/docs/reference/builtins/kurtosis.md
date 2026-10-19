---
name: kurtosis
category: Stats
summary: Bias-corrected sample excess kurtosis (Fisher).
related: [skewness, mad]
examples: []
tags: [kurtosis, stats, moment]
---

# kurtosis

Bias-corrected sample excess kurtosis (Fisher).

## Syntax

```
k = kurtosis(x1, x2, x3, x4, ...)
```

## Description

`kurtosis(x1, ..., xn)` returns the bias-corrected **excess** kurtosis (SciPy `kurtosis(bias=False, fisher=True)`), so a normal sample gives ≈ 0. Needs at least four values.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x1, x2, x3, x4, ...` | Number | Yes | Four or more values. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `k` | Number | Excess kurtosis (dimensionless). |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a scalar engineering calculation

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = kurtosis(1, 2, 2, 3, 7)

{ CHECK result 3.32231405 0.000003322314049586774 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 3.32231405
```

<!-- verified-reference-example:end -->
