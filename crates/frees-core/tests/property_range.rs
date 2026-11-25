//! FX3d: water at 5000 °C returned a value with no warning, far above the
//! equation of state's temperature limit. The value is CoolProp's
//! extrapolation and still returned; the solve now warns.

use frees_core::{solve, SolverSettings};

fn warnings(text: &str) -> Vec<String> {
    let s = solve(text, &SolverSettings::default()).expect("solves");
    assert!(s.values["h"].is_finite(), "{}", s.values["h"]);
    s.diagnostics.into_iter().map(|d| d.message).collect()
}

#[test]
fn water_far_above_its_temperature_limit_warns() {
    let w = warnings("T = 5000 [C]\nh = Enthalpy(Water, T=T, P=101325 [Pa])\n");
    assert_eq!(w.len(), 1, "{w:?}");
    assert!(
        w[0].contains("Enthalpy(Water") && w[0].contains("above the equation of state's limit"),
        "{w:?}"
    );
}

#[test]
fn water_far_above_its_pressure_limit_warns() {
    let w = warnings("h = Enthalpy(Water, T=600 [K], P=2e9 [Pa])\n");
    assert!(w.iter().any(|m| m.contains("P = 2000000000 Pa")), "{w:?}");
}

#[test]
fn a_state_inside_the_limits_is_quiet() {
    assert_eq!(
        warnings("h = Enthalpy(Water, T=500 [K], P=1e6 [Pa])\n"),
        Vec::<String>::new()
    );
}
