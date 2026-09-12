---
name: nparametricruns
category: Tables
summary: Total number of configured parametric runs
related: []
examples: []
tags: [nparametricruns, tables]
references: []
---

# nparametricruns

Total number of configured parametric runs


## Syntax

```
NParametricRuns()
```

## Description

Total number of configured parametric runs


## Mathematical Formulation

$$ \text{total number of configured parametric runs} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Summarize a three-point calibration sweep

Paste the model into the editor and create a parametric table with columns `x`, `y`, and `summary`. Set `x` to 1, 2, and 3, then solve all rows. The zero argument is a placeholder required by the current parser for otherwise argument-free table accessors.

```frees
y = 2*x
summary = NParametricRuns(0)
```

The equivalent executable table request is:

```json
{
  "operation": "solve_table",
  "text": "y = 2*x\nsummary = NParametricRuns(0)",
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
      "value": 3,
      "tolerance": 1e-8
    },
    {
      "path": "results.1.values.summary",
      "value": 3,
      "tolerance": 1e-8
    },
    {
      "path": "results.2.values.summary",
      "value": 3,
      "tolerance": 1e-8
    }
  ]
}
```

Expected `summary` column, in row order:

```text
3
3
3
```

<!-- verified-reference-example:end -->
