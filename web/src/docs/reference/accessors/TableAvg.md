---
name: TableAvg
category: Tables
summary: Average of a column across the parametric table runs.
related: [TableSum, TableMin, TableMax, TableStdDev]
examples: [driving-cycle-energy]
tags: [accessor, parametric table, average, mean, column]
references: []
---

# TableAvg

Returns the **arithmetic mean** of a named column across all rows of the
parametric table. Use it to summarize a swept study — e.g. the average consumption
over the points of a drive cycle.

## Syntax

```
m = TableAvg('col')
```

## Description

After a parametric (swept) solve, each variable becomes a column with one value per
run. `TableAvg` averages the requested column over all runs.

## Mathematical Formulation

For a column with values $c_1, \dots, c_n$ over `n` runs,

$$ \text{TableAvg}('col') = \frac{1}{n}\sum_{i=1}^{n} c_i $$

> **Method:** arithmetic mean over the parametric-table rows.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Summarize a three-point calibration sweep

Paste the model into the editor and create a parametric table with columns `x`, `y`, and `summary`. Set `x` to 1, 2, and 3, then solve all rows. The zero argument is a placeholder required by the current parser for otherwise argument-free table accessors.

```frees
y = 2*x
summary = TableAvg('y')
```

The equivalent executable table request is:

```json
{
  "operation": "solve_table",
  "text": "y = 2*x\nsummary = TableAvg('y')",
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
      "value": 4,
      "tolerance": 1e-8
    },
    {
      "path": "results.1.values.summary",
      "value": 4,
      "tolerance": 1e-8
    },
    {
      "path": "results.2.values.summary",
      "value": 4,
      "tolerance": 1e-8
    }
  ]
}
```

Expected `summary` column, in row order:

```text
4
4
4
```

<!-- verified-reference-example:end -->

### Example 1 — Average over a drive-cycle sweep

[Run: driving-cycle-energy]

**Expected:** the mean of the requested column across the table's runs.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `'col'` | String | Yes | Name of a parametric-table column. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `m` | Number | Mean of the column across all runs. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `UNKNOWN_COLUMN` | `'col'` not a table column | Use a variable present in the parametric table. |
| `NO_TABLE` | No parametric table has been solved | Run the parametric table first (Solve Table). |
