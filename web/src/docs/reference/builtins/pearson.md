---
name: pearson
category: Stats
summary: Pearson linear correlation coefficient of two series.
related: [corrcoef, spearman, cov]
examples: []
tags: [pearson, stats, correlation]
---

# pearson

Pearson linear correlation coefficient of two series.

## Syntax

```
r = pearson(x, y)
```

## Description

`pearson(x, y)` returns the Pearson correlation coefficient r ∈ [−1, 1] of the paired series. `corrcoef` is an alias.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Vector | Yes | First series. |
| `y` | Vector | Yes | Second series (same length). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `r` | Number | Correlation coefficient (dimensionless). |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Measure linear correlation

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = pearson([1, 2, 3, 4], [3, 4, 6, 7])

{ CHECK result 0.9899494937 9.899494936611665e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.9899494937
```

<!-- verified-reference-example:end -->
