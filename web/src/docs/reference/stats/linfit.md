---
name: linfit
category: Stats
summary: Reference page for linfit.
related: []
examples: []
tags: [linfit]
---

# linfit

Fits a straight line and returns its slope, intercept, and coefficient of determination.

## Syntax

```
[slope, intercept, r2] = linfit(x, y)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

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
