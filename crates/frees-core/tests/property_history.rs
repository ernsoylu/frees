#![cfg(feature = "rustprop-backend")]
//! FX1f: a property solve's answer must not depend on what the process solved
//! before it. The `(P,h)`/`(P,s)` warm start seeds each flash from the last
//! one, so a cache shared across solves made the first solve in a process
//! differ from every later one, and a sweep row depend on its worker.

use frees_core::props::rustprop_warm;
use frees_core::{solve, PreparedDocument, SolverSettings};

const RANKINE: &str = "P_high = 8000 [kPa]
P_low = 10 [kPa]
T_boiler = 500 [C]
eta_turb = 0.85
eta_pump = 0.90
W_dot_net = 10000 [kW]
h1 = Enthalpy(Water, P=P_high, T=T_boiler)
s1 = Entropy(Water, P=P_high, T=T_boiler)
h_2s = Enthalpy(Water, P=P_low, s=s1)
h2 = h1 - eta_turb * (h1 - h_2s)
h3 = Enthalpy(Water, P=P_low, x=0)
h_4s = Enthalpy(Water, P=P_high, s=Entropy(Water, P=P_low, x=0))
h4 = h3 + (h_4s - h3) / eta_pump
w_net = (h1 - h2) - (h4 - h3)
eta_th = w_net / (h1 - h4) * 100
W_dot_net = m_dot * w_net
";

/// A different state of the same fluid and pair, solved in between.
const OTHER: &str = "h = Enthalpy(Water, P=8100 [kPa], s=640 [J/kg-K])\n";

fn values(text: &str) -> Vec<(String, u64)> {
    let s = solve(text, &SolverSettings::default()).expect("solves");
    s.values
        .into_iter()
        .map(|(k, v)| (k, v.to_bits()))
        .collect()
}

#[test]
fn a_solve_does_not_depend_on_what_ran_before_it() {
    rustprop_warm::reset(); // a fresh module
    let first = values(RANKINE);
    let second = values(RANKINE);
    values(OTHER);
    let third = values(RANKINE);
    assert_eq!(
        first, second,
        "the first solve in a process differs from the next"
    );
    assert_eq!(first, third, "a solve in between moved the answer");
}

/// What a worker split amounts to: rows solved in another order, after other
/// rows, on the same prepared document. Each row must not notice.
#[test]
fn a_sweep_row_does_not_depend_on_the_rows_before_it() {
    // A sweep pins what the text leaves free: here the boiler pressure [Pa].
    let text = RANKINE.replace("P_high = 8000 [kPa]\n", "");
    let mut doc =
        PreparedDocument::new(&text, &SolverSettings::default(), &[], &[]).expect("prepares");
    let rows = [6.0e6, 7.0e6, 8.0e6, 9.0e6];
    let mut row = |p: f64| -> Vec<(String, u64)> {
        let s = doc
            .solve_with_pins(&[("p_high".to_string(), p)], None)
            .expect("solves");
        s.values
            .into_iter()
            .map(|(k, v)| (k, v.to_bits()))
            .collect()
    };
    let forward: Vec<_> = rows.iter().map(|&p| row(p)).collect();
    let mut reverse: Vec<_> = rows.iter().rev().map(|&p| row(p)).collect();
    reverse.reverse();
    assert_eq!(forward, reverse);
}
