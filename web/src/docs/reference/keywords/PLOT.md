---
name: PLOT
category: Language Keywords
summary: Declares a plot in the equation text so it travels with the document.
related: [DYNAMIC, PARAMETRIC, bode]
examples: []
tags: [keyword, block, plot, chart, figure, bode, nyquist]
references: []
---

# PLOT

Declares a chart as `key = value` lines. The Plots tab builds it after Check or Solve, so the figure is reproducible from the text alone.

## Syntax

```
PLOT 'Title'
  kind = xy
  x = column
  y = column1, column2
END
```

## Description

The name must be a quoted string. Recognized keys:

- **`kind`** — `xy` (default; also `line`), `property`, `psychro`, `bode`, `nyquist`, `nichols`, `polezero` (`pzmap`), `rootlocus` (`rlocus`).
- **xy** — `x`, `y` (comma-separated list), `type`, `z`, `size`.
- **property** — `fluid`, `diagram`, `quality`, `isolines`, `overlaystates`, `connectstates`, `closecycle`.
- **psychro** — `pressure`, `tmin`, `tmax`, `wetbulb`, `enthalpy`, `volume`.
- **bode / nyquist** — `omega`, `mag`, `phase`, `real`, `imag`.
- **format** — `title`, `xlabel`, `ylabel`, `xlog`, `ylog`, `y2log`, `grid`, `legend`, `fontsize`, `xmin`, `xmax`, `ymin`, `ymax`.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Plot a cooling trajectory

The `PLOT` block does not change the solution; the check confirms the document solves with it present. $T(60) = 20 + 70e^{-3} = 23.485$.

```frees
k     = 0.05
T_amb = 20
DYNAMIC cooldown (time = 0 .. 60, points = 61)
  der(T) = -k * (T - T_amb)
  T(0)   = 90
END
PLOT 'Cooling curve'
  kind = xy
  x = time
  y = T
  xlabel = 'time [s]'
END
T_end = FinalValue('T')

{ CHECK T_end 23.48509 0.0001 }
```

Expected output:

```text
T_end = 23.485
```

<!-- verified-reference-example:end -->

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| ``expected a quoted plot name, found identifier `Drag` `` | Unquoted title. | Write `PLOT 'Drag'`. |
