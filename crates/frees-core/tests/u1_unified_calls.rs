//! U1 parser and dispatch coverage.

use frees_core::{parse_document, solve, SolverSettings};

#[test]
fn scalar_function_header_keeps_declared_output_name() {
    let doc =
        parse_document("function y = twice(x)\n  y := 2 * x\nend\nresult = twice(3)").unwrap();
    let function = doc.defs.function("twice").unwrap();
    assert_eq!(function.output.as_deref(), Some("y"));
    assert_eq!(function.name, "twice");
}

#[test]
fn single_result_procedure_is_a_scalar_expression_call() {
    let solution = solve(
        "PROCEDURE increment(a : result)\n  result := a + 1\nEND\ny = increment(4)",
        &SolverSettings::default(),
    )
    .unwrap();
    assert_eq!(solution.values["y"], 5.0);
}
