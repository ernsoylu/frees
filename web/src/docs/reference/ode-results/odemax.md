---
name: odemax
category: ODE Results
summary: Maximum of an ODE column
related: []
examples: []
tags: [odemax, ode, results]
references: []
---

# odemax

Maximum of an ODE column


## Syntax

```
ODEMax('col')
```

## Description

Maximum of an ODE column

## Mathematical Formulation

$$ \max_i \text{col}(t_i) $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ Every ODE accessor read off one solved table. ODEStdDev is population, not
  sample; ODESum has no time weighting; both are pinned here. }
k = 0.05
Tinf = 20

Vfinal = FinalValue('Temp')
Vmax   = MaxValue('Temp')
Vmin   = MinValue('Temp')
Vomax  = ODEMax('Temp')
Vomin  = ODEMin('Temp')
Vavg   = ODEAvg('Temp')
Vsum   = ODESum('Temp')
Vstd   = ODEStdDev('Temp')
Vat    = ODEValue('Temp', 17.5)
Vtime  = TimeAt('Temp', 50)

DYNAMIC cooling (method = ode45, time = 0 .. 60, points = 13)
  der(Temp) = -k*(Temp - Tinf)
  Temp(0) = 95
END

{ CHECK Vat 51.50922473 0.000051509224727395944 }
{ CHECK Vavg 45.07031213 0.00004507031212924427 }
{ CHECK Vfinal 23.73403013 0.000023734030127668667 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
Vat = 51.50922473
Vavg = 45.07031213
Vfinal = 23.73403013
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `'col'` | Number | Yes | Name of a result-table column (string). |
