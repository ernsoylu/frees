//! Conservative source migration for the versioned language transition.

use crate::diag::{FreesError, Result, Span};

/// Convert legacy forms that have an unambiguous canonical equivalent.
///
/// Module blocks and nested component declaration blocks are deliberately
/// refused: those semantics need a model-specific conversion.
pub fn migrate_legacy_source(source: &str) -> Result<String> {
    if source
        .lines()
        .take(8)
        .any(|line| line.contains("frees-language:") && line.contains('2'))
    {
        return Ok(source.to_string());
    }

    let mut output = String::from("// frees-language: 2\n");
    let lines: Vec<&str> = source.lines().collect();
    let mut index = 0;
    while index < lines.len() {
        let line_number = index;
        let line = lines[index];
        let trimmed = line.trim_start();
        let indent = &line[..line.len() - trimmed.len()];
        if starts_keyword(trimmed, "COMPONENT") {
            let (converted, next) = convert_simple_component(&lines, index)?;
            output.push_str(indent);
            output.push_str(&converted);
            output.push('\n');
            index = next;
            continue;
        }
        let converted = if starts_keyword(trimmed, "MODULE") {
            return Err(migration_error(
                line_number,
                "MODULE blocks require a model-specific conversion",
            ));
        } else if starts_keyword(trimmed, "FUNCTION") {
            convert_function(trimmed, line_number).map(|value| format!("{indent}{value}"))
        } else if starts_keyword(trimmed, "PROCEDURE") {
            convert_procedure(trimmed, line_number).map(|value| format!("{indent}{value}"))
        } else if starts_keyword(trimmed, "CALL") {
            convert_call(trimmed, line_number).map(|value| format!("{indent}{value}"))
        } else if starts_keyword(trimmed, "GUESS") {
            convert_guess(trimmed, line_number).map(|value| format!("{indent}{value}"))
        } else {
            Ok(line.to_string())
        }?;
        output.push_str(&converted);
        output.push('\n');
        index += 1;
    }
    if !source.ends_with('\n') {
        output.pop();
    }
    Ok(output)
}

fn convert_simple_component(lines: &[&str], start: usize) -> Result<(String, usize)> {
    let header = lines[start].trim_start();
    let rest = header["COMPONENT".len()..].trim();
    let open = rest
        .find('(')
        .ok_or_else(|| migration_error(start, "COMPONENT header needs a port list"))?;
    let close = rest
        .rfind(')')
        .filter(|close| *close > open)
        .ok_or_else(|| migration_error(start, "COMPONENT header is malformed"))?;
    let name = rest[..open].trim();
    let ports = rest[open + 1..close].trim();
    if name.is_empty() || ports.is_empty() {
        return Err(migration_error(
            start,
            "COMPONENT header needs a name and at least one port",
        ));
    }

    let mut params = Vec::new();
    let mut body: Vec<String> = Vec::new();
    let mut nested_blocks = 0usize;
    let mut index = start + 1;
    while index < lines.len() {
        let line = lines[index];
        let trimmed = line.trim();
        if starts_keyword(trimmed, "END") {
            if nested_blocks > 0 {
                body.push(line.trim_end().to_string());
                nested_blocks -= 1;
                index += 1;
                continue;
            }
            let signature = if params.is_empty() {
                format!("function [{ports}] = {name}()")
            } else {
                format!("function [{ports}] = {name}({})", params.join(", "))
            };
            let mut converted = signature;
            for port in ports
                .split(',')
                .map(str::trim)
                .filter(|port| !port.is_empty())
            {
                converted.push_str("\nport(");
                converted.push_str(port);
                converted.push(')');
            }
            for line in body {
                converted.push('\n');
                converted.push_str(&line);
            }
            converted.push('\n');
            converted.push_str("end");
            return Ok((converted, index + 1));
        }
        if starts_keyword(trimmed, "VARIANT") {
            nested_blocks += 1;
            body.push(line.trim_end().to_string());
        } else if starts_keyword(trimmed, "PARAM") {
            let declaration = trimmed["PARAM".len()..].trim();
            if declaration.is_empty() {
                return Err(migration_error(
                    index,
                    "COMPONENT PARAM needs a declaration",
                ));
            }
            params.push(declaration.to_string());
        } else if starts_keyword(trimmed, "COMPONENT") || starts_keyword(trimmed, "SUBSYSTEM") {
            return Err(migration_error(
                index,
                "COMPONENT contains a variant or nested instance and requires a model-specific conversion",
            ));
        } else {
            body.push(line.trim_end().to_string());
        }
        index += 1;
    }
    Err(migration_error(
        start,
        "unterminated COMPONENT block: expected `END`",
    ))
}

