---
name: linfit
category: Stats
summary: Straight-line least-squares fit: slope, intercept and R².
related: [polyfit, slope, intercept, r2]
examples: []
tags: [linfit]
---

# linfit

Straight-line least-squares fit: slope, intercept and R².

## Syntax

```
[slope, intercept, r2] = linfit(x, y)
```

## Description

`[slope, intercept, r2] = linfit(x, y)` fits `y ≈ slope·x + intercept` by ordinary least squares and returns the coefficient of determination with it — the three scalar accessors `slope`, `intercept` and `r2` in one call.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
x = [1, 2, 3, 4]
y = [2, 4, 6, 8]
[slope, intercept, r2] = linfit(x, y)

{ CHECK intercept 0 1e-8 }
{ CHECK r2 1 0.000001 }
{ CHECK slope 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
intercept = 0
r2 = 1
slope = 2
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Vector | Yes | Sample abscissae. |
| `y` | Vector | Yes | Sample ordinates (same length as `x`). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `slope` | Number | Fitted slope. |
| `intercept` | Number | Fitted intercept. |
| `r2` | Number | Coefficient of determination R². |
