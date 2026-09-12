---
name: rms
category: Stats
summary: Root mean square
related: []
examples: []
tags: [rms, stats]
references: []
---

# rms

Root mean square


## Syntax

```
rms(x1, x2, ...)
```

## Description

Root mean square

## Mathematical Formulation

$$ x_{\text{rms}} = \sqrt{\frac{1}{n}\sum_{i=1}^{n} x_i^2} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a scalar engineering calculation

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = rms(-2, 2, -2, 2)

{ CHECK result 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 2
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x1` | Number | Yes | First value. |
| `x2` | Number | Yes | Second value. |
| `...` | Number | Yes | Additional values (variadic). |
