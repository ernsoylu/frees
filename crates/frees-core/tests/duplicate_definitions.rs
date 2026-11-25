//! FX3b: `FUNCTION f` followed by `FUNCTION F` kept the second silently.
//! Definition names are case-insensitive, so the second is refused.

use frees_core::{solve, SolverSettings};

#[test]
fn a_function_defined_twice_in_different_case_is_refused() {
    let text = "FUNCTION f(x)\n  f := x\nEND\nFUNCTION F(x)\n  F := 2*x\nEND\ny = f(3)\n";
    let err = solve(text, &SolverSettings::default()).expect_err("refused");
    let message = format!("{:?}", err.error);
    assert!(
        message.contains("`f` is already defined as a FUNCTION"),
        "{message}"
    );
}

#[test]
fn a_table_and_a_function_cannot_share_a_name() {
    let text = "TABLE k(x)\n  0  0\n  1  1\nEND\nFUNCTION k(x)\n  k := x\nEND\ny = k(0.5)\n";
    let err = solve(text, &SolverSettings::default()).expect_err("refused");
    assert!(
        format!("{:?}", err.error).contains("already defined as a TABLE"),
        "{:?}",
        err.error
    );
}
