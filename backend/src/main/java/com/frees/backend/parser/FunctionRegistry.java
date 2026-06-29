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
            new FunctionInfo("log2", "log2(x)", "Base-2 logarithm", "Math"),
            new FunctionInfo("sqrt", "sqrt(x)", "Square root", "Math"),
            new FunctionInfo("cbrt", "cbrt(x)", "Cube root", "Math"),
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

            // HX sizing — UA (heat) and dP (friction) correlations computed from
            // flow + geometry + state, to be injected into a component's UA/dP.
            new FunctionInfo("htc_1phase", "htc_1phase(fluid$, P, T, mdot, Dh, Aflow)", "HEAT h [W/m^2/K], Gnielinski/laminar. SIDE: single-phase fluid in tubes (coolant/water/oil, refrigerant liquid line, or internal air). HX: radiator & charge-air-cooler liquid side, chiller coolant side, economizer", "Heat Transfer"),
            new FunctionInfo("htc_evap", "htc_evap(fluid$, P, x, mdot, Dh, Aflow)", "HEAT h [W/m^2/K], Shah convective boiling. SIDE: boiling two-phase refrigerant. HX: evaporator & battery-chiller refrigerant side", "Heat Transfer"),
            new FunctionInfo("htc_cond", "htc_cond(fluid$, P, x, mdot, Dh, Aflow)", "HEAT h [W/m^2/K], Shah 1979 condensation. SIDE: condensing two-phase refrigerant. HX: condenser/gas-cooler refrigerant side", "Heat Transfer"),
            new FunctionInfo("ua_hx", "ua_hx(h1, A1, h2, A2, Rwall)", "Overall conductance UA [W/K]=1/(1/(h1 A1)+Rwall+1/(h2 A2)). USE: combine the two side films + wall of ANY two-stream HX", "Heat Transfer"),
            new FunctionInfo("dp_1phase", "dp_1phase(fluid$, P, T, mdot, Dh, Aflow, L)", "dP [Pa], Darcy. SIDE: single-phase liquid/gas line (coolant, water, air channel, pipe). HX: radiator/CAC fluid channels", "Heat Transfer"),
            new FunctionInfo("dp_2phase", "dp_2phase(fluid$, P, x, mdot, Dh, Aflow, L)", "dP [Pa], Darcy x Chisholm L-M. SIDE: two-phase refrigerant. HX: evaporator/condenser refrigerant line", "Heat Transfer"),
            new FunctionInfo("dp_mueller_steinhagen", "dp_mueller_steinhagen(fluid$, P, x, mdot, Dh, Aflow, L)", "dP [Pa], Mueller-Steinhagen-Heck. SIDE: two-phase refrigerant (alt to dp_2phase). HX: evaporator/condenser refrigerant line", "Heat Transfer"),
            new FunctionInfo("dp_compact_core", "dp_compact_core(G, rho_in, rho_out, rho_mean, sigma, f, AoverAc, Kc, Ke)", "dP [Pa], Kays-London core (entrance/accel/core-friction/exit). SIDE: air/gas through a compact finned core. HX: fin-and-tube/plate-fin radiator, condenser, CAC air side", "Heat Transfer"),
            new FunctionInfo("htc_extair", "htc_extair(fluid$, P, T, mdot, D, Aflow)", "HEAT h [W/m^2/K], Zukauskas tube bank. SIDE: AIR/gas cross-flow over finned tubes. HX: radiator/condenser/cabin-evaporator air side", "Heat Transfer"),
            new FunctionInfo("nu_zukauskas", "nu_zukauskas(Re, Pr)", "Nu, tube-bank cross-flow. SIDE: air/gas over a tube bank. HX: fin-and-tube radiator/condenser air side", "Heat Transfer"),
            new FunctionInfo("nu_colburn", "nu_colburn(j, Re, Pr)", "Nu=j*Re*Pr^(1/3). SIDE: air/gas through a compact finned surface. HX: plate-fin/louvered-fin air side", "Heat Transfer"),
            new FunctionInfo("nu_churchill_chu", "nu_churchill_chu(Ra, Pr)", "Nu, free convection from Rayleigh. SIDE: natural convection (still air / quiescent fluid). HX: passive/low-flow surfaces", "Heat Transfer"),
            new FunctionInfo("nu_blend", "nu_blend(Nu1, Nu2)", "Cubic free+forced blend (Nu1^3+Nu2^3)^(1/3). USE: combine natural + forced Nu on any side", "Heat Transfer"),
            new FunctionInfo("hx_dh", "hx_dh(Aflow, Atotal, L)", "GEOMETRY: hydraulic diameter D_h=4*Aflow*L/Atotal [m] of a compact HX core (any side)", "Heat Transfer"),
            new FunctionInfo("hx_aconv", "hx_aconv(Aflow, L, Dh)", "GEOMETRY: convective area A=4*Aflow*L/Dh [m^2] of a compact HX core (any side)", "Heat Transfer"),
            new FunctionInfo("hx_sigma", "hx_sigma(Aflow, Afrontal)", "GEOMETRY: free-flow (contraction) ratio sigma=Aflow/Afrontal. SIDE: compact HX air/gas face", "Heat Transfer"),
            new FunctionInfo("hx_eta_surf", "hx_eta_surf(Afin, Atotal, eta_fin)", "GEOMETRY: overall fin-surface efficiency 1-(Afin/Atotal)(1-eta_fin). SIDE: finned (extended-surface) side, usually air", "Heat Transfer"),
            new FunctionInfo("nu_tubebank", "nu_tubebank(arr$, Re, Pr)", "Nu, Zukauskas tube bank (arr$=inline|staggered, Re-band C,m). SIDE: air/gas over a tube bank. HX: fin-and-tube radiator/condenser air side", "Heat Transfer"),
            new FunctionInfo("nu_hilpert", "nu_hilpert(Re, Pr)", "Nu, single-cylinder cross-flow. SIDE: air/gas over a single tube. HX: bare-tube / sparse-bank air side", "Heat Transfer"),
            new FunctionInfo("nu_plate", "nu_plate(Re, Pr, beta_deg)", "Nu, chevron-angle dependent. SIDE: either single-phase stream in a brazed/gasketed PLATE HX. HX: plate heat exchanger (BPHE)", "Heat Transfer"),
            new FunctionInfo("hx_fin_len", "hx_fin_len(depth, t, finDensity, Htube)", "GEOMETRY: developed fin length [m]. SIDE: finned air side of a fin-and-tube HX", "Heat Transfer"),
            new FunctionInfo("hx_area_direct", "hx_area_direct(W, tubeCount, Htube, depth, t)", "GEOMETRY: primary tube-wall area [m^2], fin-and-tube HX (air side)", "Heat Transfer"),
            new FunctionInfo("hx_area_indirect", "hx_area_indirect(W, tubeCount, finLen)", "GEOMETRY: secondary fin area [m^2], fin-and-tube HX (air side)", "Heat Transfer"),
            new FunctionInfo("dp_gravity", "dp_gravity(rho_l, rho_g, alpha, L, theta_deg)", "dP [Pa], static head. SIDE: two-phase refrigerant in a vertical riser/downcomer. HX: evaporator/condenser vertical passes", "Heat Transfer"),
            new FunctionInfo("mass_flux", "mass_flux(mdot, Aflow)", "GEOMETRY/flow: mass flux G=mdot/Aflow [kg/m^2/s] (any side)", "Heat Transfer"),
            new FunctionInfo("j_fin", "j_fin(surface$, Re)", "Colburn j for a compact fin surface (plain|wavy|louvered|offset). SIDE: air/gas finned side. HX: plate-fin/louvered/offset-strip radiator, condenser, CAC", "Heat Transfer"),
            new FunctionInfo("f_fin", "f_fin(surface$, Re)", "Fanning friction for a compact fin surface. SIDE: air/gas finned side dP (pair with j_fin). HX: same as j_fin", "Heat Transfer"),
            new FunctionInfo("nu_gungor_winterton", "nu_gungor_winterton(Nu_l, Xtt, Bo)", "Nu, Gungor-Winterton flow boiling from liquid-only Nu. SIDE: boiling two-phase refrigerant. HX: evaporator refrigerant side", "Heat Transfer"),
            new FunctionInfo("nu_traviss", "nu_traviss(Re_l, Pr_l, Xtt)", "Nu, Traviss in-tube condensation. SIDE: condensing two-phase refrigerant. HX: tube/microchannel condenser refrigerant side", "Heat Transfer"),
            new FunctionInfo("dp_2phase_avg", "dp_2phase_avg(fluid$, P, x_in, x_out, mdot, Dh, Aflow, L, n)", "dP [Pa], quality-integrated (n cells). SIDE: two-phase refrigerant along an evaporator/condenser pass", "Heat Transfer"),

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
            new FunctionInfo("adiabaticflametempeq", "AdiabaticFlameTempEq(fuel$, phi, T_react, P)", "Adiabatic flame temperature with dissociation [K]", "Combustion"),

            // Inverse trig & hyperbolic (angles in radians)
            new FunctionInfo("arcsin", "arcsin(x)", "Inverse sine [rad] (alias of asin)", "Math"),
            new FunctionInfo("arccos", "arccos(x)", "Inverse cosine [rad] (alias of acos)", "Math"),
            new FunctionInfo("arctan", "arctan(x)", "Inverse tangent [rad] (alias of atan)", "Math"),
            new FunctionInfo("sinh", "sinh(x)", "Hyperbolic sine", "Math"),
            new FunctionInfo("cosh", "cosh(x)", "Hyperbolic cosine", "Math"),
            new FunctionInfo("tanh", "tanh(x)", "Hyperbolic tangent", "Math"),
            new FunctionInfo("arcsinh", "arcsinh(x)", "Inverse hyperbolic sine", "Math"),
            new FunctionInfo("arccosh", "arccosh(x)", "Inverse hyperbolic cosine (x>=1)", "Math"),
            new FunctionInfo("arctanh", "arctanh(x)", "Inverse hyperbolic tangent (|x|<1)", "Math"),

            // Rounding, number theory & bitwise
            new FunctionInfo("trunc", "trunc(x)", "Discard the fractional part (round toward zero)", "Math"),
            new FunctionInfo("factorial", "factorial(n)", "Factorial n!", "Math"),
            new FunctionInfo("gcd", "gcd(a, b)", "Greatest common divisor", "Math"),
            new FunctionInfo("lcm", "lcm(a, b)", "Least common multiple", "Math"),
            new FunctionInfo("bitand", "bitand(a, b)", "Bitwise AND", "Math"),
            new FunctionInfo("bitor", "bitor(a, b)", "Bitwise OR", "Math"),
            new FunctionInfo("bitxor", "bitxor(a, b)", "Bitwise XOR", "Math"),
            new FunctionInfo("bitnot", "bitnot(a)", "Bitwise NOT", "Math"),
            new FunctionInfo("bitshiftl", "bitshiftl(a, n)", "Left bit shift a<<n", "Math"),
            new FunctionInfo("bitshiftr", "bitshiftr(a, n)", "Right bit shift a>>n", "Math"),
            new FunctionInfo("baseconvert", "baseconvert(s$)", "Convert a based-number string literal to a value", "Math"),
            new FunctionInfo("product", "product(i, lo, hi, term)", "Product series Pi(term) over i = lo..hi", "Math"),

            // Inline conditional
            new FunctionInfo("if", "If(a, b, lt, eq, gt)", "Branch: lt if a<b, eq if a=b, gt if a>b", "Logic"),

            // Statistics & regression (operate on a list/vector of values)
            new FunctionInfo("average", "average(x1, x2, ...)", "Arithmetic mean (alias avg)", "Stats"),
            new FunctionInfo("rms", "rms(x1, x2, ...)", "Root mean square", "Stats"),
            new FunctionInfo("percentile", "percentile(p, x1, x2, ...)", "p-th percentile, p in [0,100]", "Stats"),
            new FunctionInfo("slope", "slope(xvals, yvals)", "Least-squares linear-fit slope", "Stats"),
            new FunctionInfo("intercept", "intercept(xvals, yvals)", "Least-squares linear-fit intercept", "Stats"),
            new FunctionInfo("r2", "r2(xvals, yvals)", "Linear-fit coefficient of determination R^2", "Stats"),
            new FunctionInfo("probability", "probability(x1, x2, mu, sigma)", "Normal probability that x1 <= X <= x2", "Stats"),
            new FunctionInfo("normalcdf", "normalcdf(x, mu, sigma)", "Normal cumulative distribution at x", "Stats"),
            new FunctionInfo("normalpdf", "normalpdf(x, mu, sigma)", "Normal probability density at x", "Stats"),
            new FunctionInfo("normalinvcdf", "normalinvcdf(p, mu, sigma)", "Inverse normal CDF (quantile) at p", "Stats"),
            new FunctionInfo("chi_square", "chi_square(x, df)", "Chi-square CDF with df degrees of freedom", "Stats"),
            new FunctionInfo("random", "random(a, b)", "Uniform random number in [a, b]", "Stats"),
            new FunctionInfo("randg", "randg(mu, sigma)", "Gaussian (normal) random number", "Stats"),

            // Complex-number helpers (a complex value is the pair (Z_r, Z_i))
            new FunctionInfo("real", "real(z)", "Real part of a complex value", "Complex"),
            new FunctionInfo("imag", "imag(z)", "Imaginary part of a complex value", "Complex"),
            new FunctionInfo("conj", "conj(z)", "Complex conjugate", "Complex"),
            new FunctionInfo("magnitude", "magnitude(z)", "Modulus |z|", "Complex"),
            new FunctionInfo("angle", "angle(z)", "Argument of z [rad] (alias anglerad)", "Complex"),
            new FunctionInfo("angledeg", "angledeg(z)", "Argument of z [deg]", "Complex"),
            new FunctionInfo("cis", "cis(theta)", "e^(j*theta) = cos(theta) + j*sin(theta)", "Complex"),

            // Special functions
            new FunctionInfo("gamma", "gamma(x)", "Gamma function Gamma(x), Gamma(n+1)=n!", "Special Functions"),
            new FunctionInfo("loggamma", "loggamma(x)", "ln Gamma(x) (overflow-safe)", "Special Functions"),
            new FunctionInfo("digamma", "digamma(x)", "Digamma psi(x) = d/dx ln Gamma(x)", "Special Functions"),
            new FunctionInfo("beta", "beta(a, b)", "Beta function B(a, b)", "Special Functions"),
            new FunctionInfo("erf", "erf(x)", "Error function", "Special Functions"),
            new FunctionInfo("erfc", "erfc(x)", "Complementary error function 1-erf(x)", "Special Functions"),
            new FunctionInfo("erfinv", "erfinv(x)", "Inverse error function", "Special Functions"),
            new FunctionInfo("besselj", "besselj(n, x)", "Bessel function of the 1st kind, order n", "Special Functions"),
            new FunctionInfo("bessely", "bessely(n, x)", "Bessel function of the 2nd kind, order n", "Special Functions"),
            new FunctionInfo("besseli", "besseli(n, x)", "Modified Bessel function of the 1st kind, order n", "Special Functions"),
            new FunctionInfo("besselk", "besselk(n, x)", "Modified Bessel function of the 2nd kind, order n", "Special Functions"),
            new FunctionInfo("besselj0", "besselj0(x)", "Bessel J0(x)", "Special Functions"),
            new FunctionInfo("besselj1", "besselj1(x)", "Bessel J1(x)", "Special Functions"),
            new FunctionInfo("bessely0", "bessely0(x)", "Bessel Y0(x)", "Special Functions"),
            new FunctionInfo("bessely1", "bessely1(x)", "Bessel Y1(x)", "Special Functions"),
            new FunctionInfo("besseli0", "besseli0(x)", "Modified Bessel I0(x)", "Special Functions"),
            new FunctionInfo("besseli1", "besseli1(x)", "Modified Bessel I1(x)", "Special Functions"),
            new FunctionInfo("besselk0", "besselk0(x)", "Modified Bessel K0(x)", "Special Functions"),
            new FunctionInfo("besselk1", "besselk1(x)", "Modified Bessel K1(x)", "Special Functions"),
            new FunctionInfo("chebyshevt", "chebyshevt(n, x)", "Chebyshev polynomial of the 1st kind T_n(x)", "Special Functions"),
            new FunctionInfo("chebyshevu", "chebyshevu(n, x)", "Chebyshev polynomial of the 2nd kind U_n(x)", "Special Functions"),
            new FunctionInfo("hermiteh", "hermiteh(n, x)", "Hermite polynomial H_n(x)", "Special Functions"),
            new FunctionInfo("laguerrel", "laguerrel(n, x)", "Laguerre polynomial L_n(x)", "Special Functions"),
            new FunctionInfo("legendrep", "legendrep(n, x)", "Legendre polynomial P_n(x)", "Special Functions"),

            // Calculus & error propagation
            new FunctionInfo("integral", "Integral(expr, var, lower, upper)", "Definite integral; self-referential form integrates a scalar first-order ODE", "Calculus"),
            new FunctionInfo("gaussintegral", "GaussIntegral(expr, var, lower, upper)", "Definite integral by Gauss-Legendre quadrature", "Calculus"),
            new FunctionInfo("differentiate", "Differentiate('t', y, x, xv)", "Numerical dy/dx at xv from a TABLE", "Calculus"),
            new FunctionInfo("integralvalue", "IntegralValue('y', 'x')", "Trapezoidal integral of column y vs x", "Calculus"),
            new FunctionInfo("uncertaintyof", "UncertaintyOf(X)", "Propagated uncertainty of X (resolved in a second solve pass)", "Calculus"),

            // Interpolation & lookup (against a TABLE block)
            new FunctionInfo("interpolate", "Interpolate('t', x)", "Linear interpolation of table t at x (same as t(x))", "Interpolation"),
            new FunctionInfo("interpolate1", "Interpolate1('t', x)", "Cubic-spline interpolation of table t at x", "Interpolation"),
            new FunctionInfo("interpolate2d", "Interpolate2D('t', x, y)", "Bilinear 2-D interpolation of table t", "Interpolation"),
            new FunctionInfo("lookup", "Lookup('t', row, col)", "Cell value by 1-based row/col indices", "Interpolation"),
            new FunctionInfo("lookuprow", "LookupRow('t', col, val)", "Row index where column col crosses val", "Interpolation"),
            new FunctionInfo("nlookuprows", "NLookupRows('t')", "Number of data rows in table t", "Interpolation"),

            // Parametric-table accessors
            new FunctionInfo("tablevalue", "TableValue(run, col)", "Cell value in the parametric table", "Tables"),
            new FunctionInfo("tablerun#", "TableRun#()", "Current parametric run index (1-based)", "Tables"),
            new FunctionInfo("nparametricruns", "NParametricRuns()", "Total number of configured parametric runs", "Tables"),
            new FunctionInfo("tablesum", "TableSum('col')", "Sum of a parametric-table column", "Tables"),
            new FunctionInfo("tableavg", "TableAvg('col')", "Average of a parametric-table column", "Tables"),
            new FunctionInfo("tablemin", "TableMin('col')", "Minimum of a parametric-table column", "Tables"),
            new FunctionInfo("tablemax", "TableMax('col')", "Maximum of a parametric-table column", "Tables"),
            new FunctionInfo("tablestddev", "TableStdDev('col')", "Standard deviation of a parametric-table column", "Tables"),

            // ODE (DYNAMIC) result accessors
            new FunctionInfo("odevalue", "ODEValue('col', t)", "ODE column value interpolated at time t", "ODE Results"),
            new FunctionInfo("finalvalue", "FinalValue('col')", "Last value of an ODE column", "ODE Results"),
            new FunctionInfo("maxvalue", "MaxValue('col')", "Peak value of an ODE column", "ODE Results"),
            new FunctionInfo("minvalue", "MinValue('col')", "Minimum value of an ODE column", "ODE Results"),
            new FunctionInfo("timeat", "TimeAt('col', val)", "Time at which an ODE column crosses val", "ODE Results"),
            new FunctionInfo("odeavg", "ODEAvg('col')", "Time-mean of an ODE column", "ODE Results"),
            new FunctionInfo("odesum", "ODESum('col')", "Sum of an ODE column", "ODE Results"),
            new FunctionInfo("odestddev", "ODEStdDev('col')", "Standard deviation of an ODE column", "ODE Results"),
            new FunctionInfo("odemin", "ODEMin('col')", "Minimum of an ODE column", "ODE Results"),
            new FunctionInfo("odemax", "ODEMax('col')", "Maximum of an ODE column", "ODE Results"),

            // Numeric string helpers (operate on string-literal arguments)
            new FunctionInfo("stringlen", "StringLen(s$)", "Length of a string literal", "Strings"),
            new FunctionInfo("stringpos", "StringPos(s$, sub$)", "1-based position of substring sub$ in s$ (0 if absent)", "Strings"),
            new FunctionInfo("stringval", "StringVal(s$)", "Parse a numeric string literal to a value", "Strings"),

            // Arrays
            new FunctionInfo("arrayelmt", "ArrayElmt(arr[1:n], i)", "Select the i-th element of an array range", "Math"),

            // Transient conduction & radiation view factors
            new FunctionInfo("heisler_temp", "heisler_temp(geom$, Bi, Fo, xstar)", "Heisler one-term transient temperature ratio (geom$ = 'wall'|'cylinder'|'sphere')", "Heat Transfer"),
            new FunctionInfo("heisler_q", "heisler_q(geom$, Bi, Fo)", "Heisler transient heat-fraction Q/Q0", "Heat Transfer"),
            new FunctionInfo("viewfactor_perp", "viewfactor_perp(wi, wj, L)", "View factor between perpendicular rectangles with a common edge (Howell)", "Heat Transfer"),
            new FunctionInfo("viewfactor_plates", "viewfactor_plates(a, b, c)", "View factor between aligned parallel rectangles (Howell)", "Heat Transfer"),
            new FunctionInfo("viewfactor_disks", "viewfactor_disks(r1, r2, L)", "View factor between coaxial parallel disks (Howell)", "Heat Transfer"),

            // Compressible-flow stagnation properties
            new FunctionInfo("stagnationtemp", "StagnationTemp(T, V, cp)", "Stagnation temperature T0 = T + V^2/(2 cp) [K]", "Compressible Flow"),
            new FunctionInfo("stagnationpres", "StagnationPres(P, T, T0, k)", "Stagnation pressure P0 = P (T0/T)^(k/(k-1)) [Pa]", "Compressible Flow")
    );

    public static List<FunctionInfo> listFunctions() {
        return FUNCTIONS;
    }
}
