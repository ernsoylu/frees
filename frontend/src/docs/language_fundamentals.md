[Topic: syntax]
# Equation Syntax & Rules

The frees compiler parses your code using standard mathematical syntax with a few specific rules.

## Syntax Rules
- **Equality (`=`):** A single equal sign `=` represents mathematical equality, not assignment. For example, `P * V = m * R * T` is a valid equation. The solver will automatically rearrange it to find any of the variables.
- **Case Insensitivity:** Variable names are case-insensitive. `Temp`, `TEMP`, and `temp` represent the exact same variable.
- **Comments:** Comments can be written inside curly braces `{ comment }` or double quotes `"comment"`. Double slashes `//` at the start of a line treat the entire line as markdown text.
- **Multiplication:** Implicit multiplication is not allowed. You must write `2 * x` instead of `2x`.
- **Operators:** Standard arithmetic operators `+`, `-`, `*`, `/`, and `^` (exponentiation) are fully supported.

[Topic: math-funcs]
# Mathematical Functions

frees supports a comprehensive set of scalar mathematical functions. Standard functions are fully differentiable.

## Hyperbolic Functions
| Function | Description | Syntax |
| --- | --- | --- |
| `sinh(x)` | Hyperbolic sine | `y = sinh(x)` |
| `cosh(x)` | Hyperbolic cosine | `y = cosh(x)` |
| `tanh(x)` | Hyperbolic tangent | `y = tanh(x)` |
| `arcsinh(x)` | Inverse hyperbolic sine | `y = arcsinh(x)` |
| `arccosh(x)` | Inverse hyperbolic cosine (x >= 1) | `y = arccosh(x)` |
| `arctanh(x)` | Inverse hyperbolic tangent (-1 < x < 1) | `y = arctanh(x)` |

### Hyperbolic Example
```
x = 1.25
y = sinh(x) + cosh(x)   { Equals exp(1.25) }
```

## Rounding & Integer Functions
| Function | Description | Syntax |
| --- | --- | --- |
| `round(x, decimals)` | Rounds to decimal places | `y = round(x, 2)` |
| `floor(x)` | Rounds down to nearest integer | `y = floor(x)` |
| `ceil(x)` | Rounds up to nearest integer | `y = ceil(x)` |
| `trunc(x)` | Discards fractional part | `y = trunc(x)` |
| `sign(x)` | Returns sign (-1, 0, or 1) | `y = sign(x)` |
| `step(x)` | Unit step (1 if x >= 0, else 0) | `y = step(x)` |

### Rounding Example
```
val1 = round(3.14159, 3)   { 3.142 }
val2 = floor(2.7)          { 2 }
val3 = step(0.5)           { 1 }
```

## Conditional Selection & Series
| Function | Description | Syntax |
| --- | --- | --- |
| `If(a, b, lt, eq, gt)` | Inline conditional choice | `y = If(a, b, lt, eq, gt)` |
| `Sum(i, start, end, term)`| Summation series | `y = Sum(i, 1, 4, i^2)` |
| `Product(i, start, end, term)`| Product series | `y = Product(i, 1, 4, i)` |
| `average(a, b, ...)` | Arithmetic mean | `y = average(a, b, c)` |

### Conditional & Series Example
```
{ If temperature > 300 K, select 1.8, else 1.2 }
temp = 350 [K]
k = If(temp, 300, 1.2, 1.5, 1.8)  { k = 1.8 }

{ Sum of squares: 1^2 + 2^2 + 3^2 + 4^2 = 30 }
s = Sum(i, 1, 4, i^2)
```

## Trigonometric Functions
Trigonometric functions `sin(x)`, `cos(x)`, `tan(x)` and their inverses `arcsin(x)`, `arccos(x)`, `arctan(x)` accept and return angles in **radians**. Use `Convert('deg', 'rad')` or unit annotations like `[deg]` to work in degrees.

### Two-Argument Arctangent
`atan2(y, x)` returns the quadrant-correct angle of the coordinate `(x, y)` in radians.
```
theta = atan2(1, -1)   { theta = 3/4 * pi = 2.356 rad (135 deg) }
```

[Topic: special-funcs]
# Special & Statistical Functions

frees provides special transcendental functions and statistical distribution functions.

## Statistical Distributions
- **`Probability(x, mean, stddev):`** Evaluates the cumulative normal distribution (CDF) at `x`.
- **`Chi_Square(x, df):`** Evaluates the cumulative chi-square distribution at `x` with `df` degrees of freedom.
- **`Random(a, b[, seed]):`** Uniform random number in `[a, b]`.
- **`RandG(mean, stddev[, seed]):`** Gaussian random number.

## Special Mathematical Functions
- **`Gamma(x):`** Gamma function $\Gamma(x)$ where $\Gamma(n+1) = n!$.
- **`LogGamma(x):`** Natural log of the gamma function, $\ln \Gamma(x)$.
- **`Digamma(x):`** Digamma function $\psi(x) = \frac{d}{dx} \ln \Gamma(x)$.
- **`Beta(a, b):`** Beta function $B(a, b) = \frac{\Gamma(a)\Gamma(b)}{\Gamma(a+b)}$.
- **`Erf(x) / Erfc(x) / ErfInv(x):`** Error function, complementary error function, and inverse error function.
- **`BesselJ(n, x) / BesselY(n, x):`** Bessel functions of the first and second kinds of order $n$.
- **`BesselI(n, x) / BesselK(n, x):`** Modified Bessel functions of the first and second kinds.

