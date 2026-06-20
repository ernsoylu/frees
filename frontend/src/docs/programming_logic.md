[Topic: functions]
# Custom Functions & Procedures

frees allows you to encapsulate computational logic in reusable custom blocks.

## Functions
A `FUNCTION` is a local sequential program that returns one or more values. Inside functions, equations are solved **imperatively** using assignment `:=` (like Python/MATLAB).
- **Single-Output:** Returns a single value. Assign the function name to the return value inside the body.
- **Multi-Output:** Returns multiple values (MATLAB-style). Declare return variables in brackets in the header.

### Single-Output Function Example
```
FUNCTION poly_fit(x)
  poly_fit := 0.5 * x^2 + 2 * x + 1
END

y = poly_fit(3)
```

### Multi-Output Function Example
```
FUNCTION [q, r] = DivMod(a, b)
  q := trunc(a / b)
  r := mod(a, b)
END

[quotient, remainder] = DivMod(17, 5)
```

## Procedures
A `PROCEDURE` uses sequential assignment with inputs and outputs separated by a colon (`:`). Call procedures using the `CALL` statement.
```
PROCEDURE heat_transfer(T1, T2 : Q_dot)
  Q_dot := 0.8 * 12 * (T1 - T2) / 0.25
END

CALL heat_transfer(100, 20 : heat_loss)
```

## Control Flow inside Functions & Procedures
You can use sequential programming structures inside function/procedure bodies:
- **Conditionals:** `IF condition THEN ... ELSE ... END`
- **While Loops:** `WHILE condition DO ... END`
- **Repeat Loops:** `REPEAT ... UNTIL condition`

[Topic: tables-code]
# Custom Tables (TABLE)

You can define lookup tables directly inside your code using a `TABLE` block.

## Table Block Syntax
Specify column names (with optional unit annotations) in the header. Column values are written inline. The table is automatically registered as a callable function.
- If you annotate the table's output unit in the header, frees will automatically propagate the units to any variable computed from the table.

### Table Example
```
{ Table of pressure [Pa] vs flow rate [m^3/s] }
TABLE pump_curve(flow [m^3/s]) [Pa]
  0.0       50000
  0.001     45000
  0.002     32000
  0.003     0
END

{ Call the table like a function: automatically interpolates values }
dP = pump_curve(0.0015)
```

[Topic: lookup-tables]
# Lookup Tables & Interpolation

frees provides functions to query, search, and interpolate data from a named `TABLE` block. In a TABLE, **column 1 is the x axis** and each further column is a y/curve column. The simplest way to interpolate is to call the table like a function — `tname(x)` (1-D) or `tname(x, y)` (bilinear across a curve family, e.g. an engine/efficiency map). The functions below are EES-compatible equivalents.

## Interpolation Functions
- **`Interpolate('tname', x):`** Piecewise-linear interpolation at `x` (same as `tname(x)`).
- **`Interpolate1('tname', x):`** Cubic-spline interpolation at `x` (falls back to linear for fewer than 3 points).
- **`Interpolate2D('tname', x, y):`** Bi-linear (2-D) interpolation over a curve family — `tname(x)` blended across the family parameter `y` (same as `tname(x, y)`).
- **`Differentiate('tname', y_col, x_col, x_val):`** Numerical derivative $dy/dx$ at $x_{val}$ (finite difference).
- **`Differentiate1('tname', y_col, x_col, x_val):`** Cubic-spline numerical derivative.

## Lookup Functions
- **`Lookup('tname', row, col):`** Cell value by 1-based row and column indices.
- **`LookupRow('tname', col, val):`** Fractional 1-based row index where column `col` crosses `val` (linear).
- **`NLookupRows('tname'):`** Number of data rows in the table.

### Interpolation Example
```
{ A 2-D engine map: BSFC as a function of speed, parameterised by load }
TABLE bsfc(rpm : load = 0.25, 0.50, 1.0)
  1000   320   300   290
  3000   280   260   250
  5000   300   270   255
END

g_per_kWh = Interpolate2D('bsfc', 2500, 0.6)   { same as bsfc(2500, 0.6) }
```

[Topic: table-accessors]
# Table Accessors & Aggregates

You can programmatically query columns in the active Parametric Table or retrieve statistical summaries.

## Table Accessor Functions
- **`TableValue(run, col):`** Returns a cell value in the parametric table.
- **`TableRun#():`** Returns the current parametric run index (1-based).
- **`NParametricRuns():`** Returns total parametric runs configured.
- **`TableSum('col') / TableAvg('col'):`** Sum or average of a column.
- **`TableMin('col') / TableMax('col'):`** Minimum or maximum of a column.
- **`TableStdDev('col'):`** Standard deviation of a column.
- **`IntegralValue('y_col', 'x_col'):`** Integrates a column with respect to another column using the trapezoid rule.

### Sweep Accessor Example
```
{ Reference the current sweep run in calculations }
current_index = TableRun#()
total_runs = NParametricRuns()
```

[Topic: modules]
# Modular Submodels (MODULE)

Unlike procedural blocks, a `MODULE` represents a reusable **declarative** sub-system of equations.

## Module Properties
- Equations inside modules are solved **simultaneously** with the rest of the system.
- Modules can be solved in **any direction** (outputs can be passed as inputs, inputs can be solved as outputs).
- Call modules using the `CALL` statement.

### Module Example
```
MODULE pipe_flow(D, Q : dP)
  V = Q / (pi# / 4 * D^2)
  dP = 0.02 * (100 / D) * (1000 * V^2 / 2)
END

{ Solves for dP1 given D1, Q1 }
CALL pipe_flow(D1, Q1 : dP1)

{ OR solve for Q2 given D2 and dP2! frees solves in both directions }
CALL pipe_flow(D2, Q2 : dP2)
```
