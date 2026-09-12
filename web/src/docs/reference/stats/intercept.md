---
name: intercept
category: Stats
summary: Least-squares linear-fit intercept
related: []
examples: []
tags: [intercept, stats]
---

# intercept

Least-squares linear-fit intercept


## Syntax

```
intercept(xvals, yvals)
```

## Description

Least-squares linear-fit intercept

## Mathematical Formulation

$$ b = \bar y - m\,\bar x $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Find a sensor calibration offset

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = intercept([0, 1, 2], [2, 5, 8])

{ CHECK result 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 2
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `xvals` | Number | Yes | Independent-variable data (vector). |
| `yvals` | Number | Yes | Dependent-variable data (vector). |
