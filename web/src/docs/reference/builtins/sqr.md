---
name: sqr
category: Math
summary: Square, x².
related: [cube, sqrt]
examples: []
tags: [sqr, math, square]
---

# sqr

Square, x².

## Syntax

```
y = sqr(x)
```

## Description

`sqr(x)` returns x·x.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Any real value. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | x², in squared units of x. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a scalar engineering calculation

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = sqr(3)

{ CHECK result 9 0.000009 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 9
```

<!-- verified-reference-example:end -->
