---
name: ttest2_df
category: Stats
summary: Degrees of freedom of Welch's two-sample t-test.
related: [ttest2_stat, ttest2_pval]
examples: []
tags: [ttest2_df, stats, hypothesis test, t-test]
---

# ttest2_df

Degrees of freedom of Welch's two-sample t-test.

## Syntax

```
df = ttest2_df(x, y)
```

## Description

`ttest2_df(x, y)` tests whether two independent samples have the same mean without assuming equal variances (two-sided p-value, Welch–Satterthwaite degrees of freedom) and returns the **degrees of freedom**. The sibling accessors return the other results of the same test.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Vector | Yes | First independent sample. |
| `y` | Vector | Yes | Second independent sample. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `df` | Number | Degrees of freedom. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare measurements before and after calibration

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = ttest2_df([9, 10, 11, 12, 10], [10, 10, 12, 14, 13])

{ CHECK result 6.789606035 0.0000067896060352053624 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 6.789606035
```

<!-- verified-reference-example:end -->
