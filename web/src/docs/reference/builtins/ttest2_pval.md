---
name: ttest2_pval
category: Stats
summary: Two-sided p-value of Welch's two-sample t-test.
related: [ttest2_stat, ttest2_df]
examples: []
tags: [ttest2_pval, stats, hypothesis test, t-test]
---

# ttest2_pval

Two-sided p-value of Welch's two-sample t-test.

## Syntax

```
p = ttest2_pval(x, y)
```

## Description

`ttest2_pval(x, y)` tests whether two independent samples have the same mean without assuming equal variances (two-sided p-value, Welch–Satterthwaite degrees of freedom) and returns the **two-sided p-value**. The sibling accessors return the other results of the same test.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Vector | Yes | First independent sample. |
| `y` | Vector | Yes | Second independent sample. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `p` | Number | Two-sided p-value. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare measurements before and after calibration

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = ttest2_pval([9, 10, 11, 12, 10], [10, 10, 12, 14, 13])

{ CHECK result 0.1848228852 1.848228851621454e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.1848228852
```

<!-- verified-reference-example:end -->
