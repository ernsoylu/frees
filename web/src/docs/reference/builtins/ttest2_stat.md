---
name: ttest2_stat
category: Stats
summary: t statistic of Welch's two-sample t-test.
related: [ttest2_pval, ttest2_df]
examples: []
tags: [ttest2_stat, stats, hypothesis test, t-test]
---

# ttest2_stat

t statistic of Welch's two-sample t-test.

## Syntax

```
t = ttest2_stat(x, y)
```

## Description

`ttest2_stat(x, y)` tests whether two independent samples have the same mean without assuming equal variances (two-sided p-value, Welch–Satterthwaite degrees of freedom) and returns the **t statistic**. The sibling accessors return the other results of the same test.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Vector | Yes | First independent sample. |
| `y` | Vector | Yes | Second independent sample. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `t` | Number | T statistic. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare measurements before and after calibration

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = ttest2_stat([9, 10, 11, 12, 10], [10, 10, 12, 14, 13])

{ CHECK result -1.475729575 0.000001475729574745244 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = -1.475729575
```

<!-- verified-reference-example:end -->
