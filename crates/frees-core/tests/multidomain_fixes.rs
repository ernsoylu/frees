//! Regression checks for the multi-domain component flaws fixed on 2026-10-20,
//! one per root cause. Each document is the smallest one that failed before.

use std::collections::BTreeMap;

use frees_core::analysis::optimizer::{optimize, Problem};
use frees_core::{solve, SolverSettings};

fn values(src: &str) -> BTreeMap<String, f64> {
    match solve(src, &SolverSettings::default()) {
        Ok(s) => s
            .values
            .into_iter()
            .map(|(k, v)| (k.to_ascii_lowercase(), v))
            .collect(),
        Err(e) => panic!("expected a solve, got: {}\n{src}", e.error),
    }
}

fn close(a: f64, b: f64, rel: f64) -> bool {
    (a - b).abs() <= rel * b.abs().max(1.0)
}

#[test]
fn a_parameter_bound_to_another_instance_output_is_wired_to_it() {
    let v = values(
        "SigConstant C(k=500)\nHeatSource H(Q = C.out.sig)\nThermalSource AMB(T=300)\n\
         Conduction K(k=1, area=1, L=0.1)\nconnect(H.port, K.a)\nconnect(K.b, AMB.port)\nth = K.a.T\n",
    );
    assert!(close(v["th"], 350.0, 1e-9), "{v:?}");
}

#[test]
fn a_heat_wall_port_temperature_is_the_port_not_a_fluid_property() {
    let v = values(
        "LiquidSource S(fluid$=Water, mdot=0.05, P=200000, T=305)\n\
         LiquidWallHX X(fluid$=Water, UA=500)\nLiquidSink K()\nThermalSource W(T=290)\n\
         connect(S.out, X.in)\nconnect(X.out, K.in)\nconnect(X.wall, W.port)\n\
         tw = X.wall.T\nt_out = Temperature(Water, P=X.out.P, h=X.out.h)\nua = X.UA\n",
    );
    assert!(close(v["tw"], 290.0, 1e-9));
    assert!(
        close(v["ua"], 500.0, 1e-12),
        "inst.param reads the parameter"
    );
    // ε-NTU: the outlet approaches but never crosses the wall (old law: 269 K).
    assert!(v["t_out"] > 290.0 && v["t_out"] < 305.0, "{}", v["t_out"]);
}

#[test]
fn a_subsystem_boundary_port_keeps_the_through_variable_sign() {
    let v = values(
        "function [p, n] = Wrapped(Voc, R0)\nport(p)\nport(n)\n  Battery B(Voc=Voc, R0=R0)\n  \
         connect(p, B.p)\n  connect(n, B.n)\nend\n\
         Wrapped W(Voc=12, R0=0.1)\nBattery B2(Voc=12, R0=0.1)\nResistor L1(R=1)\nResistor L2(R=1)\n\
         Ground G1()\nGround G2()\nconnect(W.p, L1.a)\nconnect(W.n, L1.b, G1.port)\n\
         connect(B2.p, L2.a)\nconnect(B2.n, L2.b, G2.port)\niw = L1.a.I\nib = L2.a.I\n",
    );
    assert!(close(v["iw"], v["ib"], 1e-9), "{} vs {}", v["iw"], v["ib"]);
    assert!(close(v["ib"], 12.0 / 1.1, 1e-9));
}

#[test]
fn repeated_connects_of_one_port_form_one_node() {
    let v = values(
        "ThermalSource S1(T = 400)\nConduction C1(k = 10, area = 1, L = 0.1)\n\
         Conduction C2(k = 10, area = 1, L = 0.1)\nThermalSource S2(T = 300)\n\
         connect(S1.port, C1.a)\nconnect(C1.b, C2.a)\nconnect(C2.a, C1.b)\nconnect(C2.b, S2.port)\n\
         q1 = C1.Q\n",
    );
    assert!(close(v["q1"], 5000.0, 1e-9));
}

