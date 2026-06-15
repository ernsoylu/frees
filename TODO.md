# TODO

## Element-wise matrix/array operators (MATLAB parity)

Add MATLAB-style element-wise operators so matrix/array math reaches parity with
the rest of the matrix features:

- `.*` — element-wise multiply
- `./` — element-wise (right) divide
- `.\` — element-wise left divide
- `.^` — element-wise power
- (transpose `'` already exists)

### Why it's separate
These need new lexer tokens and grammar rules, carefully ordered so they don't
clash with the `..` range operator (`DOTDOT`) or decimal literals (`1.5`). The
matrix expansion (`compileMatrixExpr` in `EquationParser.java`) then needs to
apply the operator element-by-element with shape checks (and scalar
broadcasting, like the existing `+`/`-`/`*` cases).

### Acceptance
- `C = A .* B`, `C = A ./ B`, `C = A .^ 2` compile to per-element equations.
- Scalar broadcasting works (`A .* 2`, `2 ./ A`).
- Shape-mismatch errors are clear.
- Bare-name matrices and the generators (`zeros`, `ones`, `eye`, `diag`,
  `linspace`) work with the new operators.
- Tests in `EquationSystemSolverTest` + docs in the Help matrix section.

### Out of scope (declarative solver, not imperative MATLAB)
Parenthesis indexing / slicing (`A(:,2)`, `A(2:3,:)`, `A(end)`), `size`/
`length`/`numel`/`ndims`, and in-place array growth — frees uses bracket
indexing with ranges (`A[i,j]`, `A[1..n]`) instead.

## Units on bracket array/matrix literals

Accept a trailing unit on a bracket literal and apply it to every element, so
`c = [2 3 4 5 6] [kg]` and `c[1..5] = [2,3,4,5,6] [kg]` work.

### Current behavior
Units only attach to array *elements*, not to the literal as a whole. A trailing
unit after `]` is a syntax error (`mismatched input '['`). Today the supported
forms are per-element (`c[1] = 2 [kg]; c[2] = 3 [kg]`), range broadcast
(`c[1..5] = 2 [kg]`), or setting units per element in the Variable Information
window.

### Approach
Allow an optional unit annotation after a bracket literal in the grammar (and the
bare-name vector/matrix form), then in the matrix expansion
(`compileMatrixExpr` in `EquationParser.java`) attach that unit to each generated
per-element equation — mirroring how the existing scalar-broadcast assignment
(`c[1..5] = 2 [kg]`) propagates a unit to every element.

### Acceptance
- `c = [2 3 4 5 6] [kg]` and `c[1..5] = [2,3,4,5,6] [kg]` check/solve, with every
  element carrying `kg`.
- Works for 2D literals (`A = [1 2; 3 4] [m]`) and bare-name matrices.
- No regression to the unit-less literal forms.
- Tests in `EquationSystemSolverTest` + a note in the Help matrix/units section.
