# TODO

No open items.

## Recently completed

- **Element-wise matrix/array operators** (`.*`, `./`, `.\`, `.^`) with scalar
  broadcasting and clear shape-mismatch errors. Added to the grammar
  (`Frees.g4`), `AstBuilder`, and `compileMatrixExpr` in `EquationParser.java`;
  covered by `EquationSystemSolverTest` and the Help matrix-operators section.
- **Units on bracket array/matrix literals** (`c = [2 3 4 5 6] [kg]`,
  `A = [1 2; 3 4] [m]`): a trailing unit applies to every element. Grammar +
  `AstBuilder`; covered by tests and the Help matrix-declaration section.

### Out of scope (declarative solver, not imperative MATLAB)

Parenthesis indexing / slicing (`A(:,2)`, `A(2:3,:)`, `A(end)`), `size`/
`length`/`numel`/`ndims`, and in-place array growth — frees uses bracket
indexing with ranges (`A[i,j]`, `A[1..n]`) instead.
