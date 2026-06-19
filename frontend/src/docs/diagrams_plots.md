[Topic: diagram]
# Diagram Canvas & Schematics

The **Diagram** panel allows you to build schematics of engineering systems and overlay live data.

## Schematic Modeler
- **Add Components:** Drag pumps, turbines, heat exchangers, and pipelines from the palette onto the canvas.
- **Wire Connections:** Click and drag between component ports to define flows.
- **Bind Variables:** Double-click components or connections to link text labels directly to solved variables (e.g. binding a temperature label to `T[2]`).

## Dynamic Diagrams
In addition to schematics, the canvas supports thermodynamic diagrams (such as T-s or P-h charts) where state tables are automatically overlaid and connected as thermodynamic cycle paths.

[Topic: plot-code]
# Plots in Code (PLOT)

You can declare figures directly inside your code using a `PLOT` block.

## Plot Block Syntax
Declare the plot kind, data sources, and formatting attributes:
- **XY Plot of Solved Arrays:**
```
PLOT 'Speed vs Distance'
  kind = xy
  x = speed[1:N]
  y = distance[1:N]
  xlabel = 'Speed [m/s]'
  ylabel = 'Distance [m]'
END
```
- **Thermodynamic Property Plot:**
```
PLOT 'Boiler Cycle'
  kind = property
  fluid = Water
  diagram = 'T-s'
  overlaystates = true
  connectstates = true
END
```

## Control-System Plot Kinds
Dedicated kinds for the control-systems analysis functions (see *Control Systems & Symbolic CAS*). Feed them the arrays produced by `bode`, `nyquist`, `pole`/`zero`:
- **Bode diagram** (stacked magnitude-dB and phase-deg axes versus frequency):
```
PLOT 'Bode Diagram'
  kind = bode
  omega = omega
  mag = mag
  phase = phase
END
```
- **Nyquist diagram** (real vs. imaginary, with the `-1 + j0` critical point marked):
```
PLOT 'Nyquist Diagram'
  kind = nyquist
  real = re
  imag = im
END
```
- **Pole-Zero map** (s-plane scatter; poles as `x`, zeros as `o`):
```
PLOT 'Pole-Zero Map'
  kind = polezero
  pr = pr
  pi = pi
  zr = zr
  zi = zi
END
```

Time responses (`step`, `impulse`, `lsim`) reuse the standard **xy** kind with the time vector on `x`.

## Embedding in Reports
Include code-defined plots directly in your rich text report with the graph tag:
```
[Graph="Boiler Cycle"] Temperature-Entropy diagram of the power cycle [/Graph]
```
The plot will render as a live, interactive chart within the formatted report page.
