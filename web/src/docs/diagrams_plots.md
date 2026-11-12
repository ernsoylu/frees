[Topic: plot-code]
# Plots in Code (PLOT)

Declare figures directly in your code with a `PLOT ... END` block. Each block names a figure (quoted title) and sets `kind` plus the data attributes for that kind. The figure appears in the Plots panel and can be embedded in reports (see below).

## XY plot (solved arrays)
```
PLOT 'Speed vs Distance'
  kind = xy
  x = speed[1:N]
  y = distance[1:N]
  xlabel = 'Speed [m/s]'
  ylabel = 'Distance [m]'
END
```

## Thermodynamic property plot
Overlays state points from a `STATE TABLE` of the named fluid onto a T-s or P-h chart. Set `overlaystates` to draw the points and `connectstates` to connect them as a cycle path.
```
PLOT 'Boiler Cycle'
  kind = property
  fluid = Water
  diagram = 'T-s'
  overlaystates = true
  connectstates = true
END
```

### Paths from a dynamic run
On a property or psychrometric diagram, `x` and `y` name recorded columns of a `DYNAMIC` block, in SI. The lists pair up in order, and each pair is drawn as a path over the run, ending in a marker at the last row. This P-h chart traces the four states of a refrigeration unit as it pulls a room down:
```
PLOT 'Start-up on P-h'
  kind = property
  fluid = R134a
  diagram = 'P-h'
  overlaystates = false
  x = h_1, h_2, h_3, h_4
  y = P_e, P_c, P_c, P_e
END
```
On the psychrometric chart, pair a dry-bulb temperature with a humidity ratio, for example `x = T_room` and `y = w_room`. A live run publishes its rows to the same table at each pause, step and stop, so the paths then show the run so far.

## Control-system plot kinds
Feed these the arrays produced by `bode`, `nyquist`, `pole`/`zero` (see *Control Systems & Symbolic CAS*):
- **Bode** — stacked magnitude (dB) and phase (deg) vs. frequency:
```
PLOT 'Bode Diagram'
  kind = bode
  omega = omega
  mag = mag
  phase = phase
END
```
- **Nyquist** — real vs. imaginary, with the `-1 + j0` critical point marked:
```
PLOT 'Nyquist Diagram'
  kind = nyquist
  real = re
  imag = im
END
```
- **Pole-zero map** — s-plane scatter (poles `x`, zeros `o`):
```
PLOT 'Pole-Zero Map'
  kind = polezero
  pr = pr
  pi = pi
  zr = zr
  zi = zi
END
```

Time responses (`step`, `impulse`, `lsim`) reuse the standard **xy** kind with the time vector on `x`. The root-locus and Nichols kinds take the matrices/arrays returned by `rlocus` and `nichols`.

## Reports and plot export

The calculation report (File → Formatted report) includes the source, solved
variables, units and warnings. It does **not** embed `[Graph=…]` tags or live
charts. To include a figure, export the plot from the Plots tab as SVG, PNG or
JPG and attach it separately. 3D SVG exports contain a raster image of the
WebGL view, not vector traces.

Array slices in a `PLOT` attribute (`x[2:5]`) are accepted by the parser but
are not a selection: the whole array is plotted. Changing that needs an
explicit compatibility decision; frozen fixtures are not edited to match.

[Related: reports, symbolic-cas]
