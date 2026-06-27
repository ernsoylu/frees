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
            new FunctionInfo("pidtune", "pidtune(num, den, type : Kp, Ki, Kd)", "PID tuning", "Control"),

            // Compressible Flow (ideal-gas relations; ratios dimensionless, angles in radians)
            new FunctionInfo("t0_t", "T0_T(M, k)", "Isentropic stagnation/static temperature ratio", "Compressible Flow"),
            new FunctionInfo("p0_p", "P0_P(M, k)", "Isentropic stagnation/static pressure ratio", "Compressible Flow"),
            new FunctionInfo("rho0_rho", "rho0_rho(M, k)", "Isentropic stagnation/static density ratio", "Compressible Flow"),
            new FunctionInfo("a_astar", "A_Astar(M, k)", "Isentropic area ratio A/A*", "Compressible Flow"),
            new FunctionInfo("mach_a_astar", "mach_A_Astar(A_Astar, k, regime$)", "Mach from A/A* ('subsonic'|'supersonic')", "Compressible Flow"),
            new FunctionInfo("m2_shock", "M2_shock(M1, k)", "Downstream Mach across a normal shock", "Compressible Flow"),
            new FunctionInfo("p2_p1_shock", "P2_P1_shock(M1, k)", "Normal-shock static pressure ratio", "Compressible Flow"),
            new FunctionInfo("t2_t1_shock", "T2_T1_shock(M1, k)", "Normal-shock static temperature ratio", "Compressible Flow"),
            new FunctionInfo("rho2_rho1_shock", "rho2_rho1_shock(M1, k)", "Normal-shock density ratio", "Compressible Flow"),
            new FunctionInfo("p02_p01_shock", "P02_P01_shock(M1, k)", "Normal-shock stagnation pressure ratio", "Compressible Flow"),
            new FunctionInfo("rayleigh_t0_t0star", "rayleigh_T0_T0star(M, k)", "Rayleigh stagnation-temperature ratio", "Compressible Flow"),
            new FunctionInfo("rayleigh_t_tstar", "rayleigh_T_Tstar(M, k)", "Rayleigh static-temperature ratio", "Compressible Flow"),
            new FunctionInfo("rayleigh_p_pstar", "rayleigh_P_Pstar(M, k)", "Rayleigh static-pressure ratio", "Compressible Flow"),
            new FunctionInfo("rayleigh_p0_p0star", "rayleigh_P0_P0star(M, k)", "Rayleigh stagnation-pressure ratio", "Compressible Flow"),
            new FunctionInfo("fanno_t_tstar", "fanno_T_Tstar(M, k)", "Fanno static-temperature ratio", "Compressible Flow"),
            new FunctionInfo("fanno_p_pstar", "fanno_P_Pstar(M, k)", "Fanno static-pressure ratio", "Compressible Flow"),
            new FunctionInfo("fanno_p0_p0star", "fanno_P0_P0star(M, k)", "Fanno stagnation-pressure ratio", "Compressible Flow"),
            new FunctionInfo("fanno_fld", "fanno_fLD(M, k)", "Fanno friction parameter 4*f*Lmax/D", "Compressible Flow"),
            new FunctionInfo("prandtlmeyer", "PrandtlMeyer(M, k)", "Prandtl-Meyer angle nu(M) [rad]", "Compressible Flow"),
            new FunctionInfo("mach_prandtlmeyer", "mach_PrandtlMeyer(nu, k)", "Mach from Prandtl-Meyer angle [rad]", "Compressible Flow"),
            new FunctionInfo("machangle", "MachAngle(M)", "Mach angle mu = asin(1/M) [rad]", "Compressible Flow"),
            new FunctionInfo("theta_oblique", "theta_oblique(M1, beta, k)", "Oblique-shock deflection from wave angle [rad]", "Compressible Flow"),
            new FunctionInfo("beta_oblique", "beta_oblique(M1, theta, k, branch$)", "Oblique-shock wave angle ('weak'|'strong') [rad]", "Compressible Flow"),

            // Heat Transfer (heat-exchanger effectiveness-NTU, LMTD, fin efficiency)
            new FunctionInfo("hx_effectiveness", "hx_effectiveness(type$, NTU, Cr)", "HX effectiveness eps(NTU, Cr=Cmin/Cmax)", "Heat Transfer"),
            new FunctionInfo("hx_ntu", "hx_NTU(type$, eps, Cr)", "HX number of transfer units NTU(eps, Cr)", "Heat Transfer"),
            new FunctionInfo("lmtd", "LMTD(dT1, dT2)", "Log-mean temperature difference", "Heat Transfer"),
            new FunctionInfo("fin_efficiency", "fin_efficiency(mL)", "Straight-fin efficiency tanh(mL)/mL", "Heat Transfer"),

            // Flow Networks (hydraulic / duct resistance — Phase 0)
            new FunctionInfo("friction_factor", "friction_factor(Re, rel_rough)", "Darcy friction factor (Colebrook-Moody, laminar+turbulent)", "Flow Networks"),
            new FunctionInfo("reynolds", "reynolds(rho, V, D, mu)", "Reynolds number rho*V*D/mu", "Flow Networks"),
            new FunctionInfo("minor_loss", "minor_loss(K, rho, V)", "Minor (fitting) pressure loss K*0.5*rho*V^2 [Pa]", "Flow Networks"),

            // Pneumatics (compressible-gas power — Phase A)
            new FunctionInfo("iso6358", "iso6358(C, b, Pup, Tup, Pdown)", "ISO 6358 pneumatic mass flow [kg/s] (sonic conductance C, critical ratio b)", "Pneumatics"),

            // Two-phase flow (Lockhart-Martinelli / Chisholm — Phase C)
            new FunctionInfo("lm_phi2", "lm_phi2(X, C)", "Chisholm two-phase multiplier 1+C/X+1/X^2 on the liquid-alone drop", "Two-Phase Flow"),
            new FunctionInfo("lm_martinelli_tt", "lm_martinelli_tt(x, rho_l, rho_g, mu_l, mu_g)", "Turbulent-turbulent Martinelli parameter X_tt", "Two-Phase Flow"),
            new FunctionInfo("void_homogeneous", "void_homogeneous(x, rho_l, rho_g)", "Homogeneous (no-slip) void fraction", "Two-Phase Flow"),
            new FunctionInfo("void_zivi", "void_zivi(x, rho_l, rho_g)", "Zivi void fraction (slip S=(rho_l/rho_g)^(1/3))", "Two-Phase Flow"),
            new FunctionInfo("void_rouhani", "void_rouhani(x, rho_l, rho_g, G, sigma)", "Rouhani-Axelsson drift-flux void fraction (default)", "Two-Phase Flow"),
            new FunctionInfo("friedel_phi2", "friedel_phi2(x, rho_l, rho_g, mu_l, mu_g, G, D, sigma)", "Friedel two-phase frictional multiplier on the liquid-only drop", "Two-Phase Flow"),
            new FunctionInfo("momentum_flux", "momentum_flux(x, rho_l, rho_g, alpha, G)", "Separated-flow momentum flux [Pa] (accel. dP = out-in)", "Two-Phase Flow"),
            new FunctionInfo("nu_dittus_boelter", "nu_dittus_boelter(Re, Pr, n)", "Dittus-Boelter single-phase Nusselt 0.023 Re^0.8 Pr^n", "Two-Phase Flow"),
            new FunctionInfo("nu_gnielinski", "nu_gnielinski(Re, Pr)", "Gnielinski single-phase Nusselt number", "Two-Phase Flow"),
            new FunctionInfo("chen_f", "chen_f(X_tt)", "Chen flow-boiling convective enhancement factor F", "Two-Phase Flow"),
            new FunctionInfo("chen_s", "chen_s(Re_l, F)", "Chen flow-boiling nucleate-suppression factor S", "Two-Phase Flow"),
            new FunctionInfo("nu_shah", "nu_shah(Re_l, Pr_l, x, p_red)", "Shah condensation Nusselt number", "Two-Phase Flow"),
            new FunctionInfo("nu_cavallini_zecchin", "nu_cavallini_zecchin(Re_l, Pr_l, x, rho_l, rho_g)", "Cavallini-Zecchin condensation Nusselt number", "Two-Phase Flow"),
            new FunctionInfo("zone_ramp", "zone_ramp(L, eps)", "Smooth zone-collapse ramp tanh(L/eps) (moving-boundary §4.8)", "Two-Phase Flow"),

            // Standard atmosphere (ISA 1976 — Phase G)
            new FunctionInfo("isa_t", "isa_T(alt)", "ISA 1976 temperature [K] at geopotential altitude [m]", "Atmosphere"),
            new FunctionInfo("isa_p", "isa_P(alt)", "ISA 1976 pressure [Pa] at geopotential altitude [m]", "Atmosphere"),
            new FunctionInfo("isa_rho", "isa_rho(alt)", "ISA 1976 density [kg/m^3] at geopotential altitude [m]", "Atmosphere"),

            // Cubic-EOS property backend (SRK/PR; CoolProp-independent)
            new FunctionInfo("eos_z", "eos_z(fluid$, model$, T, P, phase$)", "Compressibility factor Z (SRK/PR)", "Properties (EOS)"),
            new FunctionInfo("eos_volume", "eos_volume(fluid$, model$, T, P, phase$)", "Specific volume [m^3/kg] (SRK/PR)", "Properties (EOS)"),
            new FunctionInfo("eos_density", "eos_density(fluid$, model$, T, P, phase$)", "Density [kg/m^3] (SRK/PR)", "Properties (EOS)"),
            new FunctionInfo("eos_pressure", "eos_pressure(fluid$, model$, T, v)", "Pressure [Pa] from (T, specific volume)", "Properties (EOS)"),
            new FunctionInfo("eos_enthalpy", "eos_enthalpy(fluid$, model$, T, P, phase$)", "Specific enthalpy [J/kg] (SRK/PR)", "Properties (EOS)"),
            new FunctionInfo("eos_entropy", "eos_entropy(fluid$, model$, T, P, phase$)", "Specific entropy [J/kg-K] (SRK/PR)", "Properties (EOS)"),
            new FunctionInfo("eos_psat", "eos_psat(fluid$, model$, T)", "Saturation pressure [Pa] (SRK/PR)", "Properties (EOS)"),

            // Combustion thermochemistry (NASA-7 / JANAF ideal-gas thermo)
            new FunctionInfo("adiabaticflametemp", "AdiabaticFlameTemp(fuel$, phi, T_react)", "Constant-P adiabatic flame temperature [K]", "Combustion"),
            new FunctionInfo("mix_mw", "mix_mw(comp$)", "Ideal-gas mixture molar mass [kg/mol], comp 'N2:0.79,O2:0.21'", "Combustion"),
            new FunctionInfo("mix_cp", "mix_cp(comp$, T)", "Ideal-gas mixture cp [J/kg-K]", "Combustion"),
            new FunctionInfo("mix_enthalpy", "mix_enthalpy(comp$, T)", "Ideal-gas mixture enthalpy [J/kg]", "Combustion"),
            new FunctionInfo("mix_entropy", "mix_entropy(comp$, T, P)", "Ideal-gas mixture entropy [J/kg-K]", "Combustion"),
            new FunctionInfo("wiebe", "wiebe(theta, theta0, dtheta, a, m)", "Wiebe burned mass fraction", "Combustion"),
            new FunctionInfo("wiebe_rate", "wiebe_rate(theta, theta0, dtheta, a, m)", "Wiebe burn rate dxb/dtheta", "Combustion"),
            new FunctionInfo("mix_viscosity", "mix_viscosity(comp$, T)", "Ideal-gas mixture viscosity [Pa-s] (Chapman-Enskog/Wilke)", "Combustion"),
            new FunctionInfo("mix_conductivity", "mix_conductivity(comp$, T)", "Ideal-gas mixture conductivity [W/m-K]", "Combustion"),
            new FunctionInfo("eq_molefraction", "eq_molefraction(fuel$, phi, T, P, species$)", "Equilibrium product mole fraction (dissociation)", "Combustion"),
            new FunctionInfo("adiabaticflametempeq", "AdiabaticFlameTempEq(fuel$, phi, T_react, P)", "Adiabatic flame temperature with dissociation [K]", "Combustion")
    );

    public static List<FunctionInfo> listFunctions() {
        return FUNCTIONS;
    }
}