fn starts_keyword(line: &str, keyword: &str) -> bool {
    line.get(..keyword.len())
        .is_some_and(|head| head.eq_ignore_ascii_case(keyword))
        && line
            .as_bytes()
            .get(keyword.len())
            .is_none_or(|byte| byte.is_ascii_whitespace())
}

fn convert_function(line: &str, line_number: usize) -> Result<String> {
    let rest = line["FUNCTION".len()..].trim();
    if rest.starts_with('[') {
        return Ok(format!("function {}", rest.to_ascii_lowercase()));
    }
    let open = rest
        .find('(')
        .ok_or_else(|| migration_error(line_number, "FUNCTION header needs an argument list"))?;
    let name = rest[..open].trim();
    if name.is_empty() || !rest.ends_with(')') {
        return Err(migration_error(line_number, "FUNCTION header is malformed"));
    }
    Ok(format!(
        "function {} = {}",
        name.to_ascii_lowercase(),
        rest.to_ascii_lowercase()
    ))
}

fn convert_procedure(line: &str, line_number: usize) -> Result<String> {
    let rest = line["PROCEDURE".len()..].trim();
    let open = rest
        .find('(')
        .ok_or_else(|| migration_error(line_number, "PROCEDURE header needs an argument list"))?;
    let close = rest
        .rfind(')')
        .ok_or_else(|| migration_error(line_number, "PROCEDURE header is malformed"))?;
    let name = rest[..open].trim();
    let signature = &rest[open + 1..close];
    let (inputs, outputs) = signature.split_once(':').ok_or_else(|| {
        migration_error(line_number, "PROCEDURE header needs input and output lists")
    })?;
    let outputs = outputs.trim();
    if outputs.is_empty() {
        return Err(migration_error(
            line_number,
            "PROCEDURE header needs an output",
        ));
    }
    let output = if outputs.contains(',') {
        format!("[{}]", outputs.to_ascii_lowercase())
    } else {
        outputs.to_ascii_lowercase()
    };
    Ok(format!(
        "function {output} = {}({})",
        name.to_ascii_lowercase(),
        inputs.trim().to_ascii_lowercase()
    ))
}

fn convert_call(line: &str, line_number: usize) -> Result<String> {
    let rest = line["CALL".len()..].trim();
    let open = rest
        .find('(')
        .ok_or_else(|| migration_error(line_number, "CALL needs an argument list"))?;
    let close = rest
        .rfind(')')
        .ok_or_else(|| migration_error(line_number, "CALL is malformed"))?;
    let (inputs, outputs) = rest[open + 1..close]
        .split_once(':')
        .ok_or_else(|| migration_error(line_number, "CALL needs an output list"))?;
    let outputs = outputs.trim();
    if outputs.is_empty() {
        return Err(migration_error(line_number, "CALL needs an output list"));
    }
    let outputs = split_top_level_outputs(outputs)
        .into_iter()
        .map(canonical_output_name)
        .collect::<Vec<_>>();
    let destination = if outputs.len() > 1 {
        format!("[{}]", outputs.join(", "))
    } else {
        outputs[0].clone()
    };
    Ok(format!(
        "{destination} = {}({})",
        rest[..open].trim().to_ascii_lowercase(),
        inputs.trim()
    ))
}

fn canonical_output_name(output: &str) -> String {
    output
        .trim()
        .split_once('[')
        .map_or(output.trim(), |(name, _)| name.trim())
        .to_ascii_lowercase()
}

