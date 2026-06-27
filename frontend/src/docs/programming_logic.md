[Topic: functions]
# Custom Functions & Procedures

Most of your model is declarative — equations in any order, solved simultaneously. `FUNCTION` and `PROCEDURE` are for the parts that need **sequential, imperative** logic (loops, conditionals, step-by-step algorithms). Inside them you use `:=` for assignment, just like Python or other array languages.

## Functions
A `FUNCTION` returns one or more values. Assign the return value(s) with `:=`.
- **Single output** — assign the function's own name:
```
FUNCTION poly_fit(x)
  poly_fit := 0.5 * x^2 + 2 * x + 1
END

y = poly_fit(3)          { y = 9.5 }
```
- **Multiple outputs** — declare them in brackets in the header (array-language-style):
```
FUNCTION [q, r] = DivMod(a, b)
  q := trunc(a / b)
  r := mod(a, b)
END

[quotient, remainder] = DivMod(17, 5)   { 3, 2 }
```
Discard an output you don't need with `~`, or simply leave off trailing outputs:
```
[quotient, ~] = DivMod(17, 5)   { quotient only }
```
The same `[ … ] = name( … )` destructuring works for built-in multi-output `CALL` functions too — e.g. `[A, B, C, D] = tf2ss(num, den)`. See *Control Systems & Symbolic CAS → Multi-Output Functions*.

## Procedures
A `PROCEDURE` is the same idea with inputs and outputs separated by a colon. Call it with `CALL`:
```
PROCEDURE heat_transfer(T1, T2 : Q_dot)
  Q_dot := 0.8 * 12 * (T1 - T2) / 0.25
END

CALL heat_transfer(100, 20 : heat_loss)
```

## Control flow inside functions & procedures
Sequential structures work inside function/procedure bodies (not in the declarative top level):
- **Conditional:** `IF condition THEN ... ELSE ... END`
- **While:** `WHILE condition DO ... END`
- **Repeat:** `REPEAT ... UNTIL condition`

> **Declarative vs. imperative:** the top-level solver reorders your equations freely, so `x = y + 2` and `y = x - 2` are equivalent there. Inside a `FUNCTION`/`PROCEDURE`, order matters and `:=` is a one-way assignment — read it left-to-right like a normal program.

[Topic: tables-code]
# Custom Tables (TABLE)

Define a lookup table inline with a `TABLE` block. Once compiled it is registered as a callable function — call it like `tname(x)` to interpolate.

## Syntax
Column 1 is the independent (x) column. Annotate the input and output units in the header and frees propagates them to anything computed from the table:
```
{ Pressure [Pa] vs flow rate [m^3/s] }
TABLE pump_curve(flow [m^3/s]) [Pa]
  0.0       50000
  0.001     45000
  0.002     32000
  0.003     0
END

{ Linear interpolation, with [Pa] units carried to dP }
dP = pump_curve(0.0015)
```
For a curve family (a table parameterised by a second variable, e.g. an engine map), add `: param = v1, v2, …` after the x column and call it as `tname(x, y)` for bilinear interpolation — see *Lookup Tables & Interpolation*.

[Topic: lookup-tables]
# Lookup Tables & Interpolation

frees provides functions to query, search, and interpolate a named `TABLE` block. In a TABLE, **column 1 is the x axis** and each further column is a y/curve column. The simplest way to interpolate is to call the table like a function — `tname(x)` (1-D) or `tname(x, y)` (bilinear across a curve family). The functions below are the classic-solver-compatible equivalents.

## Interpolation functions
- **`Interpolate('tname', x)`** — piecewise-linear interpolation at `x` (same as `tname(x)`).
- **`Interpolate1('tname', x)`** — cubic-spline interpolation (falls back to linear below 3 points).
- **`Interpolate2D('tname', x, y)`** — bilinear 2-D interpolation across a curve family (same as `tname(x, y)`).
- **`Differentiate('tname', y_col, x_col, x_val)`** — numerical $dy/dx$ at $x_{val}$ (finite difference).
- **`Differentiate1('tname', y_col, x_col, x_val)`** — cubic-spline derivative.

## Lookup functions
- **`Lookup('tname', row, col)`** — cell value by 1-based row/column.
- **`LookupRow('tname', col, val)`** — fractional 1-based row where `col` crosses `val`.
- **`NLookupRows('tname')`** — number of data rows.

## 2-D engine-map example
```
TABLE bsfc(rpm : load = 0.25, 0.50, 1.0)
  1000   320   300   290
  3000   280   260   250
  5000   300   270   255
END

g_per_kWh = Interpolate2D('bsfc', 2500, 0.6)   { same as bsfc(2500, 0.6) }
```

[Topic: table-accessors]
# Table Accessors & Aggregates

Query cells or statistical summaries of the active **Parametric Table**. These are computed once per table solve and are identical in every row — handy for reporting a cycle total or average alongside each run.

## Accessor functions
- **`TableValue(run, col)`** — a cell value in the parametric table.
- **`TableRun#()`** — the current run index (1-based).
- **`NParametricRuns()`** — total configured runs.
- **`TableSum('col')` / `TableAvg('col')`** — sum / average of a column.
- **`TableMin('col')` / `TableMax('col')`** — minimum / maximum.
- **`TableStdDev('col')`** — standard deviation.
- **`IntegralValue('y_col', 'x_col')`** — trapezoid integral of one column vs. another.

## Example
```
{ Whole-cycle energy from a speed-sweep table }
E_total = IntegralValue('P', 't')      { trapezoid integral of power over time }
P_avg   = TableAvg('P')                { mean power, same in every row }
current_index = TableRun#()
```

[Topic: modules]
# Modular Submodels (MODULE)

A `MODULE` is a reusable **declarative** sub-system — a named bag of equations solved simultaneously with the rest of your model. Unlike a `FUNCTION`, a module's equations can be solved in **either direction**: a variable you pass in as an output one call can be passed in as an input the next.

## Why use a module?
- Encapsulate a recurring sub-model (a heat exchanger, a pipe segment, a pump) once and `CALL` it many times.
- Reuse the same equations whether you're sizing (unknown is an output) or rating (unknown is an input).

## Example
```
MODULE pipe_flow(D, Q : dP)
  V  = Q / (pi# / 4 * D^2)
  dP = 0.02 * (100 / D) * (1000 * V^2 / 2)
END

CALL pipe_flow(D1, Q1 : dP1)     { rating:  find dP1 from D1, Q1 }
CALL pipe_flow(D2, Q2 : dP2)     { sizing:  find Q2  from D2, dP2 }
```
Both calls use the *same* module — frees figures out which variable is unknown in each.

> **Module vs. function:** a `MODULE` is essentially a multi-output `FUNCTION` whose body is **equations** (`=`, solved in any direction) instead of sequential assignments (`:=`, one-way). The bracket call form works here too: `[dP1] = pipe_flow(D1, Q1)`.
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

frees provides functions to query, search, and interpolate data from a named `TABLE` block. In a TABLE, **column 1 is the x axis** and each further column is a y/curve column. The simplest way to interpolate is to call the table like a function — `tname(x)` (1-D) or `tname(x, y)` (bilinear across a curve family, e.g. an engine/efficiency map). The functions below are classic-solver-compatible equivalents.

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
