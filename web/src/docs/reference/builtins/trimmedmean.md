---
name: trimmedmean
category: Stats
summary: α-trimmed mean: drop the lowest and highest α fraction, average the rest.
related: [wmean, mad, average]
examples: []
tags: [trimmedmean, stats, robust, mean]
---

# trimmedmean

α-trimmed mean: drop the lowest and highest α fraction, average the rest.

## Syntax

```
m = trimmedmean(alpha, values)
```

## Description

`trimmedmean(alpha, values)` removes the lowest and the highest `alpha` fraction of the data (each side) and returns the mean of what remains — a mean that ignores outliers.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `alpha` | Number | Yes | Fraction trimmed from each side, in [0, 0.5). |
| `values` | Vector | Yes | Sample values. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `m` | Number | Trimmed mean, in the units of `values`. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Suppress extremes in sensor readings

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = trimmedmean(0.2, [1, 10, 11, 12, 100])

{ CHECK result 11 0.000011 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 11
```

<!-- verified-reference-example:end -->
