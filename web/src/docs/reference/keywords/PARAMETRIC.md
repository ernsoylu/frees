---
name: PARAMETRIC
category: Language Keywords
summary: Declares a parametric sweep table whose rows are solved independently from the Tables tab.
related: [TABLE, PLOT, TableAvg]
examples: []
tags: [keyword, block, sweep, parametric, table, study]
references: []
---

# PARAMETRIC

Declares a sweep: the listed columns form a Parametric Table, the swept column is filled from a range, and each row is solved as its own steady problem. The document is deliberately underspecified by the swept variable, so it runs from the **Tables** tab rather than with **Solve**.

## Syntax

```
PARAMETRIC name(var1, var2, …)
  var1 = start : step : end
END
```

## Description

The first header variable is normally the swept input; the remaining columns are outputs filled after each row solves. Rows run in parallel across the worker pool and keep their order. Table accessors (`TableAvg`, `TableValue`, …) read the finished columns back.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Velocity in three pipe sizes

$v = \dot V / (\pi D^2/4)$ for $\dot V = 0.002$ m³/s.

```json
{
  "operation": "solve_table",
  "text": "PARAMETRIC pipe_sizes(D, v)\n  D = 0.02 : 0.02 : 0.06\nEND\nV_dot = 0.002\nv = V_dot / (pi# * D^2 / 4)",
  "request": {
    "table": {
      "variables": ["D", "v"],
      "rows": [{ "D": 0.02 }, { "D": 0.04 }, { "D": 0.06 }]
    }
  },
  "checks": [
    { "path": "results.0.values.v", "value": 6.366197723675814, "tolerance": 1e-8 },
    { "path": "results.1.values.v", "value": 1.5915494309189535, "tolerance": 1e-8 },
    { "path": "results.2.values.v", "value": 0.707355302630646, "tolerance": 1e-8 }
  ]
}
```

Expected output:

```text
D = 0.02  v = 6.3662
D = 0.04  v = 1.5915
D = 0.06  v = 0.70736
```

<!-- verified-reference-example:end -->

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `There are 1 equations and 2 variables. The problem is underspecified …` | **Solve** was pressed on a sweep document. | Run the table from the Tables tab. |
