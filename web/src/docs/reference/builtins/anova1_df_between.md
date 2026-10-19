---
name: anova1_df_between
category: Stats
summary: One-way ANOVA between-group degrees of freedom (k − 1).
related: [anova1_f, anova1_pval, anova1_df_within]
examples: []
tags: [anova1_df_between, stats, anova, hypothesis test]
---

# anova1_df_between

One-way ANOVA between-group degrees of freedom (k − 1).

## Syntax

```
df = anova1_df_between(g1, g2, ...)
```

## Description

`anova1_df_between(g1, g2, ...)` runs a one-way ANOVA F-test of whether all group means are equal, and returns the **between-group degrees of freedom (k − 1)**. Pass two or more groups as vectors.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `g1, g2, ...` | Vector | Yes | Two or more groups of observations. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `df` | Number | Between-group degrees of freedom (k − 1). |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare readings from three sensor batches

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = anova1_df_between([9, 10, 11], [11, 12, 13], [13, 14, 15])

{ CHECK result 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 2
```

<!-- verified-reference-example:end -->
