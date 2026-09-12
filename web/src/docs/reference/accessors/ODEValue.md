---
name: ODEValue
category: ODE Results
summary: Value of an ODE (DYNAMIC) column interpolated at a given time.
related: [FinalValue, MaxValue, TimeAt]
examples: [damped-oscillator-ode]
tags: [ode, dynamic, accessor, interpolation, time, trajectory]
references: []
---

# ODEValue

Returns the value of a named `DYNAMIC` (ODE) column **interpolated at an arbitrary
time** `t` within the integration window. Use it to sample a transient at a
specific instant that need not coincide with an integration step.

## Syntax

```
v = ODEValue('col', t)
```

## Description

Because the adaptive integrator places samples unevenly, `ODEValue` linearly
interpolates the column between the bracketing samples to return the value at the
requested time.

## Mathematical Formulation

For `t` bracketed by samples $t_i \le t \le t_{i+1}$,

$$ \text{ODEValue}('col', t) = \text{col}(t_i) + \big(\text{col}(t_{i+1}) - \text{col}(t_i)\big)\frac{t - t_i}{t_{i+1} - t_i} $$

> **Method:** linear interpolation between the two bracketing integration samples.

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

### Example 1 — Sample a transient at a chosen instant

[Run: damped-oscillator-ode]

**Expected:** the column value at the requested time, interpolated from the ODE
trajectory.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `'col'` | String | Yes | Name of a state or auxiliary column. |
| `t` | Number | Yes | Time at which to sample (within the integration window). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `v` | Number | The interpolated column value at time `t`. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `TIME_OUT_OF_RANGE` | `t` outside the integration window | Sample within `[t0, tf]` of the `DYNAMIC` block. |
| `UNKNOWN_COLUMN` | `'col'` not a column | Use a state name or declared auxiliary. |
