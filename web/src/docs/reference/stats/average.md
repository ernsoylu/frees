---
name: average
category: Stats
summary: Arithmetic mean (alias avg)
related: []
examples: []
tags: [average, stats]
---

# average

Arithmetic mean (alias avg)


## Syntax

```
average(x1, x2, ...)
```

## Description

Arithmetic mean (alias avg)

## Mathematical Formulation

$$ \bar x = \frac{1}{n}\sum_{i=1}^{n} x_i $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Average three temperature readings

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = average(18, 20, 22)

{ CHECK result 20 0.000019999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 20
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x1` | Number | Yes | First value. |
| `x2` | Number | Yes | Second value. |
| `...` | Number | Yes | Additional values (variadic). |
