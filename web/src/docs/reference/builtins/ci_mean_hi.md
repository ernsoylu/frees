---
name: ci_mean_hi
category: Stats
summary: Upper bound of the t-based confidence interval for the mean.
related: [ci_mean_lo, bootstrap_ci_hi]
examples: []
tags: [ci_mean_hi, stats, confidence interval]
---

# ci_mean_hi

Upper bound of the t-based confidence interval for the mean.

## Syntax

```
b = ci_mean_hi(confidence, data)
```

## Description

`ci_mean_hi(confidence, data)` returns the **upper bound** of the Student-t confidence interval for the population mean of `data`, at confidence level `confidence` (e.g. 0.95).

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `confidence` | Number | Yes | Confidence level in (0, 1), e.g. 0.95. |
| `data` | Vector | Yes | Sample values (n ≥ 2). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `b` | Number | Upper bound, in the units of `data`. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Bound a mean temperature at 95 percent confidence

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = ci_mean_hi(0.95, [19, 20, 21, 22, 20])

{ CHECK result 21.81571478 0.00002181571477698227 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 21.81571478
```

<!-- verified-reference-example:end -->
