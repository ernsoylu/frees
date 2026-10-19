---
name: chi2gof_pval
category: Stats
summary: Chi-square goodness-of-fit p-value.
related: [chi2gof_stat, chi2gof_df]
examples: []
tags: [chi2gof_pval, stats, chi-square, goodness of fit]
---

# chi2gof_pval

Chi-square goodness-of-fit p-value.

## Syntax

```
p = chi2gof_pval(observed, expected)
```

## Description

`chi2gof_pval(observed, expected)` runs a Pearson χ² goodness-of-fit test of observed counts against expected counts (rescaled to the observed total), and returns the **p-value**.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `observed` | Vector | Yes | Observed counts per category. |
| `expected` | Vector | Yes | Expected counts per category (same length). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `p` | Number | P-value. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare observed and expected category counts

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = chi2gof_pval([18, 22, 20], [20, 20, 20])

{ CHECK result 0.8187307531 8.187307530779818e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.8187307531
```

<!-- verified-reference-example:end -->
