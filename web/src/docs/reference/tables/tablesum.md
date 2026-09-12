---
name: tablesum
category: Tables
summary: Sum of a parametric-table column
related: []
examples: []
tags: [tablesum, tables]
references: []
---

# tablesum

Sum of a parametric-table column


## Syntax

```
TableSum('col')
```

## Description

Sum of a parametric-table column

## Mathematical Formulation

$$ \sum_{r} c_r $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Summarize a three-point calibration sweep

Paste the model into the editor and create a parametric table with columns `x`, `y`, and `summary`. Set `x` to 1, 2, and 3, then solve all rows. The zero argument is a placeholder required by the current parser for otherwise argument-free table accessors.

```frees
y = 2*x
summary = TableSum('y')
```

The equivalent executable table request is:

```json
{
  "operation": "solve_table",
  "text": "y = 2*x\nsummary = TableSum('y')",
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
      "value": 12,
      "tolerance": 1e-8
    },
    {
      "path": "results.1.values.summary",
      "value": 12,
      "tolerance": 1e-8
    },
    {
      "path": "results.2.values.summary",
      "value": 12,
      "tolerance": 1e-8
    }
  ]
}
```

Expected `summary` column, in row order:

```text
12
12
12
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `'col'` | Number | Yes | Name of a result-table column (string). |
