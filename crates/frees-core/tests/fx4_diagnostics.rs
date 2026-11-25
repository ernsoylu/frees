//! FX4: diagnostics that pointed the wrong way.

use frees_core::{check, solve, SolverSettings};

fn solve_err(text: &str) -> String {
    let err = solve(text, &SolverSettings::default()).expect_err("fails");
    format!("{:?}", err.error)
}

#[test]
fn an_explicit_equation_that_cannot_be_evaluated_reports_the_function_error() {
    // Was "Newton stalled after 0 iterations ... Try different guess values".
    let message = solve_err("h = Enthalpy(Water, T=600 [K], P=5e10 [Pa])\n");
    assert!(
        message.contains("cannot be evaluated: unable to calculate melting line"),
        "{message}"
    );
    assert!(!message.contains("guess"), "{message}");
    let message = solve_err("y = exp(1000)\n");
    assert!(
        message.contains("`y = exp(1000)` is not finite"),
        "{message}"
    );
    assert!(!message.contains("guess"), "{message}");
}

#[test]
fn size_limits_are_not_syntax_errors() {
    for text in [
        "FOR i = 1 TO 2000000\n  x[i] = i\nEND\n",
        "v = linspace(0, 1, 20000000)\n",
        "Z = zeros(5000, 5000)\n",
    ] {
        let report = check(text).unwrap();
        assert!(!report.solvable);
        assert!(
            !report.message.starts_with("Syntax error"),
            "{text}: {}",
            report.message
        );
        assert!(report.message.contains("too large"), "{}", report.message);
    }
}

#[test]
fn an_unknown_for_bound_names_the_cause() {
    let report = check("N = 0/0\nFOR i = 1 TO N\n  x[i] = i\nEND\n").unwrap();
    assert!(
        !report.message.starts_with("Syntax error"),
        "{}",
        report.message
    );
    assert!(
        report
            .message
            .contains("must be a number known before solving"),
        "{}",
        report.message
    );
}

#[test]
fn a_named_argument_on_sum_is_not_a_fluid_property_call() {
    let report = check("N = 3\ns = sum(i, i=1, N)\n").unwrap();
    assert!(!report.message.contains("fluid"), "{}", report.message);
    assert!(
        report.message.contains("sum(i, 1, N, body)"),
        "{}",
        report.message
    );
}

#[test]
fn the_component_chain_hint_needs_components() {
    let report = check("N = 3\ns = x + N\n").unwrap();
    assert!(
        report.message.contains("underspecified"),
        "{}",
        report.message
    );
    assert!(
        !report.message.contains("element chain"),
        "{}",
        report.message
    );
    let report = check("a = 1\na = 2\n").unwrap();
    assert!(
        !report.message.contains("A common cause"),
        "{}",
        report.message
    );
}

#[test]
fn deep_recursion_with_a_base_case_names_the_fixed_limit() {
    let text = "FUNCTION h(n)\n  IF n <= 0 THEN\n    h := 0\n  ELSE\n    h := h(n - 1) + 1\n  END\nEND\ny = h(70)\n";
    let message = solve_err(text);
    assert!(message.contains("This is a fixed limit"), "{message}");
    assert!(
        message.contains("rewrite deep recursion as a FOR loop"),
        "{message}"
    );
    let ok = solve("FUNCTION h(n)\n  IF n <= 0 THEN\n    h := 0\n  ELSE\n    h := h(n - 1) + 1\n  END\nEND\ny = h(50)\n", &SolverSettings::default()).unwrap();
    assert_eq!(ok.values["y"], 50.0);
}

#[test]
fn a_reversed_indexed_sum_is_empty_like_for() {
    let ok = solve(
        "s = Sum(i, 5, 1, i)\np = Product(i, 3, 1, i)\nt = Sum(i, 1, 5, i)\n",
        &SolverSettings::default(),
    )
    .unwrap();
    assert_eq!(ok.values["s"], 0.0);
    assert_eq!(ok.values["p"], 1.0);
    assert_eq!(ok.values["t"], 15.0);
}
