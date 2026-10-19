---
name: cov
category: Stats
summary: Unbiased (n − 1) sample covariance of two series.
related: [pearson, corrcoef]
examples: []
tags: [cov, stats, covariance]
---

# cov

Unbiased (n − 1) sample covariance of two series.

## Syntax

```
c = cov(x, y)
```

## Description

`cov(x, y)` returns the Bessel-corrected sample covariance of the paired series `x` and `y`.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Vector | Yes | First series. |
| `y` | Vector | Yes | Second series (same length). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `c` | Number | Covariance, in units of x·y. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Measure covariance of paired readings

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = cov([1, 2, 3, 4], [3, 4, 6, 7])

{ CHECK result 2.333333333 0.0000023333333333333336 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 2.333333333
```

<!-- verified-reference-example:end -->
