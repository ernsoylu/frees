---
name: tablevalue
category: Tables
summary: Cell value in the parametric table
related: []
examples: []
tags: [tablevalue, tables]
references: []
---

# tablevalue

Cell value in the parametric table


## Syntax

```
TableValue(run, col)
```

## Description

Cell value in the parametric table

## Mathematical Formulation

$$ \operatorname{TableValue}(r, c) = \text{cell } (r, c) \text{ of the parametric table} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Summarize a three-point calibration sweep

Paste the model into the editor and create a parametric table with columns `x`, `y`, and `summary`. Set `x` to 1, 2, and 3, then solve all rows. The zero argument is a placeholder required by the current parser for otherwise argument-free table accessors.

```frees
y = 2*x
summary = TableValue(2, 2)
```

The equivalent executable table request is:

```json
{
  "operation": "solve_table",
  "text": "y = 2*x\nsummary = TableValue(2, 2)",
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

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `run` | Number | Yes | Parametric run index. |
| `col` | Number | Yes | Name of a result-table column. |