#[test]
fn a_closed_coolant_loop_with_split_tank_and_mixer_closes_its_mass_balance() {
    let v = values(
        "TABLE wpump(Q)\n  0 14\n  0.0020 10\n  0.0035 2\nEND\n\
         LiquidPumpMap PUMP(rho=1065, eta=0.5, map$=wpump)\nLiquidColdPlate HEAT(Q=20000)\n\
         LiquidWallHX RAD(fluid$=EG50, UA=1500)\nThermalSource AIR(T=300)\n\
         LiquidOrifice A(CdA=6e-5, rho=1065)\nLiquidOrifice B(CdA=3e-5, rho=1065)\nLiquidMixer MIX()\n\
         LiquidExpansionTank ET(P=140000)\n\
         connect(PUMP.out, HEAT.in)\nconnect(HEAT.out, A.in, B.in)\nconnect(A.out, RAD.in)\n\
         connect(RAD.wall, AIR.port)\nconnect(RAD.out, MIX.in1)\nconnect(B.out, MIX.in2)\n\
         connect(MIX.out, PUMP.in, ET.port)\nm = PUMP.in.mdot\nm_tank = ET.port.mdot\n\
         q_rad = RAD.Q\nw = PUMP.W\n",
    );
    assert!(v["m"] > 0.1, "{v:?}");
    assert!(v["m_tank"].abs() < 1e-9, "a steady tank takes no flow");
    // Energy closes around the loop: radiator rejects heat in plus pump work.
    assert!(close(v["q_rad"], 20000.0 + v["w"], 1e-6), "{v:?}");
}

#[test]
fn a_closed_refrigerant_loop_through_wall_heat_exchangers_is_square_and_consistent() {
    let v = values(
        "TwoPhaseCompressor CMP(fluid$=R134a, model$=volumetric, eta=0.65, eta_v=0.85, disp=1.6e-4, rpm=1800)\n\
         TwoPhaseCondenserFloat COND(fluid$=R134a, UA=650, T_amb=308.15)\n\
         TwoPhaseExpansionValve TXV(fluid$=R134a, Cv=1.25e-6)\n\
         MovingBoundaryEvaporator EV(fluid$=R134a, U_tp=2500, U_sh=400, D=0.008, L=9, eps_zone=0.05)\n\
         ThermalSource W(T=290)\nconnect(CMP.out, COND.in)\nconnect(COND.out, TXV.in)\n\
         connect(TXV.out, EV.in)\nconnect(EV.out, CMP.in)\nconnect(EV.wall, W.port)\n\
         GUESS CMP.in.P = 3.0e5\nGUESS CMP.out.P = 1.4e6\nGUESS CMP.in.h = 4.0e5\n\
         GUESS CMP.out.h = 4.4e5\nGUESS COND.out.h = 2.7e5\nGUESS TXV.out.h = 2.7e5\n\
         GUESS CMP.in.mdot = 0.06\nh_suc = CMP.in.h\nh_ev = EV.out.h\nsh = EV.SH\n",
    );
    assert!(
        close(v["h_suc"], v["h_ev"], 1e-9),
        "the closing connect holds"
    );
    assert!(v["sh"] >= 0.0);
}

#[test]
fn a_pump_feeding_a_pipe_converges_from_default_guesses() {
    let v = values(
        "LiquidSource SRC(fluid$=EG50, mdot=0.15, P=150000, T=288.15)\nLiquidPump PMP(fluid$=EG50, eta=0.45)\n\
         LiquidPipe SUP(fluid$=EG50, L=3, D=0.012, rough=1.5e-6)\nLiquidSink RET()\n\
         connect(SRC.out, PMP.in)\nconnect(PMP.out, SUP.in)\nconnect(SUP.out, RET.in)\n\
         RET.in.P = 150000\ndp = PMP.out.P - PMP.in.P\n",
    );
    assert!(v["dp"] > 1000.0 && v["dp"] < 20000.0, "{}", v["dp"]);
}

#[test]
fn a_motor_driven_pump_absorbs_power() {
    let v = values(
        "Battery BAT(Voc=24, R0=0.02)\nDCMotor MOT(Kt=0.06, Ke=0.06, R=0.08)\nGround G()\n\
         connect(BAT.p, MOT.p)\nconnect(BAT.n, MOT.n, G.port)\nGear GB(ratio=1.6)\nconnect(MOT.shaft, GB.in)\n\
         HydraulicSupply SUC(P=1e5)\nHydraulicPump PMP(disp=1e-5, rho=870, eta_v=0.92, eta_m=0.88)\n\
         HydraulicOrifice LOAD(CdA=1.5e-6, rho=870)\nHydraulicTank TNK(P=1e5)\nconnect(GB.out, PMP.shaft)\n\
         connect(SUC.out, PMP.in)\nconnect(PMP.out, LOAD.in)\nconnect(LOAD.out, TNK.port)\n\
         p_el = (MOT.p.V - MOT.n.V) * MOT.p.I\np_hyd = PMP.out.mdot / 870 * (PMP.out.P - PMP.in.P)\n",
    );
    assert!(v["p_el"] > v["p_hyd"] && v["p_hyd"] > 0.0, "{v:?}");
}

