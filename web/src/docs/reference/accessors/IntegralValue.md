---
name: IntegralValue
category: Tables
summary: Trapezoidal integral of one column versus another (ODE or table data).
related: [TableAvg, ODEValue, integral]
examples: [driving-cycle-energy]
tags: [accessor, integral, trapezoidal, table, ode, area]
---

# IntegralValue

Returns the **trapezoidal integral** of one column with respect to another — the
area under `y` plotted against `x` — over the sampled data of a `DYNAMIC` or table
result. Use it to accumulate a transient quantity, e.g. energy from power over a
drive cycle.

## Syntax

```
A = IntegralValue('y', 'x')
```

## Description

`IntegralValue` integrates the `y` column against the `x` column using the
composite trapezoidal rule over their shared samples.

## Mathematical Formulation

$$ A = \int y\,dx \approx \sum_{i=0}^{N-1} \frac{y_i + y_{i+1}}{2}\,(x_{i+1} - x_i) \qquad \text{(trapezoidal rule)} $$

> **Method:** composite trapezoidal quadrature over the column samples.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Summarize a three-point calibration sweep

Paste the model into the editor and create a parametric table with columns `x`, `y`, and `summary`. Set `x` to 1, 2, and 3, then solve all rows. The zero argument is a placeholder required by the current parser for otherwise argument-free table accessors.

```frees
y = 2*x
summary = IntegralValue('y', 'x')
```

The equivalent executable table request is:

```json
{
  "operation": "solve_table",
  "text": "y = 2*x\nsummary = IntegralValue('y', 'x')",
  "request": {
    "table": {
      "variables": [
        "x",
        "y",
        "summary"
      ],
      "rows": [
        {
          "x": 1
        },
        {
          "x": 2
        },
        {
          "x": 3
        }
      ]
    }
  },
  "checks": [
    {
      "path": "results.0.values.summary",
      "value": 8,
      "tolerance": 1e-8
    },
    {
      "path": "results.1.values.summary",
      "value": 8,
      "tolerance": 1e-8
    },
    {
      "path": "results.2.values.summary",
      "value": 8,
      "tolerance": 1e-8
    }
  ]
}
```

Expected `summary` column, in row order:

```text
8
8
8
```

<!-- verified-reference-example:end -->

### Example 1 — Energy from power over a drive cycle

[Run: driving-cycle-energy]

**Expected:** the integral of power versus time — the cycle energy [J].

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `'y'` | String | Yes | Integrand column. |
| `'x'` | String | Yes | Integration-variable column. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `A` | Number | The trapezoidal integral ∫ y dx. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `UNKNOWN_COLUMN` | `'y'` or `'x'` not a column | Use valid column names from the result table. |
