---
name: slope
category: Stats
summary: Least-squares linear-fit slope
related: []
examples: []
tags: [slope, stats]
---

# slope

Least-squares linear-fit slope


## Syntax

```
slope(xvals, yvals)
```

## Description

Least-squares linear-fit slope

## Mathematical Formulation

$$ m = \frac{\sum (x_i-\bar x)(y_i-\bar y)}{\sum (x_i-\bar x)^2} \quad\text{(least squares)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Find a sensor calibration gain

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = Slope([0, 1, 2], [2, 5, 8])

{ CHECK result 3 0.000003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 3
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `xvals` | Number | Yes | Independent-variable data (vector). |
| `yvals` | Number | Yes | Dependent-variable data (vector). |
