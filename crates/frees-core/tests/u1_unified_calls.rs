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
fn canonical_function_does_not_capture_caller_locals() {
    let doc = parse_document("function y = twice(x)\n  y := x + bias\nend").unwrap();
    let mut caller = frees_core::eval::Scope::default();
    caller.insert("bias".into(), 4.0);
    let error = frees_core::procedures::call_function(
        doc.defs.function("twice").unwrap(),
        &[2.0],
        &doc.defs,
        &caller,
    )
    .unwrap_err();
    assert!(error.to_string().contains("variable has no value: bias"));
}

#[test]
fn canonical_function_reports_an_ignored_equation() {
    let doc = parse_document("function y = identity(x)\n  2 * x = 99\n  y := x\nend").unwrap();
    let error = frees_core::procedures::call_function(
        doc.defs.function("identity").unwrap(),
        &[7.0],
        &doc.defs,
        &frees_core::eval::Scope::default(),
    )
    .unwrap_err();
    assert!(error.to_string().contains("FREES-MIG-004"));
}

#[test]
fn canonical_function_rejects_mixed_equations_and_calculations_until_versioned() {
    let doc = parse_document("function y = mixed(x)\n  x = 1\n  y := x\nend").unwrap();
    let error = frees_core::procedures::call_function(
        doc.defs.function("mixed").unwrap(),
        &[7.0],
        &doc.defs,
        &frees_core::eval::Scope::default(),
    )
    .unwrap_err();
    assert!(error.to_string().contains("FREES-MIG-003"));
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

#[test]
fn user_calls_accept_named_arguments_and_reject_duplicates() {
    let source = "function y = subtract(a, b)\n  y := a - b\nend\nanswer = subtract(b=2, a=7)";
    let solution = solve(source, &SolverSettings::default()).unwrap();
    assert_eq!(solution.values["answer"], 5.0);

    let error = solve(
        "function y = subtract(a, b)\n  y := a - b\nend\nanswer = subtract(a=7, a=2, b=1)",
        &SolverSettings::default(),
    )
    .unwrap_err();
    assert!(error.error.to_string().contains("provided more than once"));
}

#[test]
fn known_array_bindings_use_parenthesized_one_based_indexing() {
    let solution = solve(
        "values = [10, 20, 30]\nanswer = values(2)",
        &SolverSettings::default(),
    )
    .unwrap();
    assert_eq!(solution.values["answer"], 20.0);
}

#[test]
fn intrinsic_calls_accept_named_arguments() {
    let solution = solve("answer = sqrt(x=9)", &SolverSettings::default()).unwrap();
    assert_eq!(solution.values["answer"], 3.0);
}
