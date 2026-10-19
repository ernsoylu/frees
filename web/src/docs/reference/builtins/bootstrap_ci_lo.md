---
name: bootstrap_ci_lo
category: Stats
summary: Lower bound of a seeded bootstrap confidence interval for the mean.
related: [bootstrap_ci_hi, ci_mean_lo]
examples: []
tags: [bootstrap_ci_lo, stats, bootstrap, confidence interval]
---

# bootstrap_ci_lo

Lower bound of a seeded bootstrap confidence interval for the mean.

## Syntax

```
b = bootstrap_ci_lo(confidence, n_resamples, seed, data)
```

## Description

`bootstrap_ci_lo(confidence, n_resamples, seed, data)` draws `n_resamples` bootstrap samples (with replacement) from `data` and returns the **lower percentile bound** of the resampled means. The same seed always gives the same interval.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `confidence` | Number | Yes | Confidence level in (0, 1). |
| `n_resamples` | Number | Yes | Number of bootstrap resamples. |
| `seed` | Number | Yes | Random seed (integer). |
| `data` | Vector | Yes | Sample values. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `b` | Number | Lower bound, in the units of `data`. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Bootstrap a mean with a reproducible seed

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = bootstrap_ci_lo(0.95, 200, 42, [19, 20, 21, 22, 20])

{ CHECK result 19.6 0.000019600000000000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 19.6
```

<!-- verified-reference-example:end -->
