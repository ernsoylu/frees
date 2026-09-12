---
name: sqrt
category: Math
summary: Square root of a number (with unit propagation).
related: [cbrt, exp, abs]
examples: [tank-draining, ev-thermal-management]
tags: [math, square root, elementary]
references: []
---

# sqrt

Returns the **square root** `√x`. In frees it also propagates units — the result
carries the square root of the argument's unit (e.g. `sqrt(m^2) → m`).

## Syntax

```
y = sqrt(x)
```

## Description

A standard elementary function. The argument must be non-negative for a real
result; a negative argument yields a complex value only in complex-aware contexts.

## Mathematical Formulation

$$ y = \sqrt{x} = x^{1/2}, \qquad x \ge 0 $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
big   = 2e6 - 1e12 * small
small = 1e-6 * sqrt(big / 1e6)

{ CHECK big 1000000 1 }
{ CHECK small 0.000001 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
big = 1000000
small = 0.000001
```

<!-- verified-reference-example:end -->

### Example 1 — Discharge velocity in a draining tank

[Run: tank-draining]

**Expected:** `sqrt` of the head term gives the Torricelli outflow velocity.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Non-negative value (any unit). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | The square root, with the square-root unit. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `DOMAIN_ERROR` | `x < 0` in a real context | Ensure the argument is non-negative. |
