package com.frees.backend.parser;

import java.util.List;

public class FunctionRegistry {
    public record FunctionInfo(String name, String signature, String description, String category) {}

    private static final List<FunctionInfo> FUNCTIONS = List.of(
            // Basic Math
            new FunctionInfo("sin", "sin(x)", "Sine of x (in radians if dimensionless)", "Math"),
            new FunctionInfo("cos", "cos(x)", "Cosine of x", "Math"),
            new FunctionInfo("tan", "tan(x)", "Tangent of x", "Math"),
            new FunctionInfo("asin", "asin(x)", "Inverse sine", "Math"),
            new FunctionInfo("acos", "acos(x)", "Inverse cosine", "Math"),
            new FunctionInfo("atan", "atan(x)", "Inverse tangent", "Math"),
            new FunctionInfo("atan2", "atan2(y, x)", "Four-quadrant inverse tangent", "Math"),
            new FunctionInfo("exp", "exp(x)", "Exponential", "Math"),
            new FunctionInfo("ln", "ln(x)", "Natural logarithm", "Math"),
            new FunctionInfo("log10", "log10(x)", "Base-10 logarithm", "Math"),
            new FunctionInfo("sqrt", "sqrt(x)", "Square root", "Math"),
            new FunctionInfo("abs", "abs(x)", "Absolute value", "Math"),
            new FunctionInfo("sign", "sign(x)", "Sign function (-1, 0, or 1)", "Math"),
            new FunctionInfo("floor", "floor(x)", "Floor", "Math"),
            new FunctionInfo("ceil", "ceil(x)", "Ceiling", "Math"),
            new FunctionInfo("round", "round(x)", "Round to nearest integer", "Math"),
            new FunctionInfo("mod", "mod(x, y)", "Modulo operation", "Math"),
            
            // Statistics
            new FunctionInfo("min", "min(x, y, ...)", "Minimum of arguments", "Stats"),
            new FunctionInfo("max", "max(x, y, ...)", "Maximum of arguments", "Stats"),
            new FunctionInfo("mean", "mean(x)", "Mean of vector x", "Stats"),
            new FunctionInfo("median", "median(x)", "Median of vector x", "Stats"),
            new FunctionInfo("std", "std(x)", "Standard deviation of vector x", "Stats"),
            new FunctionInfo("var", "var(x)", "Variance of vector x", "Stats"),
            new FunctionInfo("sum", "sum(x)", "Sum of vector elements", "Stats"),
            
            // Matrices
            new FunctionInfo("inv", "inv(A)", "Matrix inverse", "Matrix"),
            new FunctionInfo("det", "det(A)", "Matrix determinant", "Matrix"),
            new FunctionInfo("trace", "trace(A)", "Matrix trace", "Matrix"),
            new FunctionInfo("transpose", "transpose(A)", "Matrix transpose", "Matrix"),
            new FunctionInfo("eig", "eig(A)", "Eigenvalues of A", "Matrix"),
            new FunctionInfo("eigvec", "eigvec(A)", "Eigenvectors of A", "Matrix"),
            new FunctionInfo("rank", "rank(A)", "Matrix rank", "Matrix"),
            new FunctionInfo("norm", "norm(A)", "Matrix norm", "Matrix"),
            new FunctionInfo("cond", "cond(A)", "Condition number", "Matrix"),
            new FunctionInfo("svd", "svd(A : U, S, V)", "Singular value decomposition", "Matrix"),
            new FunctionInfo("qr", "qr(A : Q, R)", "QR decomposition", "Matrix"),
            new FunctionInfo("cholesky", "cholesky(A : L)", "Cholesky decomposition", "Matrix"),
            new FunctionInfo("matexp", "matexp(A)", "Matrix exponential", "Matrix"),
            
            // Control Systems
            new FunctionInfo("tf", "tf(num, den)", "Create transfer function", "Control"),
            new FunctionInfo("ss", "ss(A, B, C, D)", "Create state-space model", "Control"),
            new FunctionInfo("tf2ss", "tf2ss(num, den : A, B, C, D)", "Transfer function to state-space", "Control"),
            new FunctionInfo("ss2tf", "ss2tf(A, B, C, D : num, den)", "State-space to transfer function", "Control"),
            new FunctionInfo("series", "series(sys1, sys2 : sys)", "Series connection", "Control"),
            new FunctionInfo("parallel", "parallel(sys1, sys2 : sys)", "Parallel connection", "Control"),
            new FunctionInfo("feedback", "feedback(sys1, sys2, [sign] : sys)", "Feedback connection", "Control"),
            new FunctionInfo("step", "step(num, den, t : y, t_out)", "Step response", "Control"),
            new FunctionInfo("impulse", "impulse(num, den, t : y, t_out)", "Impulse response", "Control"),
            new FunctionInfo("lsim", "lsim(num, den, u, t : y, t_out)", "Linear simulation", "Control"),
            new FunctionInfo("bode", "bode(num, den, w : mag, phase)", "Bode frequency response", "Control"),
            new FunctionInfo("nyquist", "nyquist(num, den, w : re, im)", "Nyquist frequency response", "Control"),
            new FunctionInfo("nichols", "nichols(num, den, w : mag, phase)", "Nichols frequency response", "Control"),
            new FunctionInfo("margin", "margin(num, den : gm, pm, wcg, wcp)", "Gain and phase margins", "Control"),
            new FunctionInfo("stepinfo", "stepinfo(num, den : tr, ts, tp, os, peak, final)", "Step response characteristics", "Control"),
            new FunctionInfo("c2d", "c2d(num, den, Ts : num_d, den_d)", "Continuous to discrete conversion", "Control"),
            new FunctionInfo("d2c", "d2c(num, den, Ts : num_c, den_c)", "Discrete to continuous conversion", "Control"),
            new FunctionInfo("rlocus", "rlocus(num, den, K : r, r_img)", "Root locus", "Control"),
            new FunctionInfo("routh", "routh(den : R)", "Routh-Hurwitz array", "Control"),
            new FunctionInfo("pade", "pade(Td, order : num, den)", "Pade approximation of time delay", "Control"),
            new FunctionInfo("lqr", "lqr(A, B, Q, R : K)", "Linear quadratic regulator (continuous)", "Control"),
            new FunctionInfo("dlqr", "dlqr(A, B, Q, R : K)", "Linear quadratic regulator (discrete)", "Control"),
            new FunctionInfo("dare", "dare(A, B, Q, R : X)", "Discrete algebraic Riccati equation", "Control"),
            new FunctionInfo("lyap", "lyap(A, Q : X)", "Continuous Lyapunov equation", "Control"),
            new FunctionInfo("dlyap", "dlyap(A, Q : X)", "Discrete Lyapunov equation", "Control"),
            new FunctionInfo("ctrb", "ctrb(A, B : Co)", "Controllability matrix", "Control"),
            new FunctionInfo("obsv", "obsv(A, C : Ob)", "Observability matrix", "Control"),
            new FunctionInfo("place", "place(A, B, pr, pi : K)", "Pole placement (Ackermann)", "Control"),
            new FunctionInfo("acker", "acker(A, B, pr, pi : K)", "Pole placement via Ackermann's formula", "Control"),
            new FunctionInfo("lqe", "lqe(A, G, C, Q, R : L)", "Kalman estimator (LQE) gain", "Control"),
            new FunctionInfo("gram", "gram(A, M, type$ : W)", "Controllability ('c') / observability ('o') gramian", "Control"),
            new FunctionInfo("balreal", "balreal(A, B, C : Ab, Bb, Cb)", "Internally-balanced realization", "Control"),
            new FunctionInfo("pidtune", "pidtune(num, den, type : Kp, Ki, Kd)", "PID tuning", "Control")
    );

    public static List<FunctionInfo> listFunctions() {
        return FUNCTIONS;
    }
}
