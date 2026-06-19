[Topic: symbolic-cas]
# Control Systems & Symbolic CAS

frees brings MATLAB-Control-Toolbox-style workflows in as native, order-independent equations: LTI modeling and conversions, system interconnection, poles/zeros and stability margins, Bode/Nyquist frequency response, step/impulse/forced time response, and state-feedback/PID controller design. Underneath, two engines meet at the `num`/`den` coefficient arrays — an embedded **Symja** computer-algebra system (CAS) for symbolic work, and Apache Commons Math for numeric analysis (companion-matrix eigenvalues, Riccati via the matrix sign function) that stays robust on high-order, floating-point systems.

This page starts with the symbolic CAS layer (symbolic identities and Laplace partial fractions), then covers the LTI model representations and every control-systems `CALL` function.

## Symbolic identities

frees can solve **symbolic identities** — equations that must hold for *all* values of an independent variable — using the embedded CAS. The classic use is decomposing a Laplace transfer function into partial fractions and reading off the residues, which then appear in the Solution window like any other variable.

## Declaring a symbolic variable

Use `SYMBOLIC` to mark one or more independent variables (for control work this is usually the Laplace variable `s`):

```
SYMBOLIC s
```

A `SYMBOLIC` variable is **not** solved for. Instead, any equation that contains it is treated as an identity: frees brings both sides over a common denominator, requires every power of the variable to match, and solves the resulting system for the remaining unknown coefficients.

## Partial-fraction decomposition

Write the decomposition you want as an ordinary equation, naming the residues yourself:

```
SYMBOLIC s
(s + 3)/(s^2 + 3*s + 2) = A/(s+1) + B/(s+2)
```

frees solves this for **A = 2** and **B = -1**. Because you name the residues against the poles you chose, there is never any ambiguity about which residue is which. `A` and `B` are now ordinary variables — use them in downstream equations (for example, the inverse Laplace transform `y(t) = A*exp(-t) + B*exp(-2*t)`).

## Transfer functions: tf(num, den)

`tf(num, den)` builds a transfer function `num(s)/den(s)` from coefficient arrays in **descending powers** (MATLAB-style): `[1, 3]` is `s + 3` and `[1, 3, 2]` is `s^2 + 3*s + 2`. Use it on the left of an identity instead of writing the fraction out:

```
SYMBOLIC s
tf([1, 3], [1, 3, 2]) = A/(s+1) + B/(s+2)
```

This is equivalent to the explicit form above and also yields `A = 2`, `B = -1`.

## Notes and limits

- An identity may involve **only one** `SYMBOLIC` variable — it is solved with respect to that single independent variable.
- The coefficient arrays passed to `tf(...)` must be **constant** (numeric array literals such as `[1, 3, 2]`).
- An identity that cannot hold for all values of the symbolic variable (an inconsistent or under-determined decomposition) is reported as an error.
- The residues are solved numerically and shown with their units (dimensionless here) in the Solution window.

## LTI Model Representations

frees represents LTI systems using standard array/matrix variables rather than introducing custom data types. This integrates seamlessly with the existing matrix/array algebra and unit checker.

- **Transfer Function (TF)**: Represented as a pair of coefficient arrays in descending powers (MATLAB-style). E.g. `num = [0, 0, 1]` and `den = [1, 3, 2]` represents the system:
  $$G(s) = \frac{1}{s^2 + 3s + 2}$$
- **State Space (SS)**: Represented as matrices `A` ($n \times n$), `B` ($n \times 1$), `C` ($1 \times n$), and scalar `D` ($1 \times 1$):
  $$\dot{x} = A x + B u$$
  $$y = C x + D u$$
- **Zero-Pole-Gain (ZPK)**: Represented as real and imaginary components of zeros (`zr`, `zi`) and poles (`pr`, `pi`), plus a scalar gain `k`:
  $$H(s) = k \frac{\prod (s - z_i)}{\prod (s - p_i)}$$

## Model Conversions

Use `CALL` dispatches to convert between representations. The solver automatically registers output shapes so variables can be used as bare names downstream.

### 1. State Space to Transfer Function: ss2tf
```
CALL ss2tf(A, B, C, D : num[1:3], den[1:3])
```

### 2. Transfer Function to State Space: tf2ss
```
CALL tf2ss(num, den : A[1:2,1:2], B[1:2], C[1:2], D)
```

### 3. Zero-Pole-Gain to Transfer Function: zp2tf
```
CALL zp2tf(zr, zi, pr, pi, k : num[1:3], den[1:3])
```

### 4. Transfer Function to Zero-Pole-Gain: tf2zp
```
CALL tf2zp(num, den : zr[1:1], zi[1:1], pr[1:2], pi[1:2], k)
```

