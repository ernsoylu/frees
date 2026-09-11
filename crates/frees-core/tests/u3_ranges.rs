use frees_core::lexer::tokenize;
use frees_core::parser::parse_document;
use frees_core::token::TokenKind;
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
    let source = "function total(n)\n  total := 0\n  for i = 1:2:n\n    total := total + i\n  end\nend\nanswer = total(5)";
    let solution = solve(source, &SolverSettings::default()).unwrap();
    assert_eq!(solution.values["answer"], 9.0);
}

#[test]
fn a_range_pointing_away_from_its_bound_is_empty() {
    let source = "function total(n)\n  total := 0\n  for i = 5:1:n\n    total := total + i\n  end\nend\nanswer = total(1)";
    let solution = solve(source, &SolverSettings::default()).unwrap();
    assert_eq!(solution.values["answer"], 0.0);
}

#[test]
fn matlab_not_equal_is_accepted_alongside_legacy_not_equal() {
    let tokens = tokenize("x = 1 ~= 2").unwrap();
    assert!(tokens.iter().any(|token| token.kind == TokenKind::Ne));
}

#[test]
fn version_two_documents_reject_legacy_declarations() {
    let error =
        parse_document("// frees-language: 2\nMODULE old(x : y)\n  y = x\nEND").unwrap_err();
    assert!(error.to_string().contains("FREES-MIG-001"));
}
