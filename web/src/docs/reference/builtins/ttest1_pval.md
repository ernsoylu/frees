---
name: ttest1_pval
category: Stats
summary: Two-sided p-value of the one-sample t-test.
related: [ttest1_stat, ttest1_df]
examples: []
tags: [ttest1_pval, stats, hypothesis test, t-test]
---

# ttest1_pval

Two-sided p-value of the one-sample t-test.

## Syntax

```
p = ttest1_pval(mu0, data)
```

## Description

`ttest1_pval(mu0, data)` tests whether the population mean of `data` equals `mu0` (t = (x̄ − μ₀)/(s/√n), two-sided p-value, n − 1 degrees of freedom) and returns the **two-sided p-value**. The sibling accessors return the other results of the same test.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `mu0` | Number | Yes | Hypothesised population mean. |
| `data` | Vector | Yes | Sample values (n ≥ 2). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `p` | Number | Two-sided p-value. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare sensor readings with a nominal value

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = ttest1_pval(10, [9, 10, 11, 12, 10])

{ CHECK result 0.4766206673 4.7662066727284056e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.4766206673
```

<!-- verified-reference-example:end -->