### Statistical Example
```
{ Normal CDF probability }
prob = Probability(85, 80, 5)   { prob = 0.8413 }
```

[Topic: variables]
# Variables, Guesses & Bounds

When compiling and solving equations, managing variables and degrees of freedom is essential.

## Degrees of Freedom (DoF)
A system of equations is solvable only when the number of equations equals the number of variables ($DoF = 0$).

[Diagram: DoF]

## Variable Information Panel
Press `Ctrl + I` to open the **Variable Information** panel. Here, you can configure:
- **Guess Value:** The starting point for the Newton-Raphson solver. Good guesses are critical for nonlinear equations.
- **Lower/Upper Bounds:** Physical limits for the variable (e.g., set Lower Bound for absolute temperature $T \ge 0$). This prevents the solver from evaluating mathematically invalid domains (e.g., negative square roots or logs).
- **Fixed:** Lock a variable to its guess value, turning it into a constant parameter for that run. This reduces the number of unknowns by 1.

[Topic: uncertainty]
# Uncertainty Propagation

frees includes automatic first-order uncertainty propagation. This allows you to evaluate how experimental tolerances or measurement errors propagate through your mathematical models.

## How it Works
1. **Declare Input Uncertainties:** Define the absolute uncertainty of your independent parameters using `UncertaintyOf(varName)`.
2. **Propagate:** The solver automatically evaluates the sensitivity coefficients using numerical Jacobians and propagates the errors using Root-Sum-Square (RSS) combination:
   $$u_y = \sqrt{\sum \left(\frac{\partial y}{\partial x_i} u_{x_i}\right)^2}$$

### Uncertainty Example
```
{ Define the nominal values }
P = 100000 [Pa]
T = 300 [K]
R = 287 [J/kg-K]
P = rho * R * T

{ Declare the input uncertainties }
UncertaintyOf(P) = 500 [Pa]
UncertaintyOf(T) = 2.0 [K]

{ Query the propagated uncertainty of density }
unc_rho = UncertaintyOf(rho)
```

[Topic: units]
# Units & Dimensional Consistency

frees automatically checks your equations for dimensional consistency. All calculations run strictly in SI base units under the hood.

## Unit Annotations
Annotate numerical values in brackets. The compiler converts them to SI equivalents at compile time:
```
P = 140 [kPa]    { Converted to 140000 Pa }
m = 120 [lb]     { Converted to 54.43 kg }
```

## The Convert() Function
Use `Convert(From, To)` to apply multiplication scaling factors:
```
area_in2 = area_ft2 * Convert(ft^2, in^2)
```

## Temperature Conversions
Since temperature scales use offsets as well as scaling, use `ConvertTemp(From, To, value)` instead of `Convert`:
```
T_f = ConvertTemp(C, F, 100)   { 212 F }
T_k = ConvertTemp(F, K, 32)    { 273.15 K }
```

[Component: UnitsReference]

[Topic: arrays]
# Arrays & For Loops

Arrays are represented using indices inside square brackets: `T[1]`, `P[5]`.

## Generating Repetitive Equations
Use a `FOR` loop block to generate equations over index ranges:
```
FOR i = 1 TO 3
  h[i] = Enthalpy(Water, T=T[i], P=P[i])
END
```

## Array Helper Functions
- **`ArrayElmt(array[1:N], index):`** Retrieves the value of an array element at a dynamically computed index:
```
idx = 3
val = ArrayElmt(T[1:10], idx)   { Returns the value of T[3] }
```

[Topic: complex]
# Complex Numbers

frees natively supports complex numbers.

## Naming Conventions
A complex variable is represented by suffixing `_r` (real) and `_i` (imaginary) to the variable name components (e.g. `Z_r = 10`, `Z_i = 5` represent $Z = 10 + 5j$).

## Helper Functions
- **`Real(z):`** Extracts the real part.
- **`Imag(z):`** Extracts the imaginary part.
- **`Conj(z):`** Computes the complex conjugate.
- **`Magnitude(z):`** Computes the modulus $|z|$.
- **`Angle(z):`** Returns argument in radians.
- **`AngleDeg(z):`** Returns argument in degrees.
- **`Cis(theta):`** Computes $e^{j\theta} = \cos \theta + j\sin \theta$.

[Topic: strings]
# String Variables & Functions

String variables are identified by a trailing `$` symbol, and string literals use single quotes (e.g. `'R134a'`). They are resolved at compile time — for example as a fluid name in a property call.

## String Functions
These functions take string-literal arguments and return a number:
- **`StringLen(s):`** Number of characters in a string.
- **`StringPos(s, sub):`** 1-based index of the first occurrence of `sub` in `s` (0 if not found).
- **`StringVal(s):`** Converts a numeric string to a scalar (e.g. `StringVal('3.14')` → `3.14`).