fn split_top_level_outputs(outputs: &str) -> Vec<&str> {
    let mut result = Vec::new();
    let mut start = 0;
    let mut depth: usize = 0;
    for (index, byte) in outputs.bytes().enumerate() {
        match byte {
            b'[' => depth += 1,
            b']' => depth = depth.saturating_sub(1),
            b',' if depth == 0 => {
                result.push(&outputs[start..index]);
                start = index + 1;
            }
            _ => {}
        }
    }
    result.push(&outputs[start..]);
    result
}

fn convert_guess(line: &str, line_number: usize) -> Result<String> {
    let rest = line["GUESS".len()..].trim();
    let (name, value) = rest
        .split_once('=')
        .ok_or_else(|| migration_error(line_number, "GUESS needs a value"))?;
    let (value, bounds) = match value.trim().split_once('[') {
        Some((value, bounds)) => (value.trim(), Some(bounds.trim_end_matches(']').trim())),
        None => (value.trim(), None),
    };
    let mut result = format!("guess({}, {}", name.trim().to_ascii_lowercase(), value);
    if let Some(bounds) = bounds {
        let (lower, upper) = bounds.split_once(',').ok_or_else(|| {
            migration_error(line_number, "GUESS bounds need lower and upper values")
        })?;
        result.push_str(&format!(", lower={}, upper={}", lower.trim(), upper.trim()));
    }
    result.push(')');
    Ok(result)
}

fn migration_error(line: usize, message: &str) -> FreesError {
    FreesError::parse_at(
        format!("migration line {}: {message}", line + 1),
        Span::at(0),
    )
}

#[cfg(test)]
mod tests {
    use super::migrate_legacy_source;
    use crate::parser::parse_document;

    #[test]
    fn converts_unambiguous_legacy_forms_and_adds_version_header() {
        let migrated = migrate_legacy_source(
            "FUNCTION f(x)\n  f := x\nEND\nCALL f(2 : answer)\nGUESS answer = 2 [0, 4]",
        )
        .unwrap();
        assert!(migrated.starts_with("// frees-language: 2\nfunction f = f(x)"));
        assert!(migrated.contains("answer = f(2)"));
        assert!(migrated.contains("guess(answer, 2, lower=0, upper=4)"));
    }

    #[test]
    fn converts_simple_component_blocks() {
        let migrated = migrate_legacy_source(
            "COMPONENT Pump(in, out)\n  PARAM eta = 0.8\n  out.P = in.P / eta\nEND",
        )
        .unwrap();
        assert!(migrated.contains("function [in, out] = Pump(eta = 0.8)\nport(in)\nport(out)"));
        assert!(migrated.contains("out.P = in.P / eta"));
        let doc = parse_document(&migrated).unwrap();
        assert_eq!(doc.components.defs.len(), 1);
        assert_eq!(doc.components.defs[0].params[0].name, "eta");
    }

    #[test]
    fn preserves_component_variants_in_the_unified_form() {
        let migrated = migrate_legacy_source(
            "COMPONENT Pump(in, out)\n  PARAM eta\n  VARIANT basic REQUIRE eta\n    out.P = in.P / eta\n  END\nEND",
        )
        .unwrap();
        assert!(migrated.contains("function [in, out] = Pump(eta)\nport(in)\nport(out)"));
        assert!(migrated.contains("VARIANT basic REQUIRE eta"));
    }

    #[test]
    fn preserves_nested_component_instances() {
        let migrated =
            migrate_legacy_source("COMPONENT Pump(in, out)\n  Valve v(in, out)\nEND").unwrap();
        assert!(migrated.contains("Valve v(in, out)"));
    }

    #[test]
    fn reports_the_source_line_for_unmigratable_syntax() {
        let error = migrate_legacy_source("x = 1\nCALL broken").unwrap_err();
        assert!(error.to_string().contains("migration line 2"));
    }

    #[test]
    fn strips_legacy_output_shape_annotations() {
        let migrated =
            migrate_legacy_source("CALL tf2ss(num, den : A[1:3,1:3], B[1:3], C, D)").unwrap();
        assert!(migrated.contains("[a, b, c, d] = tf2ss(num, den)"));
    }
}
