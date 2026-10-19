---
name: int
category: Math
summary: Integer part — truncate toward zero.
related: [trunc, floor, round]
examples: []
tags: [int, math, truncate]
---

# int

Integer part — truncate toward zero.

## Syntax

```
y = int(x)
```

## Description

`int(x)` drops the fractional part, rounding toward zero (`int(-2.7) = -2`). Use `floor` to round toward −∞.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Any real value. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | Integer-valued result. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a scalar engineering calculation

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = int(3.9)

{ CHECK result 3 0.000003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 3
```

<!-- verified-reference-example:end -->
