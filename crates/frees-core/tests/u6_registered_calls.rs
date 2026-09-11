use frees_core::{parse_document, Expr, Statement};

#[test]
fn reserved_domain_names_accept_expression_call_syntax() {
    let doc = parse_document(
        "answer = plot(model)\nview = table(data)\nstate = state_table(plant)\nlin = linearize(plant)\nruns = sweep(model, values)\ntrajectory = simulate(model)\nreq = require(flow)",
    )
    .unwrap();
    let calls = doc
        .statements
        .iter()
        .map(|statement| match statement {
            Statement::Eq(equation) => &equation.rhs,
            other => panic!("expected equation, got {other:?}"),
        })
        .collect::<Vec<_>>();
    assert!(matches!(calls[0], Expr::Call { function, .. } if function == "plot"));
    assert!(matches!(calls[1], Expr::Call { function, .. } if function == "table"));
    assert!(matches!(calls[2], Expr::Call { function, .. } if function == "state_table"));
    assert!(matches!(calls[3], Expr::Call { function, .. } if function == "linearize"));
    assert!(matches!(calls[4], Expr::Call { function, .. } if function == "sweep"));
    assert!(matches!(calls[5], Expr::Call { function, .. } if function == "simulate"));
    assert!(matches!(calls[6], Expr::Call { function, .. } if function == "require"));
    assert_eq!(doc.registered_calls.len(), 6);
    assert_eq!(doc.registered_calls[0].binding, "answer");
    assert_eq!(doc.registered_calls[0].operation, "plot");
}

#[test]
fn registered_calls_do_not_enter_the_numeric_equation_system() {
    let solution = frees_core::solve(
        "x = 1\nrun = plot(x)",
        &frees_core::SolverSettings::default(),
    )
    .expect("registered presentation calls are run metadata");
    assert_eq!(solution.values["x"], 1.0);
    assert!(!solution.values.contains_key("run"));
    assert_eq!(solution.registered_calls[0].binding, "run");
}
