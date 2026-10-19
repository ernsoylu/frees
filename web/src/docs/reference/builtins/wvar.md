---
name: wvar
category: Stats
summary: Bessel-corrected weighted sample variance (reliability weights).
related: [wmean]
examples: []
tags: [wvar, stats, weighted, variance]
---

# wvar

Bessel-corrected weighted sample variance (reliability weights).

## Syntax

```
v = wvar(weights, values)
```

## Description

`wvar(weights, values)` returns the unbiased weighted variance with denominator Σwᵢ − Σwᵢ²/Σwᵢ (the statsmodels `DescrStatsW` convention). Weights first.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `weights` | Vector | Yes | Non-negative weights with a positive sum. |
| `values` | Vector | Yes | Values (same length). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `v` | Number | Weighted variance, in squared units of `values`. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Estimate weighted measurement variance

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = wvar([1, 2, 1], [18, 20, 22])

{ CHECK result 3.2 0.0000032 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 3.2
```

<!-- verified-reference-example:end -->
