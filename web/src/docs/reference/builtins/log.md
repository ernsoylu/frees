---
name: log
category: Math
summary: Base-10 logarithm (same as log10).
related: [log10, ln, exp]
examples: []
tags: [log, math, logarithm]
---

# log

Base-10 logarithm (same as log10).

## Syntax

```
y = log(x)
```

## Description

`log(x)` returns the **base-10** logarithm of x > 0. Use `ln` for the natural logarithm.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Positive, dimensionless value. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | log₁₀(x). |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a scalar engineering calculation

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = log(1000)

{ CHECK result 3 0.000003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 3
```

<!-- verified-reference-example:end -->