## Model Interconnection

Use `CALL` dispatches to connect multiple systems in series, parallel, or feedback. Systems can be represented either as transfer functions (numerator and denominator arrays) or as state-space systems (matrices A, B, C, D).

For two systems $G_1(s)$ (of order $n_1$) and $G_2(s)$ (of order $n_2$), the connected system has order $n_1 + n_2$.

### 1. Series Connection: series
Connects $G_1(s)$ and $G_2(s)$ in series: $G(s) = G_1(s) \cdot G_2(s)$.
```
# Transfer Function series:
CALL series(num1, den1, num2, den2 : num[1:3], den[1:3])

# State Space series:
CALL series(A1, B1, C1, D1, A2, B2, C2, D2 : A[1:3,1:3], B[1:3], C[1:3], D)
```

### 2. Parallel Connection: parallel
Connects $G_1(s)$ and $G_2(s)$ in parallel: $G(s) = G_1(s) + G_2(s)$.
```
# Transfer Function parallel:
CALL parallel(num1, den1, num2, den2 : num[1:3], den[1:3])

# State Space parallel:
CALL parallel(A1, B1, C1, D1, A2, B2, C2, D2 : A[1:3,1:3], B[1:3], C[1:3], D)
```

### 3. Feedback Connection: feedback
Connects $G_1(s)$ (forward path) and $G_2(s)$ (feedback path) in a closed loop.
```
# Transfer Function feedback:
CALL feedback(num1, den1, num2, den2, sign : num[1:3], den[1:3])

# State Space feedback:
CALL feedback(A1, B1, C1, D1, A2, B2, C2, D2, sign : A[1:3,1:3], B[1:3], C[1:3], D)
```
- `sign` is optional and defaults to `1.0` (negative feedback, i.e., $T(s) = \frac{G_1}{1 + G_1 G_2}$). Use `-1.0` for positive feedback.

## Time Delay Modeling

### 1. Padé Approximation: pade
Generates the numerator and denominator polynomials of a Padé rational approximation of a dead time delay $T_d$ of a given `order`. For a Padé approximation of order $m$, the output polynomials have $m+1$ coefficients (descending powers of $s$).
```
CALL pade(Td, order : num_delay[1:3], den_delay[1:3])
```

## State-Space Analysis & Transformations

Use the following dispatches to compute controllability and observability, verify system rank, and apply similarity transformations.

### 1. Controllability Matrix: ctrb
Computes the controllability matrix $C_{trb} = [B, A B, A^2 B, \ldots, A^{n-1} B]$ for state-space matrices A ($n \times n$) and B ($n \times 1$).
```
CALL ctrb(A, B : Co[1:3,1:3])
```

### 2. Observability Matrix: obsv
Computes the observability matrix $O_{bsv} = [C; C A; C A^2; \ldots; C A^{n-1}]$ for state-space matrices A ($n \times n$) and C ($1 \times n$).
```
CALL obsv(A, C : Ob[1:3,1:3])
```

### 3. Matrix Rank: rank
Computes the numerical rank of a matrix $M$ using Singular Value Decomposition (SVD) tolerance comparisons.
```
CALL rank(M : r)
```

### 4. Similarity Transformation: ss2ss
Applies similarity transformation matrix $P$ to a state-space system (A, B, C, D) such that $x = P z$, yielding transformed matrices $A_n = P^{-1} A P, B_n = P^{-1} B, C_n = C P, D_n = D$.
```
CALL ss2ss(A, B, C, D, P : An[1:3,1:3], Bn[1:3], Cn[1:3], Dn)
```

## Frequency Analysis & Poles/Zeros

Use the following `CALL` dispatches to analyze system poles, zeros, Bode/Nyquist responses, and gain/phase margins.

### 1. Poles: pole
Computes system poles (real part `pr`, imaginary part `pi`) for a transfer function or a state-space matrix `A`.
```
CALL pole(num, den : pr[1:2], pi[1:2])
# OR
CALL pole(A : pr[1:2], pi[1:2])
```

### 2. Zeros: zero
Computes system zeros (real part `zr`, imaginary part `zi`) for a transfer function or a state-space system `(A, B, C, D)`.
```
CALL zero(num, den : zr[1:1], zi[1:1])
# OR
CALL zero(A, B, C, D : zr[1:1], zi[1:1])
```

### 3. Bode Frequency Response: bode
Computes magnitude (in dB) and unwrapped phase (in degrees) at a vector of frequencies `omega`.
```
CALL bode(num, den, omega : mag[1:50], phase[1:50])
# OR
CALL bode(A, B, C, D, omega : mag[1:50], phase[1:50])
```

