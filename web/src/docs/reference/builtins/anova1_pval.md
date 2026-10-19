---
name: anova1_pval
category: Stats
summary: One-way ANOVA p-value.
related: [anova1_f, anova1_df_between, anova1_df_within]
examples: []
tags: [anova1_pval, stats, anova, hypothesis test]
---

# anova1_pval

One-way ANOVA p-value.

## Syntax

```
p = anova1_pval(g1, g2, ...)
```

## Description

`anova1_pval(g1, g2, ...)` runs a one-way ANOVA F-test of whether all group means are equal, and returns the **p-value**. Pass two or more groups as vectors.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `g1, g2, ...` | Vector | Yes | Two or more groups of observations. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `p` | Number | P-value. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare readings from three sensor batches

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = anova1_pval([9, 10, 11], [11, 12, 13], [13, 14, 15])

{ CHECK result 0.008 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.008
```

<!-- verified-reference-example:end -->
