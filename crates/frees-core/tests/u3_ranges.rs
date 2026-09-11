use frees_core::parser::parse_document;
use frees_core::{solve, SolverSettings};

#[test]
fn canonical_for_range_supports_an_explicit_step() {
    let doc = parse_document("FOR i = 1:2:5\n  y[i] = i\nEND").unwrap();
    match &doc.statements[0] {
        frees_core::Statement::For { step, .. } => assert!(step.is_some()),
        other => panic!("expected FOR, got {other:?}"),
    }
}

#[test]
fn canonical_function_loop_uses_the_explicit_step() {
    let source = "function total(n)\n  total := 0\n  for i = 1:2:n\n    total = total + i\n  end\nend\nanswer = total(5)";
    let solution = solve(source, &SolverSettings::default()).unwrap();
    assert_eq!(solution.values["answer"], 9.0);
}

#[test]
fn a_range_pointing_away_from_its_bound_is_empty() {
    let source = "function total(n)\n  total := 0\n  for i = 5:1:n\n    total = total + i\n  end\nend\nanswer = total(1)";
    let solution = solve(source, &SolverSettings::default()).unwrap();
    assert_eq!(solution.values["answer"], 0.0);
}
