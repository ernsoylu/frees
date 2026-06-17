// Catalog for the top-bar Functions menu and the Ctrl+K command palette.
// Selecting an item inserts its snippet at the editor caret (see
// App.insertFunction). "$0" marks where the caret should land after insertion;
// if absent, the caret goes to the end. `description` and `usage` power the
// command-palette entries (explanation + a concrete sample call).
// Names mirror the backend's built-ins (Evaluator / parser / property service).
export interface FunctionItem {
  label: string
  snippet: string
  /** One-line explanation of what the function does. */
  description?: string
  /** A concrete, valid sample call. */
  usage?: string
}

export interface FunctionCategory {
  category: string
  items: FunctionItem[]
}

export const FUNCTION_CATEGORIES: FunctionCategory[] = [
  {
    category: 'Thermophysical Properties',
    items: [
      { label: 'Enthalpy', snippet: 'Enthalpy(Water, P=$0, T=)', description: 'Specific enthalpy of a fluid from any two independent properties.', usage: 'h = Enthalpy(Water, T=100 [C], P=101.325 [kPa])' },
      { label: 'Entropy', snippet: 'Entropy(Water, P=$0, T=)', description: 'Specific entropy of a fluid from any two independent properties.', usage: 's = Entropy(Water, P=101.325 [kPa], x=1)' },
      { label: 'IntEnergy', snippet: 'IntEnergy(Water, P=$0, T=)', description: 'Specific internal energy from any two independent properties.', usage: 'u = IntEnergy(Water, T=100 [C], x=0)' },
      { label: 'Temperature', snippet: 'Temperature(Water, P=$0, h=)', description: 'Temperature back-solved from any two independent properties.', usage: 'T = Temperature(Water, P=101.325 [kPa], h=2675000 [J/kg])' },
      { label: 'Pressure', snippet: 'Pressure(Water, T=$0, x=)', description: 'Pressure from any two independent properties.', usage: 'P = Pressure(Water, T=100 [C], x=0)' },
      { label: 'Density', snippet: 'Density(Water, P=$0, T=)', description: 'Density from any two independent properties.', usage: 'rho = Density(Air, T=25 [C], P=101.325 [kPa])' },
      { label: 'Volume', snippet: 'Volume(Water, P=$0, T=)', description: 'Specific volume from any two independent properties.', usage: 'v = Volume(Water, T=100 [C], x=1)' },
      { label: 'Quality', snippet: 'Quality(Water, P=$0, h=)', description: 'Vapor quality (0–1) inside the two-phase dome.', usage: 'x = Quality(Water, P=101.325 [kPa], h=2000000 [J/kg])' },
      { label: 'Cp', snippet: 'Cp(Water, P=$0, T=)', description: 'Specific heat at constant pressure.', usage: 'cp = Cp(Water, T=25 [C], P=101.325 [kPa])' },
      { label: 'Cv', snippet: 'Cv(Water, P=$0, T=)', description: 'Specific heat at constant volume.', usage: 'cv = Cv(Air, T=25 [C], P=101.325 [kPa])' },
      { label: 'SpecHeat', snippet: 'SpecHeat(Water, P=$0, T=)', description: 'Specific heat of an incompressible substance or ideal gas.', usage: 'c = SpecHeat(Water, T=25 [C], P=101.325 [kPa])' },
      { label: 'SoundSpeed', snippet: 'SoundSpeed(Water, P=$0, T=)', description: 'Speed of sound in the fluid.', usage: 'a = SoundSpeed(Air, T=25 [C], P=101.325 [kPa])' },
      { label: 'Viscosity', snippet: 'Viscosity(Water, P=$0, T=)', description: 'Dynamic (absolute) viscosity.', usage: 'mu = Viscosity(Water, T=25 [C], P=101.325 [kPa])' },
      { label: 'Conductivity', snippet: 'Conductivity(Water, P=$0, T=)', description: 'Thermal conductivity.', usage: 'k = Conductivity(Water, T=25 [C], P=101.325 [kPa])' },
    ],
  },
  {
    category: 'Chemistry & Combustion',
    items: [
      { label: 'MolarMass', snippet: 'MolarMass($0)', description: 'Molar mass [kg/mol] of a fluid, ideal-gas species, or chemical formula. Formulas are case-sensitive; quote ones with parentheses.', usage: "M = MolarMass(C8H18)   { 0.11423 kg/mol }\nM = MolarMass('Ca(OH)2')" },
      { label: 'HeatingValue', snippet: "HeatingValue($0, 'LHV')", description: "Heating value [J/kg] of a hydrocarbon/alcohol fuel. 'LHV' references water vapour, 'HHV' liquid water.", usage: "LHV = HeatingValue(CH4, 'LHV')   { ~50 MJ/kg }" },
      { label: 'StoichAFR', snippet: 'StoichAFR($0)', description: 'Stoichiometric air-fuel ratio (mass basis) for CxHyOz combustion in air.', usage: 'AFR = StoichAFR(C8H18)   { ~15.0 }' },
    ],
  },
  {
    category: 'Psychrometrics (AirH2O)',
    items: [
      { label: 'HumRat', snippet: 'HumRat(AirH2O, T=$0, P=, R=)', description: 'Humidity ratio of moist air (kg water / kg dry air).', usage: 'w = HumRat(AirH2O, T=25 [C], P=101.325 [kPa], R=0.5)' },
      { label: 'RelHum', snippet: 'RelHum(AirH2O, T=$0, P=, w=)', description: 'Relative humidity (0–1) of moist air.', usage: 'R = RelHum(AirH2O, T=25 [C], P=101.325 [kPa], w=0.01)' },
      { label: 'WetBulb', snippet: 'WetBulb(AirH2O, T=$0, P=, R=)', description: 'Wet-bulb temperature of moist air.', usage: 'Twb = WetBulb(AirH2O, T=25 [C], P=101.325 [kPa], R=0.5)' },
      { label: 'DewPoint', snippet: 'DewPoint(AirH2O, T=$0, P=, R=)', description: 'Dew-point temperature of moist air.', usage: 'Tdp = DewPoint(AirH2O, T=25 [C], P=101.325 [kPa], R=0.5)' },
    ],
  },
  {
    category: 'Math',
    items: [
      { label: 'sqrt', snippet: 'sqrt($0)', description: 'Square root.', usage: 'y = sqrt(2)' },
      { label: 'abs', snippet: 'abs($0)', description: 'Absolute value.', usage: 'y = abs(-3)' },
      { label: 'exp', snippet: 'exp($0)', description: 'Exponential, e raised to x.', usage: 'y = exp(1)   { 2.71828 }' },
      { label: 'ln', snippet: 'ln($0)', description: 'Natural logarithm (base e).', usage: 'y = ln(10)' },
      { label: 'log10', snippet: 'log10($0)', description: 'Base-10 logarithm.', usage: 'y = log10(1000)   { 3 }' },
      { label: 'min', snippet: 'min($0, )', description: 'Smallest of its arguments.', usage: 'y = min(3, 7, 2)   { 2 }' },
      { label: 'max', snippet: 'max($0, )', description: 'Largest of its arguments.', usage: 'y = max(3, 7, 2)   { 7 }' },
      { label: 'mod', snippet: 'mod($0, )', description: 'Remainder of a divided by b.', usage: 'y = mod(10, 3)   { 1 }' },
      { label: 'round', snippet: 'round($0, )', description: 'Round to a number of decimal places.', usage: 'y = round(3.14159, 2)   { 3.14 }' },
      { label: 'floor', snippet: 'floor($0)', description: 'Round down to the nearest integer.', usage: 'y = floor(2.7)   { 2 }' },
      { label: 'ceil', snippet: 'ceil($0)', description: 'Round up to the nearest integer.', usage: 'y = ceil(2.1)   { 3 }' },
      { label: 'trunc', snippet: 'trunc($0)', description: 'Discard the fractional part.', usage: 'y = trunc(2.9)   { 2 }' },
      { label: 'sign', snippet: 'sign($0)', description: 'Sign of x: −1, 0, or 1.', usage: 'y = sign(-15)   { -1 }' },
      { label: 'step', snippet: 'step($0)', description: 'Unit step: 1 if x ≥ 0, else 0.', usage: 'y = step(0.5)   { 1 }' },
      { label: 'factorial', snippet: 'factorial($0)', description: 'Factorial n! of a non-negative integer.', usage: 'y = factorial(5)   { 120 }' },
      { label: 'gcd', snippet: 'gcd($0, )', description: 'Greatest common divisor of two integers.', usage: 'y = gcd(48, 36)   { 12 }' },
      { label: 'lcm', snippet: 'lcm($0, )', description: 'Least common multiple of two integers.', usage: 'y = lcm(4, 6)   { 12 }' },
      { label: 'average', snippet: 'average($0, )', description: 'Arithmetic mean of its arguments.', usage: 'y = average(2, 4, 9)' },
      { label: 'Sum', snippet: 'Sum(i, 1, N, $0)', description: 'Sum of a term over an integer index range.', usage: 'y = Sum(i, 1, 4, i^2)   { 30 }' },
      { label: 'Product', snippet: 'Product(i, 1, N, $0)', description: 'Product of a term over an integer index range.', usage: 'y = Product(i, 1, 4, i)   { 24 }' },
      { label: 'Integral', snippet: 'Integral($0, t, a, b)', description: 'Numerical integral of an expression over a variable from a to b.', usage: 'y = Integral(x^2, x, 0, 1)   { 0.3333 }' },
      { label: 'if (inline)', snippet: 'if($0, , )', description: 'Conditional selector: If(a, b, lt, eq, gt) returns lt/eq/gt by comparing a to b.', usage: 'k = If(T, 300, 1.2, 1.5, 1.8)' },
    ],
  },
  {
    category: 'Trigonometry',
    items: [
      { label: 'sin', snippet: 'sin($0)', description: 'Sine (argument in radians).', usage: 'y = sin(pi#/6)   { 0.5 }' },
      { label: 'cos', snippet: 'cos($0)', description: 'Cosine (argument in radians).', usage: 'y = cos(0)   { 1 }' },
      { label: 'tan', snippet: 'tan($0)', description: 'Tangent (argument in radians).', usage: 'y = tan(pi#/4)   { 1 }' },
      { label: 'arcsin', snippet: 'arcsin($0)', description: 'Inverse sine; returns radians.', usage: 'y = arcsin(0.5)' },
      { label: 'arccos', snippet: 'arccos($0)', description: 'Inverse cosine; returns radians.', usage: 'y = arccos(0.5)' },
      { label: 'arctan', snippet: 'arctan($0)', description: 'Inverse tangent; returns radians.', usage: 'y = arctan(1)' },
      { label: 'atan2', snippet: 'atan2($0, )', description: 'Two-argument arctangent atan2(y, x) — angle of (x, y) in the correct quadrant (radians).', usage: 'theta = atan2(1, -1)   { 2.356 rad }' },
      { label: 'sinh', snippet: 'sinh($0)', description: 'Hyperbolic sine.', usage: 'y = sinh(1.25)' },
      { label: 'cosh', snippet: 'cosh($0)', description: 'Hyperbolic cosine.', usage: 'y = cosh(1.25)' },
      { label: 'tanh', snippet: 'tanh($0)', description: 'Hyperbolic tangent.', usage: 'y = tanh(1.25)' },
      { label: 'arcsinh', snippet: 'arcsinh($0)', description: 'Inverse hyperbolic sine.', usage: 'y = arcsinh(2)' },
      { label: 'arccosh', snippet: 'arccosh($0)', description: 'Inverse hyperbolic cosine (argument ≥ 1).', usage: 'y = arccosh(1.5)' },
      { label: 'arctanh', snippet: 'arctanh($0)', description: 'Inverse hyperbolic tangent (argument in (−1, 1)).', usage: 'y = arctanh(0.5)' },
    ],
  },
  {
    category: 'Special Functions',
    items: [
      { label: 'Gamma', snippet: 'Gamma($0)', description: 'Gamma function Γ(x); Γ(n+1) = n!.', usage: 'y = Gamma(5)   { 24 }' },
      { label: 'LogGamma', snippet: 'LogGamma($0)', description: 'Natural log of the gamma function, ln Γ(x).', usage: 'y = LogGamma(10)' },
      { label: 'Digamma', snippet: 'Digamma($0)', description: 'Digamma ψ(x) = d/dx ln Γ(x).', usage: 'y = Digamma(3)' },
      { label: 'Beta', snippet: 'Beta($0, )', description: 'Beta function B(a, b) = Γ(a)·Γ(b)/Γ(a+b).', usage: 'y = Beta(2, 3)   { 0.0833 }' },
      { label: 'Erf', snippet: 'Erf($0)', description: 'Error function erf(x).', usage: 'y = Erf(1)   { 0.8427 }' },
      { label: 'Erfc', snippet: 'Erfc($0)', description: 'Complementary error function, 1 − erf(x).', usage: 'y = Erfc(1)   { 0.1573 }' },
      { label: 'ErfInv', snippet: 'ErfInv($0)', description: 'Inverse error function (argument in (−1, 1)).', usage: 'y = ErfInv(0.8427)   { ~1 }' },
      { label: 'Bessel_J', snippet: 'BesselJ($0, x)', description: 'Bessel function of the first kind, order n: J_n(x).', usage: 'y = BesselJ(0, 2.5)' },
      { label: 'Bessel_Y', snippet: 'BesselY($0, x)', description: 'Bessel function of the second kind, order n: Y_n(x) (x > 0).', usage: 'y = BesselY(0, 2.5)' },
      { label: 'Bessel_I', snippet: 'BesselI($0, x)', description: 'Modified Bessel function of the first kind, I_n(x).', usage: 'y = BesselI(0, 2.5)' },
      { label: 'Bessel_K', snippet: 'BesselK($0, x)', description: 'Modified Bessel function of the second kind, K_n(x) (x > 0).', usage: 'y = BesselK(1, 2.5)' },
      { label: 'Chi_Square', snippet: 'Chi_Square($0, df)', description: 'Cumulative chi-square distribution at x with df degrees of freedom.', usage: 'p = Chi_Square(5.99, 2)' },
      { label: 'Probability', snippet: 'Probability($0, mu, sigma)', description: 'Normal CDF: cumulative probability at x for mean mu and std dev sigma.', usage: 'p = Probability(85, 80, 5)   { 0.8413 }' },
    ],
  },
  {
    category: 'Random & Bitwise',
    items: [
      { label: 'Random', snippet: 'Random($0, )', description: 'Uniform random number in [a, b]; an optional 3rd argument seeds it.', usage: 'y = Random(0, 1)' },
      { label: 'RandG', snippet: 'RandG($0, sigma)', description: 'Gaussian random number with given mean and std dev; optional seed.', usage: 'y = RandG(0, 0.5)' },
      { label: 'BaseConvert', snippet: "BaseConvert('$0', 16, 10)", description: 'Convert a number written as a string from one base to another (2–36).', usage: "y = BaseConvert('FF', 16, 10)   { 255 }" },
      { label: 'BitAnd', snippet: 'BitAnd($0, )', description: 'Bitwise AND of two integers.', usage: 'y = BitAnd(12, 10)   { 8 }' },
      { label: 'BitOr', snippet: 'BitOr($0, )', description: 'Bitwise OR of two integers.', usage: 'y = BitOr(12, 10)   { 14 }' },
      { label: 'BitXor', snippet: 'BitXor($0, )', description: 'Bitwise XOR of two integers.', usage: 'y = BitXor(12, 10)   { 6 }' },
      { label: 'BitNot', snippet: 'BitNot($0)', description: 'Bitwise NOT of one integer.', usage: 'y = BitNot(0)' },
      { label: 'BitShiftL', snippet: 'BitShiftL($0, )', description: 'Left bit-shift a by n positions.', usage: 'y = BitShiftL(3, 4)   { 48 }' },
      { label: 'BitShiftR', snippet: 'BitShiftR($0, )', description: 'Right bit-shift a by n positions.', usage: 'y = BitShiftR(48, 2)   { 12 }' },
    ],
  },
  {
    category: 'Complex Numbers',
    items: [
      { label: 'Real', snippet: 'Real($0)', description: 'Real part of a complex value.', usage: 'a = Real(z)' },
      { label: 'Imag', snippet: 'Imag($0)', description: 'Imaginary part of a complex value.', usage: 'b = Imag(z)' },
      { label: 'Conj', snippet: 'Conj($0)', description: 'Complex conjugate.', usage: 'w = Conj(z)' },
      { label: 'Magnitude', snippet: 'Magnitude($0)', description: 'Magnitude (modulus) |z|.', usage: 'r = Magnitude(z)' },
      { label: 'Angle (rad)', snippet: 'Angle($0)', description: 'Argument (phase) of z in radians.', usage: 'phi = Angle(z)' },
      { label: 'AngleDeg', snippet: 'AngleDeg($0)', description: 'Argument (phase) of z in degrees.', usage: 'phi = AngleDeg(z)' },
      { label: 'Cis', snippet: 'Cis($0)', description: 'Unit complex number cos θ + i·sin θ.', usage: 'z = Cis(pi#/4)' },
    ],
  },
  {
    category: 'Matrix & Vector',
    items: [
      { label: 'SolveLinear', snippet: 'SolveLinear($0, b)', description: 'Solve the linear system A·x = b for the vector x.', usage: 'x[1..3] = SolveLinear(A[1..3,1..3], b[1..3])' },
      { label: 'Inverse', snippet: 'Inverse($0)', description: 'Inverse of a square matrix.', usage: 'Ai = Inverse(A)' },
      { label: 'Transpose', snippet: 'Transpose($0)', description: 'Transpose of a matrix or vector.', usage: 'At = Transpose(A)' },
      { label: 'Determinant', snippet: 'Determinant($0)', description: 'Determinant of a square matrix.', usage: 'd = Determinant(A)' },
      { label: 'Dot', snippet: 'Dot($0, )', description: 'Dot (inner) product of two vectors.', usage: 'd = Dot(a, b)' },
      { label: 'Cross', snippet: 'Cross($0, )', description: 'Cross product of two 3-vectors.', usage: 'c = Cross(a, b)' },
      { label: 'Norm', snippet: 'Norm($0)', description: 'Euclidean norm (length) of a vector.', usage: 'n = Norm(v)' },
      { label: 'Eigenvalues', snippet: 'Eigenvalues($0)', description: 'Eigenvalues of a square matrix.', usage: 'lambda = Eigenvalues(A)' },
      { label: 'Eigen', snippet: 'Eigen($0)', description: 'Eigenvalues and eigenvectors of a square matrix.', usage: 'Eigen(A)' },
      { label: 'LUDecompose', snippet: 'LUDecompose($0)', description: 'LU decomposition of a square matrix.', usage: 'LUDecompose(A)' },
    ],
  },
  {
    category: 'Strings',
    items: [
      { label: 'Concat$', snippet: 'Concat$($0, )', description: 'Concatenate two strings.', usage: "s$ = Concat$('a', 'b')   { 'ab' }" },
      { label: 'Copy$', snippet: 'Copy$($0, , )', description: 'Substring of a given length starting at a position.', usage: "s$ = Copy$('frees', 1, 3)   { 'fre' }" },
      { label: 'Lowercase$', snippet: 'Lowercase$($0)', description: 'Lowercase a string.', usage: "s$ = Lowercase$('ABC')   { 'abc' }" },
      { label: 'StringLen', snippet: 'StringLen($0)', description: 'Number of characters in a string.', usage: "n = StringLen('frees')   { 5 }" },
      { label: 'UnitsOf$', snippet: 'UnitsOf$($0)', description: "A variable's units, as a string.", usage: 'u$ = UnitsOf$(P)' },
      { label: 'Date$', snippet: 'Date$()', description: 'Current date as a string.', usage: 'd$ = Date$()' },
    ],
  },
  {
    category: 'Conversion & Uncertainty',
    items: [
      { label: 'Convert', snippet: "Convert('$0', '')", description: 'Unit-conversion factor from one unit to another.', usage: "f = Convert('kJ', 'Btu')" },
      { label: 'ConvertTemp', snippet: 'ConvertTemp(C, F, $0)', description: 'Convert a temperature between scales (C, F, K, R).', usage: 'Tf = ConvertTemp(C, F, 100)   { 212 }' },
      { label: 'UncertaintyOf', snippet: 'UncertaintyOf($0)', description: 'Propagated uncertainty of a solved variable.', usage: 'u_T = UncertaintyOf(T)' },
    ],
  },
  {
    // Multi-line scaffolds for the structural blocks, so users don't have to
    // re-check the Help docs for the exact syntax.
    category: 'Blocks & Control Flow',
    items: [
      { label: 'FUNCTION block', snippet: 'FUNCTION $0fname(x)\n  fname := \nEND\n', description: 'Define a reusable function with a body of assignments (:=).', usage: 'FUNCTION f(x) … f := x^2 … END' },
      { label: 'PROCEDURE block', snippet: 'PROCEDURE $0pname(x : y)\n  y := \nEND\n', description: 'Define a procedure with inputs : outputs.', usage: 'PROCEDURE p(x : y) … END' },
      { label: 'MODULE block', snippet: 'MODULE $0mname(x : y)\n  y = \nEND\n', description: 'Define a module (reusable system of equations) with inputs : outputs.', usage: 'MODULE m(x : y) … END' },
      { label: 'TABLE (with units)', snippet: 'TABLE $0tname(x [unit]) [unit]\n  0   0\n  1   1\nEND\n', description: 'Define a lookup / interpolation table callable as a function.', usage: 'TABLE t(x [unit]) [unit] … END' },
      { label: 'PARAMETRIC table', snippet: 'PARAMETRIC $0sweep(x)\n  x = 0:1:10 | Linear\nEND\n', description: 'Declare a parametric sweep table in code.', usage: 'PARAMETRIC sweep(x) … END' },
      { label: 'PLOT block', snippet: "PLOT '$0'\n  kind = xy\n  x = \n  y = \nEND\n", description: 'Define a plot in code.', usage: "PLOT 'name' … END" },
      { label: 'STATE TABLE block', snippet: 'STATE TABLE $0Circuit1(P1, T1, h2)\n  FLUID = Water\nEND\n', description: 'Declare a fluid-aware state table: list the circuit’s state-point variables and the fluid (FLUID = ...) every state uses. Multiple blocks support multi-fluid / multi-circuit plants.', usage: 'STATE TABLE WaterCircuit(Pw_1, Pw_2, Tw1)  FLUID = Water  END' },
      { label: 'FOR loop', snippet: 'FOR i = 1 TO $0\n  \nEND\n', description: 'Generate equations over an integer index range.', usage: 'FOR i = 1 TO N … END' },
      { label: 'IF / THEN / ELSE (in FUNCTION)', snippet: 'IF $0 THEN\n  \nELSE\n  \nEND\n', description: 'Conditional branch inside a FUNCTION / PROCEDURE body.', usage: 'IF cond THEN … ELSE … END' },
      { label: 'REPEAT / UNTIL (in FUNCTION)', snippet: 'REPEAT\n  $0\nUNTIL ', description: 'Loop until a condition holds (inside a FUNCTION / PROCEDURE).', usage: 'REPEAT … UNTIL cond' },
      { label: 'WHILE / DO (in FUNCTION)', snippet: 'WHILE $0 DO\n  \nEND\n', description: 'While-loop (inside a FUNCTION / PROCEDURE).', usage: 'WHILE cond DO … END' },
    ],
  },
]
