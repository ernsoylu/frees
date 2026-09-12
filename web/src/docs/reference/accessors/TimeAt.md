---
name: TimeAt
category: ODE Results
summary: Time at which an ODE (DYNAMIC) column first crosses a target value.
related: [ODEValue, FinalValue, MaxValue]
examples: [newton-cooling-transient]
tags: [ode, dynamic, accessor, crossing, time, event, trajectory]
references: []
---

# TimeAt

Returns the **time** at which a named `DYNAMIC` (ODE) column first crosses a target
value `val`. Use it to read out event times — when a temperature reaches a
threshold, a tank empties, or a response settles.

## Syntax

```
t = TimeAt('col', val)
```

## Description

`TimeAt` scans the column for the first interval that brackets `val`, then linearly
interpolates the crossing time — the inverse of `ODEValue`.

## Mathematical Formulation

For the first interval with $\text{col}(t_i) \le val \le \text{col}(t_{i+1})$ (or
the reverse),

$$ t = t_i + (t_{i+1} - t_i)\,\frac{val - \text{col}(t_i)}{\text{col}(t_{i+1}) - \text{col}(t_i)} $$

> **Method:** locate the first bracketing interval, then linear inverse interpolation.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
DYNAMIC ramp (t = 0 .. 10, points = 101)
  der(y) = 1
  y(0) = 0
END
t7 = TimeAt('y', 7)
y3 = ODEValue('y', 3)

{ CHECK t7 7 0.000006999999999999998 }
{ CHECK y3 3 0.0000030000000000000005 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
t7 = 7
y3 = 3
```

<!-- verified-reference-example:end -->

### Example 1 — Time to reach a target temperature

[Run: newton-cooling-transient]

**Expected:** the instant the cooling curve first crosses the target value.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `'col'` | String | Yes | Name of a state or auxiliary column. |
| `val` | Number | Yes | Target value to cross. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `t` | Number | Time of the first crossing. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `NO_CROSSING` | The column never reaches `val` | Check the target is within the column's range over the run. |
| `UNKNOWN_COLUMN` | `'col'` not a column | Use a state name or declared auxiliary. |
