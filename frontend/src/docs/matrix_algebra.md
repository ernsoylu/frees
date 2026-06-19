[Topic: matrices-decl]
# Declaring Matrices & Vectors

frees supports MATLAB-like syntax for declaring matrices and vectors in your equations.

## Matrix Notation
- **Vectors:** Enclose elements in square brackets separated by commas: `v[1:3] = [1, 2, 3]`.
- **Matrices:** Separate columns by commas, and rows by semicolons:
```
A[1:2, 1:2] = [1, 2; 3, 4]
```
- **Range Slice Suffixes:** Slices are explicitly declared using `[start:end]` (e.g. `A[1:3, 1:3]`). Slices allow the compiler to size vectors and matrices.

## Generation Helpers
- **`zeros(m, n):`** Create an $m \times n$ matrix of zeros.
- **`ones(m, n):`** Create an $m \times n$ matrix of ones.
- **`eye(n)` or `identity(n):`** Create an $n \times n$ identity matrix.
- **`diag(v):`** Create a diagonal matrix from a vector, or extract the diagonal of a matrix.
- **`linspace(a, b, n):`** Generates a vector of $n$ linearly spaced values from $a$ to $b$.

### Example Declarations
```
{ 3x3 Identity matrix }
I[1:3, 1:3] = eye(3)

{ Vector of 11 values from 0 to 1 }
grid[1:11] = linspace(0, 1, 11)
```

[Topic: matrices-ops]
# Matrix Operators

You can perform standard algebraic operations directly on vectors and matrices.

## Supported Operators
- **Addition (`+`) and Subtraction (`-`):** Add or subtract matrices of identical dimensions.
- **Multiplication (`*`):** Standard matrix multiplication. Sized automatically.
- **Transpose (`'`):** Postfix apostrophe transposes a matrix or vector: `At = A'`.
- **Left Division (`\`):** Solves the linear system $A x = b$ using backslash division: `x = A \ b`.

### Algebraic Operators Example
```
A[1:2, 1:2] = [1, 2; 3, 4]
b[1:2] = [5, 6]
x[1:2] = A \ b    { Solves the system: A * x = b }
```

[Topic: matrices-blas]
# OpenBLAS Algebra Functions

For high-performance vector-matrix operations, frees includes direct bindings to BLAS (Basic Linear Algebra Subprograms) routines.

## BLAS Routines
- **`axpy(alpha, x, y):`** Compute $\alpha x + y$ (BLAS Level 1).
- **`scal(alpha, x):`** Scale a vector by scalar $\alpha$: $\alpha x$.
- **`asum(x):`** Compute $L_1$ norm (sum of absolute values).
- **`nrm2(x):`** Compute Euclidean $L_2$ norm.
- **`copy(x):`** Create a symbolic copy of a vector.
- **`gemv(alpha, A, x, beta, y):`** Matrix-vector multiplication: $\alpha A x + \beta y$ (BLAS Level 2).
- **`ger(alpha, x, y, A):`** Outer product rank-1 update: $\alpha x y^T + A$.
- **`gemm(alpha, A, B, beta, C):`** Matrix-matrix multiplication: $\alpha A B + \beta C$ (BLAS Level 3).

### BLAS Example
```
v1[1:3] = [1, 2, 3]
v2[1:3] = [4, 5, 6]
{ Compute 2.5 * v1 + v2 }
result[1:3] = axpy(2.5, v1[1:3], v2[1:3])
```

[Topic: matrices-sys]
# Linear Systems & Decomposition

frees provides dedicated routines for solving linear equations and performing matrix decompositions.

## Linear Solver & System Functions
- **`SolveLinear(A, b):`** Solves the system $A x = b$ for vector $x$. Identical to backslash `A \ b`.
- **`Inverse(A):`** Computes the inverse matrix $A^{-1}$.
- **`Determinant(A):`** Computes the determinant of a square matrix.
- **`Dot(a, b):`** Computes the dot product of two vectors.
- **`Cross(a, b):`** Computes the cross product of two 3-element vectors.
- **`Norm(v):`** Computes the Euclidean norm (length) of a vector.
- **`Eigenvalues(A):`** Computes the eigenvalues of a square matrix.
- **`Eigen(A):`** Computes eigenvalues and eigenvectors.
- **`LUDecompose(A):`** Computes LU decomposition.
- **`EulerRotate(phi, theta, psi : R):`** Generates a $3 \times 3$ 3D rotation matrix `R` from Euler angles (radians, ZYX convention) inside a `CALL` statement.

> **Control systems:** state-space models build directly on these matrix variables. LTI conversions (`tf2ss`, `ss2tf`), interconnection (`series`, `parallel`, `feedback`), analysis (`pole`, `zero`, `bode`, `nyquist`, `margin`, `step`, `impulse`, `lsim`), and controller design (`lqr`, `place`, `pidtune`) are documented under *Control Systems & Symbolic CAS*.

### Linear Algebra Example
```
A[1:3, 1:3] = [2, 1, -1; -3, -1, 2; -2, 1, 2]
b[1:3] = [8, -11, -3]
x[1:3] = SolveLinear(A[1:3,1:3], b[1:3])
```
