---
name: max
category: Stats
summary: Largest of the arguments.
related: [min, average, percentile]
examples: [hx-effectiveness-ntu]
tags: [stats, maximum, comparison, elementary]
references: []
---

# max

Returns the **largest** of its arguments — e.g. `C_max = max(C_h, C_c)` in
heat-exchanger analysis.

## Syntax

```
y = max(a, b, ...)
```

## Description

Accepts two or more numeric arguments and returns the greatest. Units must be
compatible across the arguments.

## Mathematical Formulation

$$ y = \max(a_1, a_2, \dots, a_n) $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ min/max with several arguments. }
a = max(1, 7, 3)
b = min(4, 2, 9)

{ CHECK a 7 0.000007 }
{ CHECK b 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a = 7
b = 2
```

<!-- verified-reference-example:end -->

### Example 1 — Maximum capacity rate of a heat exchanger

[Run: hx-effectiveness-ntu]

**Expected:** `C_max = max(C_h, C_c)` selects the larger heat-capacity rate.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `a, b, …` | Number | Yes | Two or more values with compatible units. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | The largest argument. |
