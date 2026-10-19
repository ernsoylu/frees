---
name: chi2gof_stat
category: Stats
summary: Chi-square goodness-of-fit χ² statistic.
related: [chi2gof_pval, chi2gof_df]
examples: []
tags: [chi2gof_stat, stats, chi-square, goodness of fit]
---

# chi2gof_stat

Chi-square goodness-of-fit χ² statistic.

## Syntax

```
chi2 = chi2gof_stat(observed, expected)
```

## Description

`chi2gof_stat(observed, expected)` runs a Pearson χ² goodness-of-fit test of observed counts against expected counts (rescaled to the observed total), and returns the **χ² statistic**.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `observed` | Vector | Yes | Observed counts per category. |
| `expected` | Vector | Yes | Expected counts per category (same length). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `chi2` | Number | Χ² statistic. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare observed and expected category counts

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = chi2gof_stat([18, 22, 20], [20, 20, 20])

{ CHECK result 0.4 4e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.4
```

<!-- verified-reference-example:end -->