#[test]
fn the_gas_cooler_exit_approaches_the_sink_as_ua_grows() {
    let doc = |ua: f64| {
        format!(
            "TwoPhaseSource S(fluid$=R744, mdot=0.05, P=3.5e6, x=1)\nTwoPhaseCompressor C(fluid$=R744, eta=0.7)\n\
             GasCooler GC(fluid$=R744, UA={ua}, dP=0)\nThermalSource A(T=308.15)\nTwoPhaseSink K()\n\
             connect(S.out, C.in)\nconnect(C.out, GC.in)\nconnect(GC.wall, A.port)\nconnect(GC.out, K.in)\n\
             C.out.P = 9.0e6\nt = Temperature(R744, P=9.0e6, h=GC.out.h)\n"
        )
    };
    let (small, large) = (values(&doc(150.0))["t"], values(&doc(3000.0))["t"]);
    assert!(small > large + 1.0 && large < 308.2, "{small} {large}");
}

#[test]
fn a_comment_line_starting_with_module_is_not_legacy_syntax() {
    let v = values("{ Module data: a word, not a declaration }\nx = 1\n");
    assert_eq!(v["x"], 1.0);
}

#[test]
fn an_ode_accessor_line_reports_a_zero_residual() {
    let s = solve(
        "k = 0.1\nDYNAMIC c(method=ode45, time = 0 .. 10, points = 11)\n der(T) = -k*(T-300)\n T(0) = 400\nEND\n\
         tf = FinalValue('t')\n",
        &SolverSettings::default(),
    )
    .unwrap_or_else(|e| panic!("{}", e.error));
    assert!(s.stats.max_residual < 1e-6, "{}", s.stats.max_residual);
}

fn problem(text: &str, objective: &str, decision: &str, lo: f64, hi: f64) -> Problem {
    Problem {
        text: text.to_string(),
        settings: SolverSettings::default(),
        overrides: Vec::new(),
        objective: objective.to_string(),
        decisions: vec![decision.to_string()],
        lowers: vec![lo],
        uppers: vec![hi],
        method: None,
        maximize: false,
        constraints: Vec::new(),
        extra_tables: Vec::new(),
    }
}

#[test]
fn a_brent_search_settles_on_an_active_inequality() {
    let mut p = problem("y = (a - 5)^2", "y", "a", 0.0, 10.0);
    p.constraints = vec!["a <= 2".to_string()];
    let r = optimize(&p).unwrap();
    assert!(
        (r.decision_values[0] - 2.0).abs() < 1e-3,
        "a = {}",
        r.decision_values[0]
    );
}

#[test]
fn an_optimizer_decision_read_only_by_a_dynamic_block_drives_it() {
    // T(10) = 300 + 100·exp(−10k) = 350 ⇒ k = ln 2 / 10.
    let p = problem(
        "DYNAMIC c(method=ode45, time = 0 .. 10, points = 11)\n der(T) = -k*(T-300)\n T(0) = 400\nEND\n\
         tf = FinalValue('t')\nobj = (tf - 350)^2\n",
        "obj",
        "k",
        0.01,
        0.5,
    );
    let r = optimize(&p).unwrap();
    let k = std::f64::consts::LN_2 / 10.0;
    assert!(
        (r.decision_values[0] - k).abs() < 1e-3,
        "k = {}",
        r.decision_values[0]
    );
}

// 2026-11-19: LiquidVolume left its outlet pressure without an equation, so a
// DYNAMIC run of it was underspecified. A dead-ended volume fed a constant
// flow must rise linearly, P = P0 + mdot t / C.
#[test]
fn a_liquid_volume_carries_its_pressure_to_the_outlet_in_a_dynamic_run() {
    let v = values(
        "function [port] = Feed(domain$ = liquid)\nport(port)\n  port.mdot = 0.02\n  port.h = 63000\nend\n\
         function [port] = Cap(domain$ = liquid)\nport(port)\n  port.mdot = 0\nend\n\
         Feed F()\nLiquidVolume V(C=4e-6, P0=100000)\nCap K()\n\
         connect(F.port, V.in)\nconnect(V.out, K.port)\n\
         DYNAMIC fill(method=ode45, time=0..100, points=11)\nEND\n\
         p_end = FinalValue('v.out.p')\n",
    );
    assert!(
        close(v["p_end"], 100000.0 + 0.02 * 100.0 / 4e-6, 1e-9),
        "{v:?}"
    );
}

