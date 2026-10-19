---
name: ttest_paired_pval
category: Stats
summary: Two-sided p-value of the paired-samples t-test.
related: [ttest_paired_stat, ttest_paired_df]
examples: []
tags: [ttest_paired_pval, stats, hypothesis test, t-test]
---

# ttest_paired_pval

Two-sided p-value of the paired-samples t-test.

## Syntax

```
p = ttest_paired_pval(x, y)
```

## Description

`ttest_paired_pval(x, y)` tests whether the mean difference x − y is zero — a one-sample t-test on the differences (two-sided p-value, n − 1 degrees of freedom) — and returns the **two-sided p-value**. The sibling accessors return the other results of the same test.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Vector | Yes | First measurement of each pair. |
| `y` | Vector | Yes | Second measurement of each pair (same length as `x`). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `p` | Number | Two-sided p-value. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare measurements before and after calibration

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = ttest_paired_pval([9, 10, 11, 12, 10], [10, 10, 12, 14, 13])

{ CHECK result 0.05160595781 5.1605957811174716e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.05160595781
```

<!-- verified-reference-example:end -->
