---
name: spearman
category: Stats
summary: Spearman rank correlation coefficient of two series.
related: [pearson, corrcoef]
examples: []
tags: [spearman, stats, correlation, rank]
---

# spearman

Spearman rank correlation coefficient of two series.

## Syntax

```
rho = spearman(x, y)
```

## Description

`spearman(x, y)` returns the Spearman rank correlation ρ ∈ [−1, 1] — the Pearson correlation of the ranks, robust to monotone non-linearity and outliers.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Vector | Yes | First series. |
| `y` | Vector | Yes | Second series (same length). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `rho` | Number | Rank correlation (dimensionless). |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare ranks of paired readings

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = spearman([1, 2, 3, 4], [3, 4, 6, 7])

{ CHECK result 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 1
```

<!-- verified-reference-example:end -->
