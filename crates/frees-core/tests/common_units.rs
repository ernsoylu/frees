//! FX3e: `mbar`, `ton` (refrigeration), `mph`, `knot` and `inH2O` were
//! unknown, so the literal was left unconverted.

use frees_core::{solve, SolverSettings};

#[test]
fn the_common_units_convert_to_si() {
    let text =
        "p = 1 [mbar]\nq = 1 [ton]\nv = 1 [mph]\nw = 1 [knot]\ndp = 1 [inH2O]\nw2 = 2 [knots]\n";
    let s = solve(text, &SolverSettings::default()).expect("solves");
    let close = |name: &str, si: f64| {
        let v = s.values[name];
        assert!((v - si).abs() <= 1e-9 * si, "{name} = {v}, expected {si}");
    };
    close("p", 100.0);
    close("q", 3516.852842066667);
    close("v", 0.44704);
    close("w", 0.5144444444444445);
    close("w2", 1.028888888888889);
    close("dp", 249.08891);
    assert!(s.diagnostics.is_empty(), "{:?}", s.diagnostics);
    assert!(s.unit_warnings.is_empty(), "{:?}", s.unit_warnings);
}

#[test]
fn the_units_carry_their_dimensions() {
    // A speed in mph plus one in m/s is consistent; a ton plus a metre is not.
    let s = solve(
        "v = 1 [mph] + 1 [m/s]\nz = 1 [ton] + 1 [m]\n",
        &SolverSettings::default(),
    )
    .unwrap();
    assert_eq!(s.unit_warnings.len(), 1, "{:?}", s.unit_warnings);
}
