---
name: wmean
category: Stats
summary: Weighted arithmetic mean.
related: [wvar, average, trimmedmean]
examples: []
tags: [wmean, stats, weighted, mean]
---

# wmean

Weighted arithmetic mean.

## Syntax

```
m = wmean(weights, values)
```

## Description

`wmean(weights, values)` returns Σwᵢxᵢ / Σwᵢ. Note the order: weights first.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `weights` | Vector | Yes | Non-negative weights with a positive sum. |
| `values` | Vector | Yes | Values (same length). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `m` | Number | Weighted mean, in the units of `values`. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Average weighted temperature readings

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = wmean([1, 2, 1], [18, 20, 22])

{ CHECK result 20 0.000019999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 20
```

<!-- verified-reference-example:end -->
