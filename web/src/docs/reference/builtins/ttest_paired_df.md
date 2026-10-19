---
name: ttest_paired_df
category: Stats
summary: Degrees of freedom of the paired-samples t-test.
related: [ttest_paired_stat, ttest_paired_pval]
examples: []
tags: [ttest_paired_df, stats, hypothesis test, t-test]
---

# ttest_paired_df

Degrees of freedom of the paired-samples t-test.

## Syntax

```
df = ttest_paired_df(x, y)
```

## Description

`ttest_paired_df(x, y)` tests whether the mean difference x − y is zero — a one-sample t-test on the differences (two-sided p-value, n − 1 degrees of freedom) — and returns the **degrees of freedom**. The sibling accessors return the other results of the same test.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Vector | Yes | First measurement of each pair. |
| `y` | Vector | Yes | Second measurement of each pair (same length as `x`). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `df` | Number | Degrees of freedom. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare measurements before and after calibration

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = ttest_paired_df([9, 10, 11, 12, 10], [10, 10, 12, 14, 13])

{ CHECK result 4 0.000004 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 4
```

<!-- verified-reference-example:end -->
