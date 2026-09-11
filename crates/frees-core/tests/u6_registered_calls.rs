use frees_core::{parse_document, Expr, Statement};

#[test]
fn reserved_domain_names_accept_expression_call_syntax() {
    let doc =
        parse_document("answer = plot(model)\nview = table(data)\nlin = linearize(plant)").unwrap();
    let calls = doc
        .statements
        .iter()
        .map(|statement| match statement {
            Statement::Eq(equation) => &equation.rhs,
            other => panic!("expected equation, got {other:?}"),
        })
        .collect::<Vec<_>>();
    assert!(matches!(&*calls[0], Expr::Call { function, .. } if function == "plot"));
    assert!(matches!(&*calls[1], Expr::Call { function, .. } if function == "table"));
    assert!(matches!(&*calls[2], Expr::Call { function, .. } if function == "linearize"));
}
