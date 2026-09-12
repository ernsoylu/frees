---
name: min
category: Stats
summary: Smallest of the arguments.
related: [max, average, percentile]
examples: [hx-effectiveness-ntu, ev-thermal-management]
tags: [stats, minimum, comparison, elementary]
references: []
---

# min

Returns the **smallest** of its arguments. Commonly used to pick the limiting of
two quantities — e.g. `C_min = min(C_h, C_c)` in heat-exchanger analysis.

## Syntax

```
y = min(a, b, ...)
```

## Description

Accepts two or more numeric arguments and returns the least. Units must be
compatible across the arguments.

## Mathematical Formulation

$$ y = \min(a_1, a_2, \dots, a_n) $$

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

### Example 1 — Minimum capacity rate of a heat exchanger

[Run: hx-effectiveness-ntu]

**Expected:** `C_min = min(C_h, C_c)` selects the smaller heat-capacity rate.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `a, b, …` | Number | Yes | Two or more values with compatible units. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | The smallest argument. |
