---
name: anova1_df_within
category: Stats
summary: One-way ANOVA within-group degrees of freedom (N − k).
related: [anova1_f, anova1_pval, anova1_df_between]
examples: []
tags: [anova1_df_within, stats, anova, hypothesis test]
---

# anova1_df_within

One-way ANOVA within-group degrees of freedom (N − k).

## Syntax

```
df = anova1_df_within(g1, g2, ...)
```

## Description

`anova1_df_within(g1, g2, ...)` runs a one-way ANOVA F-test of whether all group means are equal, and returns the **within-group degrees of freedom (N − k)**. Pass two or more groups as vectors.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `g1, g2, ...` | Vector | Yes | Two or more groups of observations. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `df` | Number | Within-group degrees of freedom (N − k). |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare readings from three sensor batches

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = anova1_df_within([9, 10, 11], [11, 12, 13], [13, 14, 15])

{ CHECK result 6 0.000006 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 6
```

<!-- verified-reference-example:end -->
