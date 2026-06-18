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

## Embedding in Reports
Include code-defined plots directly in your rich text report with the graph tag:
```
[Graph="Boiler Cycle"] Temperature-Entropy diagram of the power cycle [/Graph]
```
The plot will render as a live, interactive chart within the formatted report page.