#[test]
fn a_moving_boundary_superheat_zone_never_passes_its_wall() {
    // A mean-temperature driving force left this 12 m tube at 18.5 C against
    // a 15 C wall (review of #128); epsilon-NTU approaches the wall from below.
    // At 100 m (NTU 34) the residual gap is the smooth zone-length cap, which
    // leaves the boiling zone 1e-7 short of the full latent duty: 1.6e-5 K.
    for (l, gap) in [(12.0, 1.0), (100.0, 1e-4)] {
        let v = values(&format!(
            "TwoPhaseSource F(fluid$=R134a, mdot=0.02, P=300000, x=0.25)\n\
             MovingBoundaryEvaporator E(fluid$=R134a, U_tp=2500, U_sh=200, D=0.01, L={l}, eps_zone=0.01)\n\
             TwoPhaseSink K()\n\
             connect(F.out, E.in)\nconnect(E.out, K.in)\n\
             E.wall.T = 288.15\n\
             h_w = Enthalpy(R134a, P=300000, T=288.15)\n\
             q_sh = (1 - exp(-E.NTU_sh)) * 0.02 * (h_w - E.hg)\n\
             ntu = 200 * pi# * 0.01 * E.L_sh * E.r_sh / (0.02 * Cp(R134a, P=300000, x=1))\n"
        ));
        assert!(
            v["e$t_out"] < 288.15 && v["e$t_out"] > 288.15 - gap,
            "{l} m: {v:?}"
        );
        assert!(close(v["e$q_sh"], v["q_sh"], 1e-12), "{v:?}");
        assert!(close(v["e$ntu_sh"], v["ntu"], 1e-12), "{v:?}");
    }
}

#[test]
fn a_reversed_wall_adds_no_single_phase_duty() {
    // An evaporator wall below Tsat, and a condenser wall above it, would make
    // Enthalpy(T=wall.T) the other phase and the zone duty a latent heat that
    // drives the outlet past the wall (review of #131). The zones carry none.
    let v = values(
        "TwoPhaseSource F(fluid$=R134a, mdot=0.02, P=300000, x=0.25)\n\
         MovingBoundaryEvaporator E(fluid$=R134a, U_tp=2500, U_sh=200, D=0.01, L=12, eps_zone=0.01)\n\
         TwoPhaseSink K()\nconnect(F.out, E.in)\nconnect(E.out, K.in)\nE.wall.T = 270\n\
         TwoPhaseSourcePH G(mdot=0.02, P=900000, h=445000)\n\
         MovingBoundaryCondenser C(fluid$=R134a, U_cond=2500, U_sc=300, D=0.01, L=8, eps_zone=0.01)\n\
         TwoPhaseSink J()\nconnect(G.out, C.in)\nconnect(C.out, J.in)\nC.wall.T = 320\n",
    );
    assert_eq!(v["e$q_sh"], 0.0, "{v:?}");
    assert_eq!(v["c$q_sc"], 0.0, "{v:?}");
    // What remains is the smooth zone-length cap's milliwatts, not a latent heat.
    assert!(v["e$q"].abs() < 0.01 && v["c$q"].abs() < 0.01, "{v:?}");
}

#[test]
fn a_two_phase_pipe_connects_to_two_phase_boundaries() {
    let v = values(
        "TwoPhaseSourcePH S(mdot=0.05, P=500000, h=250000)\n\
         TwoPhasePipe T(fluid$=R134a, L=2, D=0.01, rough=1e-5, x=0.3, rho_l=1200, rho_g=20, mu_l=2e-4, mu_g=1e-5)\n\
         TwoPhaseSink K()\n\
         connect(S.out, T.in)\nconnect(T.out, K.in)\n\
         dp = 500000 - K.P\nphi2 = T.phi2\ndp_l = T.dp_l\n",
    );
    assert!(close(v["dp"], v["phi2"] * v["dp_l"], 1e-12), "{v:?}");
}
