//! Render documentation expressions using the engine's existing parser/renderer.
//! Input and output are JSON arrays, streamed through stdin/stdout.
use frees_core::{cas::engine::parse_expression, parser::latex::expr_to_latex};
use std::io;

fn main() {
    let expressions: Vec<String> = serde_json::from_reader(io::stdin()).expect("JSON expressions");
    let rendered: Vec<_> = expressions
        .iter()
        .map(|source| match parse_expression(source) {
            Ok(expr) => serde_json::json!({"latex": expr_to_latex(&expr)}),
            Err(error) => serde_json::json!({"error": error.to_string()}),
        })
        .collect();
    serde_json::to_writer(io::stdout(), &rendered).expect("write rendered expressions");
}
