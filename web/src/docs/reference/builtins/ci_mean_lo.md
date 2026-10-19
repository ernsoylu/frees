---
name: ci_mean_lo
category: Stats
summary: Lower bound of the t-based confidence interval for the mean.
related: [ci_mean_hi, bootstrap_ci_lo]
examples: []
tags: [ci_mean_lo, stats, confidence interval]
---

# ci_mean_lo

Lower bound of the t-based confidence interval for the mean.

## Syntax

```
b = ci_mean_lo(confidence, data)
```

## Description

`ci_mean_lo(confidence, data)` returns the **lower bound** of the Student-t confidence interval for the population mean of `data`, at confidence level `confidence` (e.g. 0.95).

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `confidence` | Number | Yes | Confidence level in (0, 1), e.g. 0.95. |
| `data` | Vector | Yes | Sample values (n ≥ 2). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `b` | Number | Lower bound, in the units of `data`. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Bound a mean temperature at 95 percent confidence

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = ci_mean_lo(0.95, [19, 20, 21, 22, 20])

{ CHECK result 18.98428522 0.000018984285223017727 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 18.98428522
```

<!-- verified-reference-example:end -->
