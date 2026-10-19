---
name: chi2gof_df
category: Stats
summary: Chi-square goodness-of-fit degrees of freedom (k − 1).
related: [chi2gof_stat, chi2gof_pval]
examples: []
tags: [chi2gof_df, stats, chi-square, goodness of fit]
---

# chi2gof_df

Chi-square goodness-of-fit degrees of freedom (k − 1).

## Syntax

```
df = chi2gof_df(observed, expected)
```

## Description

`chi2gof_df(observed, expected)` runs a Pearson χ² goodness-of-fit test of observed counts against expected counts (rescaled to the observed total), and returns the **degrees of freedom (k − 1)**.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `observed` | Vector | Yes | Observed counts per category. |
| `expected` | Vector | Yes | Expected counts per category (same length). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `df` | Number | Degrees of freedom (k − 1). |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare observed and expected category counts

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = chi2gof_df([18, 22, 20], [20, 20, 20])

{ CHECK result 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 2
```

<!-- verified-reference-example:end -->
