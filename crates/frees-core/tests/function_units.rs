//! FX2b: a user FUNCTION's argument units were parsed and ignored. A call
//! with a dimensioned argument warned "argument must be dimensionless", the
//! result came out `[-]`, and a declared output unit hid a wrong argument.

use frees_core::{solve, SolverSettings};

fn check(text: &str) -> (Vec<String>, Option<String>) {
    let s = solve(text, &SolverSettings::default()).expect("solves");
    (s.unit_warnings, s.inferred_units.get("z").cloned())
}

#[test]
fn an_annotated_argument_is_checked_and_the_result_follows_the_body() {
    let sq = "function y = Sq(a [m])\n  y := a^2\nend\n";
    assert_eq!(
        check(&format!("{sq}z = Sq(3 [m])\n")),
        (vec![], Some("m^2".into()))
    );
    let (warnings, _) = check(&format!("{sq}z = Sq(3 [s])\n"));
    assert_eq!(
        warnings,
        ["z = Sq(3 [s]): sq expects [m] for a but gets [s]."]
    );
}

#[test]
fn an_unannotated_argument_is_a_wildcard() {
    let sq = "function y = Sq(a)\n  y := a^2\nend\n";
    assert_eq!(
        check(&format!("{sq}z = Sq(3 [m])\n")),
        (vec![], Some("m^2".into()))
    );
}

#[test]
fn a_declared_output_unit_does_not_hide_a_wrong_argument() {
    let sq = "function y = Sq(a [m]) [m^2]\n  y := a^2\nend\n";
    let (warnings, unit) = check(&format!("{sq}z = Sq(3 [s])\n"));
    assert_eq!(
        warnings,
        ["z = Sq(3 [s]): sq expects [m] for a but gets [s]."]
    );
    assert_eq!(unit.as_deref(), Some("m^2"));
}

#[test]
fn multi_output_arguments_and_results_carry_units() {
    let text =
        "FUNCTION [z, r] = DivMod(a [m], b [m])\n  z := trunc(a / b) * b\n  r := a - z\nEND\n\
                [z, r] = DivMod(7 [m], 2 [m])\n";
    assert_eq!(check(text), (vec![], Some("m".into())));
}
