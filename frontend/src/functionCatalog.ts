// Catalog for the top-bar Functions menu. Selecting an item inserts its
// snippet at the editor caret (see App.insertFunction). "$0" marks where the
// caret should land after insertion; if absent, the caret goes to the end.
// Names mirror the backend's built-ins (Evaluator / parser / property service).
export interface FunctionItem {
  label: string
  snippet: string
}

export interface FunctionCategory {
  category: string
  items: FunctionItem[]
}

export const FUNCTION_CATEGORIES: FunctionCategory[] = [
  {
    category: 'Thermophysical Properties',
    items: [
      { label: 'Enthalpy', snippet: 'Enthalpy(Water, P=$0, T=)' },
      { label: 'Entropy', snippet: 'Entropy(Water, P=$0, T=)' },
      { label: 'IntEnergy', snippet: 'IntEnergy(Water, P=$0, T=)' },
      { label: 'Temperature', snippet: 'Temperature(Water, P=$0, h=)' },
      { label: 'Pressure', snippet: 'Pressure(Water, T=$0, x=)' },
      { label: 'Density', snippet: 'Density(Water, P=$0, T=)' },
      { label: 'Volume', snippet: 'Volume(Water, P=$0, T=)' },
      { label: 'Quality', snippet: 'Quality(Water, P=$0, h=)' },
      { label: 'Cp', snippet: 'Cp(Water, P=$0, T=)' },
      { label: 'Cv', snippet: 'Cv(Water, P=$0, T=)' },
      { label: 'SpecHeat', snippet: 'SpecHeat(Water, P=$0, T=)' },
      { label: 'SoundSpeed', snippet: 'SoundSpeed(Water, P=$0, T=)' },
      { label: 'Viscosity', snippet: 'Viscosity(Water, P=$0, T=)' },
      { label: 'Conductivity', snippet: 'Conductivity(Water, P=$0, T=)' },
    ],
  },
  {
    category: 'Psychrometrics (AirH2O)',
    items: [
      { label: 'HumRat', snippet: 'HumRat(AirH2O, T=$0, P=, R=)' },
      { label: 'RelHum', snippet: 'RelHum(AirH2O, T=$0, P=, w=)' },
      { label: 'WetBulb', snippet: 'WetBulb(AirH2O, T=$0, P=, R=)' },
      { label: 'DewPoint', snippet: 'DewPoint(AirH2O, T=$0, P=, R=)' },
    ],
  },
  {
    category: 'Math',
    items: [
      { label: 'sqrt', snippet: 'sqrt($0)' },
      { label: 'abs', snippet: 'abs($0)' },
      { label: 'exp', snippet: 'exp($0)' },
      { label: 'ln', snippet: 'ln($0)' },
      { label: 'log10', snippet: 'log10($0)' },
      { label: 'min', snippet: 'min($0, )' },
      { label: 'max', snippet: 'max($0, )' },
      { label: 'mod', snippet: 'mod($0, )' },
      { label: 'round', snippet: 'round($0, )' },
      { label: 'floor', snippet: 'floor($0)' },
      { label: 'ceil', snippet: 'ceil($0)' },
      { label: 'trunc', snippet: 'trunc($0)' },
      { label: 'sign', snippet: 'sign($0)' },
      { label: 'step', snippet: 'step($0)' },
      { label: 'factorial', snippet: 'factorial($0)' },
      { label: 'gcd', snippet: 'gcd($0, )' },
      { label: 'lcm', snippet: 'lcm($0, )' },
      { label: 'average', snippet: 'average($0, )' },
      { label: 'Sum', snippet: 'Sum(i, 1, N, $0)' },
      { label: 'Product', snippet: 'Product(i, 1, N, $0)' },
      { label: 'Integral', snippet: 'Integral($0, t, a, b)' },
      { label: 'if (inline)', snippet: 'if($0, , )' },
    ],
  },
  {
    category: 'Trigonometry',
    items: [
      { label: 'sin', snippet: 'sin($0)' },
      { label: 'cos', snippet: 'cos($0)' },
      { label: 'tan', snippet: 'tan($0)' },
      { label: 'arcsin', snippet: 'arcsin($0)' },
      { label: 'arccos', snippet: 'arccos($0)' },
      { label: 'arctan', snippet: 'arctan($0)' },
      { label: 'atan2', snippet: 'atan2($0, )' },
      { label: 'sinh', snippet: 'sinh($0)' },
      { label: 'cosh', snippet: 'cosh($0)' },
      { label: 'tanh', snippet: 'tanh($0)' },
      { label: 'arcsinh', snippet: 'arcsinh($0)' },
      { label: 'arccosh', snippet: 'arccosh($0)' },
      { label: 'arctanh', snippet: 'arctanh($0)' },
    ],
  },
  {
    category: 'Special Functions',
    items: [
      { label: 'Gamma', snippet: 'Gamma($0)' },
      { label: 'LogGamma', snippet: 'LogGamma($0)' },
      { label: 'Digamma', snippet: 'Digamma($0)' },
      { label: 'Beta', snippet: 'Beta($0, )' },
      { label: 'Erf', snippet: 'Erf($0)' },
      { label: 'Erfc', snippet: 'Erfc($0)' },
      { label: 'ErfInv', snippet: 'ErfInv($0)' },
      { label: 'Bessel_J', snippet: 'BesselJ($0, x)' },
      { label: 'Bessel_Y', snippet: 'BesselY($0, x)' },
      { label: 'Bessel_I', snippet: 'BesselI($0, x)' },
      { label: 'Bessel_K', snippet: 'BesselK($0, x)' },
      { label: 'Chi_Square', snippet: 'Chi_Square($0, df)' },
      { label: 'Probability', snippet: 'Probability($0, mu, sigma)' },
    ],
  },
  {
    category: 'Random & Bitwise',
    items: [
      { label: 'Random', snippet: 'Random($0, )' },
      { label: 'RandG', snippet: 'RandG($0, sigma)' },
      { label: 'BaseConvert', snippet: "BaseConvert('$0', 16, 10)" },
      { label: 'BitAnd', snippet: 'BitAnd($0, )' },
      { label: 'BitOr', snippet: 'BitOr($0, )' },
      { label: 'BitXor', snippet: 'BitXor($0, )' },
      { label: 'BitNot', snippet: 'BitNot($0)' },
      { label: 'BitShiftL', snippet: 'BitShiftL($0, )' },
      { label: 'BitShiftR', snippet: 'BitShiftR($0, )' },
    ],
  },
  {
    category: 'Complex Numbers',
    items: [
      { label: 'Real', snippet: 'Real($0)' },
      { label: 'Imag', snippet: 'Imag($0)' },
      { label: 'Conj', snippet: 'Conj($0)' },
      { label: 'Magnitude', snippet: 'Magnitude($0)' },
      { label: 'Angle (rad)', snippet: 'Angle($0)' },
      { label: 'AngleDeg', snippet: 'AngleDeg($0)' },
      { label: 'Cis', snippet: 'Cis($0)' },
    ],
  },
  {
    category: 'Matrix & Vector',
    items: [
      { label: 'SolveLinear', snippet: 'SolveLinear($0, b)' },
      { label: 'Inverse', snippet: 'Inverse($0)' },
      { label: 'Transpose', snippet: 'Transpose($0)' },
      { label: 'Determinant', snippet: 'Determinant($0)' },
      { label: 'Dot', snippet: 'Dot($0, )' },
      { label: 'Cross', snippet: 'Cross($0, )' },
      { label: 'Norm', snippet: 'Norm($0)' },
      { label: 'Eigenvalues', snippet: 'Eigenvalues($0)' },
      { label: 'Eigen', snippet: 'Eigen($0)' },
      { label: 'LUDecompose', snippet: 'LUDecompose($0)' },
    ],
  },
  {
    category: 'Strings',
    items: [
      { label: 'Concat$', snippet: 'Concat$($0, )' },
      { label: 'Copy$', snippet: 'Copy$($0, , )' },
      { label: 'Lowercase$', snippet: 'Lowercase$($0)' },
      { label: 'StringLen', snippet: 'StringLen($0)' },
      { label: 'UnitsOf$', snippet: 'UnitsOf$($0)' },
      { label: 'Date$', snippet: 'Date$()' },
    ],
  },
  {
    category: 'Conversion & Uncertainty',
    items: [
      { label: 'Convert', snippet: "Convert('$0', '')" },
      { label: 'ConvertTemp', snippet: 'ConvertTemp(C, F, $0)' },
      { label: 'UncertaintyOf', snippet: 'UncertaintyOf($0)' },
    ],
  },
  {
    // Multi-line scaffolds for the structural blocks, so users don't have to
    // re-check the Help docs for the exact syntax.
    category: 'Blocks & Control Flow',
    items: [
      { label: 'FUNCTION block', snippet: 'FUNCTION $0fname(x)\n  fname := \nEND\n' },
      { label: 'PROCEDURE block', snippet: 'PROCEDURE $0pname(x : y)\n  y := \nEND\n' },
      { label: 'MODULE block', snippet: 'MODULE $0mname(x : y)\n  y = \nEND\n' },
      { label: 'TABLE (with units)', snippet: 'TABLE $0tname(x [unit]) [unit]\n  0   0\n  1   1\nEND\n' },
      { label: 'PARAMETRIC table', snippet: 'PARAMETRIC $0sweep(x)\n  x = 0:1:10 | Linear\nEND\n' },
      { label: 'PLOT block', snippet: "PLOT '$0'\n  kind = xy\n  x = \n  y = \nEND\n" },
      { label: 'FOR loop', snippet: 'FOR i = 1 TO $0\n  \nEND\n' },
      { label: 'IF / THEN / ELSE (in FUNCTION)', snippet: 'IF $0 THEN\n  \nELSE\n  \nEND\n' },
      { label: 'REPEAT / UNTIL (in FUNCTION)', snippet: 'REPEAT\n  $0\nUNTIL ' },
      { label: 'WHILE / DO (in FUNCTION)', snippet: 'WHILE $0 DO\n  \nEND\n' },
    ],
  },
]
