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
