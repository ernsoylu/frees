//! U0 golden probes for legacy behavior that the unified language must preserve
//! or diagnose during migration.

use frees_core::eval::Scope;
use frees_core::parser::{parse_document, parse_legacy_document};
use frees_core::procedures::{call_function, call_proc_output};

fn function_value(source: &str, name: &str, args: &[f64], scope: &Scope) -> f64 {
    let doc = parse_legacy_document(source).expect("legacy compatibility fixture parses");
    call_function(
        doc.defs.function(name).expect("fixture function exists"),
        args,
        &doc.defs,
        scope,
    )
    .expect("legacy compatibility fixture evaluates")
}

#[test]
fn descending_for_is_inclusive_and_implicit_reverse() {
    let source =
        "FUNCTION total(n)\n  total := 0\n  FOR i = n TO 1\n    total = total + i\n  END\nEND";
    assert_eq!(
        function_value(source, "total", &[3.0], &Scope::default()),
        6.0
    );
}

#[test]
fn legacy_function_can_read_caller_scope() {
    let source = "FUNCTION add_bias(x)\n  add_bias := x + bias\nEND";
    let mut caller = Scope::default();
    caller.insert("bias".into(), 4.0);
    assert_eq!(function_value(source, "add_bias", &[2.0], &caller), 6.0);
}

#[test]
fn equation_without_a_variable_side_is_ignored_in_legacy_function() {
    let source = "FUNCTION identity(x)\n  2 * x = 99\n  identity := x\nEND";
    assert_eq!(
        function_value(source, "identity", &[7.0], &Scope::default()),
        7.0
    );
}

#[test]
fn each_legacy_procedure_output_reexecutes_the_body_and_selects_its_slot() {
    let source = "PROCEDURE split(a : low, high)\n  low := a - 1\n  high := a + 1\nEND";
    let doc = parse_legacy_document(source).expect("legacy procedure parses");
    let scope = Scope::default();
    assert_eq!(
        call_proc_output("proc$split$0", &[10.0], &doc.defs, &scope).unwrap(),
        9.0
    );
    assert_eq!(
        call_proc_output("proc$split$1", &[10.0], &doc.defs, &scope).unwrap(),
        11.0
    );
}

#[test]
fn canonical_parser_requires_the_explicit_legacy_import_boundary() {
    let source = "PROCEDURE split(a : low)\n  low := a\nEND";
    let versioned = format!("// frees-language: 2\n{source}");
    assert!(parse_document(&versioned)
        .unwrap_err()
        .to_string()
        .contains("FREES-MIG-001"));
    assert!(parse_legacy_document(source).is_ok());
}
