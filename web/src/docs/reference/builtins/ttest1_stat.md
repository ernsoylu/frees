---
name: ttest1_stat
category: Stats
summary: t statistic of the one-sample t-test.
related: [ttest1_pval, ttest1_df]
examples: []
tags: [ttest1_stat, stats, hypothesis test, t-test]
---

# ttest1_stat

t statistic of the one-sample t-test.

## Syntax

```
t = ttest1_stat(mu0, data)
```

## Description

`ttest1_stat(mu0, data)` tests whether the population mean of `data` equals `mu0` (t = (x̄ − μ₀)/(s/√n), two-sided p-value, n − 1 degrees of freedom) and returns the **t statistic**. The sibling accessors return the other results of the same test.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `mu0` | Number | Yes | Hypothesised population mean. |
| `data` | Vector | Yes | Sample values (n ≥ 2). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `t` | Number | T statistic. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare sensor readings with a nominal value

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = ttest1_stat(10, [9, 10, 11, 12, 10])

{ CHECK result 0.7844645406 7.844645405527369e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.7844645406
```

<!-- verified-reference-example:end -->
