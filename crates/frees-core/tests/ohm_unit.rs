//! FX3f: the engine prints resistances as `[Ω]`, so a reported unit must
//! paste back. `Ω` (and the ohm sign U+2126) lex only inside a unit bracket.

use frees_core::{solve, SolverSettings};

#[test]
fn an_ohm_symbol_inside_a_unit_bracket_parses() {
    let s = solve(
        "R = 10 [Ω]\nR2 = 2 [kΩ]\nR3 = 1 [\u{2126}]\n",
        &SolverSettings::default(),
    )
    .expect("solves");
    assert_eq!(s.values["r"], 10.0);
    assert_eq!(s.values["r2"], 2000.0);
    assert_eq!(s.values["r3"], 1.0);
    assert!(s.unit_warnings.is_empty(), "{:?}", s.unit_warnings);
}

#[test]
fn an_ohm_symbol_outside_a_unit_bracket_is_still_refused() {
    let err = solve("Ω = 10\n", &SolverSettings::default()).expect_err("refused");
    assert!(format!("{err:?}").contains('Ω'), "{err:?}");
}
