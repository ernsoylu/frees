---
name: odesum
category: ODE Results
summary: Sum of an ODE column
related: []
examples: []
tags: [odesum, ode, results]
references: []
---

# odesum

Sum of an ODE column


## Syntax

```
ODESum('col')
```

## Description

Sum of an ODE column

## Mathematical Formulation

$$ \sum_{i=0}^{N} \text{col}(t_i) $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ The accessors applied to column 0 — the independent variable itself. }
Tend = FinalValue('time')
Tavg = ODEAvg('time')
Tstd = ODEStdDev('time')
Tsum = ODESum('time')

DYNAMIC cooling (method = ode45, time = 0 .. 60, points = 13)
  der(Temp) = -0.05*(Temp - 20)
  Temp(0) = 95
END

{ CHECK Tavg 30 0.000029999999999999997 }
{ CHECK Tend 60 0.000059999999999999995 }
{ CHECK Tstd 18.70828693 0.000018708286933869708 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
Tavg = 30
Tend = 60
Tstd = 18.70828693
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `'col'` | Number | Yes | Name of a result-table column (string). |
