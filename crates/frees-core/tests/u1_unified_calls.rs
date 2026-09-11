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
fn canonical_function_versions_mixed_equations_and_calculations_in_order() {
    let doc = parse_document("function y = mixed(x)\n  x = 1\n  y := x\nend").unwrap();
    let value = frees_core::procedures::call_function(
        doc.defs.function("mixed").unwrap(),
        &[7.0],
        &doc.defs,
        &frees_core::eval::Scope::default(),
    )
    .unwrap();
    assert_eq!(value, 1.0);
}

#[test]
fn canonical_functions_require_definite_assignment_after_branches() {
    let doc = parse_document(
        "function y = branch(x)\n  if x > 0 then\n    temp := 1\n  end\n  y := temp\nend",
    )
    .unwrap();
    let error = frees_core::procedures::call_function(
        doc.defs.function("branch").unwrap(),
        &[1.0],
        &doc.defs,
        &frees_core::eval::Scope::default(),
    )
    .unwrap_err();
    assert!(error.to_string().contains("variable has no value: temp"));
}

#[test]
fn canonical_functions_reject_structural_equations_inside_control_flow() {
    let source = "function y = branch(x)\n  if x > 0 then\n    z = x\n  end\n  y := x\nend\nanswer = branch(1)";
    let error = solve(source, &SolverSettings::default()).unwrap_err().to_string();
    assert!(error.contains("FREES-MIG-005"), "{error}");
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

    let error = solve(
        "values = [10, 20, 30]\nanswer = values(0)",
        &SolverSettings::default(),
    )
    .unwrap_err();
    assert!(
        format!("{:?}", error.error).contains("array indices are one-based"),
        "{error:?}"
    );
}

#[test]
fn array_binding_resolution_is_independent_of_statement_order() {
    let solution = solve(
        "answer = values(2)\nvalues = [10, 20, 30]",
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

#[test]
fn canonical_guess_call_preserves_seed_and_bounds() {
    let doc = parse_document("guess(x, 2, lower=0, upper=4)\ny = x").unwrap();
    assert_eq!(doc.guesses[0].name, "x");
    assert_eq!(doc.guesses[0].guess, Some(2.0));
    assert_eq!(doc.guesses[0].lower, Some(0.0));
    assert_eq!(doc.guesses[0].upper, Some(4.0));
}
