---
name: anova1_f
category: Stats
summary: One-way ANOVA F statistic.
related: [anova1_pval, anova1_df_between, anova1_df_within]
examples: []
tags: [anova1_f, stats, anova, hypothesis test]
---

# anova1_f

One-way ANOVA F statistic.

## Syntax

```
F = anova1_f(g1, g2, ...)
```

## Description

`anova1_f(g1, g2, ...)` runs a one-way ANOVA F-test of whether all group means are equal, and returns the **F statistic**. Pass two or more groups as vectors.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `g1, g2, ...` | Vector | Yes | Two or more groups of observations. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `F` | Number | F statistic. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare readings from three sensor batches

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = anova1_f([9, 10, 11], [11, 12, 13], [13, 14, 15])

{ CHECK result 12 0.000012 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 12
```

<!-- verified-reference-example:end -->