### 4. Nyquist Frequency Response: nyquist
Computes real and imaginary parts at a vector of frequencies `omega`.
```
CALL nyquist(num, den, omega : real[1:50], imag[1:50])
# OR
CALL nyquist(A, B, C, D, omega : real[1:50], imag[1:50])
```

### 5. Gain and Phase Margins: margin
Computes gain margin `gm` (in dB), phase margin `pm` (in degrees), gain crossover frequency `w_cg`, and phase crossover frequency `w_cp`.
```
CALL margin(num, den : gm, pm, w_cg, w_cp)
# OR
CALL margin(A, B, C, D : gm, pm, w_cg, w_cp)
```

### 6. Root Locus Trajectories: rlocus
Computes closed-loop s-plane poles over a swept range of $M$ gain values `K`. Outputs are the gain values `K` (length `M`), and the closed-loop pole real parts `cpr` and imaginary parts `cpi` (matrices of size `M x N` where `N` is the order of the open-loop denominator).
```
CALL rlocus(num, den : K[1:100], cpr[1:100, 1:4], cpi[1:100, 1:4])
```
To plot the root locus s-plane trajectories along with open-loop poles and zeros, use the `rootlocus` plot kind:
```
PLOT 'Root Locus'
  kind = rootlocus
  pr = cpr
  pi = cpi
  zr = zr  # optional: open-loop zeros real parts
  zi = zi  # optional: open-loop zeros imaginary parts
END
```

## Time-Domain Responses

Time responses are integrated through the same tested ODE solver used by `DYNAMIC` blocks: a transfer function is converted to controllable canonical state space, the state equation `x' = A x + B u(t)` is integrated, and the output `y = C x + D u` is sampled at the supplied time vector `t`. Each output `y` is the same length as `t`, so it plots directly with the **xy** plot kind.

### 1. Step Response: step
Unit step response `y(t)` (input `u(t) = 1`, zero initial state).
```
CALL step(num, den, t : y[1:N])
# OR
CALL step(A, B, C, D, t : y[1:N])
```

### 2. Impulse Response: impulse
Impulse response `y(t) = C e^{At} B` (the direct-feedthrough delta term from a non-zero `D` is omitted, as it cannot be represented on a sampled grid).
```
CALL impulse(num, den, t : y[1:N])
# OR
CALL impulse(A, B, C, D, t : y[1:N])
```

### 3. Forced Response: lsim
Response to an arbitrary input signal `u`, linearly interpolated between samples. The input `u` and time `t` must have the same length `N`.
```
CALL lsim(num, den, u, t : y[1:N])
# OR
CALL lsim(A, B, C, D, u, t : y[1:N])
```

### 4. Transient Response Metrics: stepinfo
Extracts transient response metrics (Rise Time `Tr` from 10% to 90%, Peak Time `Tp`, Settling Time `Ts` using the 2% criterion, and Percent Overshoot `OS`) from numerical step response outputs `y` at time points `t`.
```
CALL stepinfo(t, y : Tr, Tp, Ts, OS)
```

## Controller Design

State-feedback and PID design solvers. Numeric methods (Riccati / eigenvalues) keep these robust on floating-point, high-order systems.

### 1. LQR Optimal Gain: lqr
Continuous-time linear-quadratic regulator. Returns the optimal state-feedback gain `K` that minimizes `∫ (x'Qx + u'Ru) dt`, computed by solving the algebraic Riccati equation via the matrix sign function of the Hamiltonian. Single-input form: `A` and `Q` are `n×n`, `B` is an `n`-vector, `R` is a scalar, and `K` is an `n`-vector. The closed-loop `A - B K` is stable.
```
CALL lqr(A, B, Q, R : K[1:n])
```

### 2. Pole Placement: place
SISO pole placement by Ackermann's formula. Returns the gain `K` that relocates the poles of `A - B K` to the requested locations, supplied as real/imaginary arrays `pr`, `pi` (each length `n`, complex poles in conjugate pairs).
```
CALL place(A, B, pr, pi : K[1:n])
```

### 3. PID Auto-Tuning: pidtune
Loop-shaping tuning of a P/PI/PID controller for a SISO plant `num/den`. The controller is designed so the open loop crosses over (gain = 1) at frequency `wc` with a 60° phase-margin target (the same default MATLAB uses). The type is a quoted `'P'`, `'PI'`, or `'PID'`; unused gains are returned as `0`. A pure `P` controller only sets the crossover — it cannot reshape phase.
```
CALL pidtune(num, den, 'PID', wc : Kp, Ki, Kd)
```
