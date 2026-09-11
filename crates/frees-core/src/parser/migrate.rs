//! Conservative source migration for the versioned language transition.

use crate::diag::{FreesError, Result, Span};

/// Convert legacy forms that have an unambiguous canonical equivalent.
///
/// Module and component blocks are deliberately refused: their equation and
/// port semantics need a model-specific conversion and must not be rewritten
/// into a subtly different function.
pub fn migrate_legacy_source(source: &str) -> Result<String> {
    if source
        .lines()
        .take(8)
        .any(|line| line.contains("frees-language:") && line.contains('2'))
    {
        return Ok(source.to_string());
    }

    let mut output = String::from("// frees-language: 2\n");
    for (line_number, line) in source.lines().enumerate() {
        let trimmed = line.trim_start();
        let indent = &line[..line.len() - trimmed.len()];
        let converted = if starts_keyword(trimmed, "MODULE") {
            return Err(migration_error(
                line_number,
                "MODULE blocks require a model-specific conversion",
            ));
        } else if starts_keyword(trimmed, "COMPONENT") {
            return Err(migration_error(
                line_number,
                "COMPONENT blocks require a port-specific conversion",
            ));
        } else if starts_keyword(trimmed, "FUNCTION") {
            convert_function(trimmed).map(|value| format!("{indent}{value}"))
        } else if starts_keyword(trimmed, "PROCEDURE") {
            convert_procedure(trimmed).map(|value| format!("{indent}{value}"))
        } else if starts_keyword(trimmed, "CALL") {
            convert_call(trimmed).map(|value| format!("{indent}{value}"))
        } else if starts_keyword(trimmed, "GUESS") {
            convert_guess(trimmed).map(|value| format!("{indent}{value}"))
        } else {
            Ok(line.to_string())
        }?;
        output.push_str(&converted);
        output.push('\n');
    }
    if !source.ends_with('\n') {
        output.pop();
    }
    Ok(output)
}

fn starts_keyword(line: &str, keyword: &str) -> bool {
    line.get(..keyword.len())
        .is_some_and(|head| head.eq_ignore_ascii_case(keyword))
        && line
            .as_bytes()
            .get(keyword.len())
            .is_none_or(|byte| byte.is_ascii_whitespace())
}

fn convert_function(line: &str) -> Result<String> {
    let rest = line["FUNCTION".len()..].trim();
    if rest.starts_with('[') {
        return Ok(format!("function {}", rest.to_ascii_lowercase()));
    }
    let open = rest
        .find('(')
        .ok_or_else(|| migration_error(0, "FUNCTION header needs an argument list"))?;
    let name = rest[..open].trim();
    if name.is_empty() || !rest.ends_with(')') {
        return Err(migration_error(0, "FUNCTION header is malformed"));
    }
    Ok(format!(
        "function {} = {}",
        name.to_ascii_lowercase(),
        rest.to_ascii_lowercase()
    ))
}

fn convert_procedure(line: &str) -> Result<String> {
    let rest = line["PROCEDURE".len()..].trim();
    let open = rest
        .find('(')
        .ok_or_else(|| migration_error(0, "PROCEDURE header needs an argument list"))?;
    let close = rest
        .rfind(')')
        .ok_or_else(|| migration_error(0, "PROCEDURE header is malformed"))?;
    let name = rest[..open].trim();
    let signature = &rest[open + 1..close];
    let (inputs, outputs) = signature
        .split_once(':')
        .ok_or_else(|| migration_error(0, "PROCEDURE header needs input and output lists"))?;
    let outputs = outputs.trim();
    if outputs.is_empty() {
        return Err(migration_error(0, "PROCEDURE header needs an output"));
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

fn convert_call(line: &str) -> Result<String> {
    let rest = line["CALL".len()..].trim();
    let open = rest
        .find('(')
        .ok_or_else(|| migration_error(0, "CALL needs an argument list"))?;
    let close = rest
        .rfind(')')
        .ok_or_else(|| migration_error(0, "CALL is malformed"))?;
    let (inputs, outputs) = rest[open + 1..close]
        .split_once(':')
        .ok_or_else(|| migration_error(0, "CALL needs an output list"))?;
    let outputs = outputs.trim();
    if outputs.is_empty() {
        return Err(migration_error(0, "CALL needs an output list"));
    }
    let destination = if outputs.contains(',') {
        format!("[{}]", outputs.to_ascii_lowercase())
    } else {
        outputs.to_ascii_lowercase()
    };
    Ok(format!(
        "{destination} = {}({})",
        rest[..open].trim().to_ascii_lowercase(),
        inputs.trim()
    ))
}

fn convert_guess(line: &str) -> Result<String> {
    let rest = line["GUESS".len()..].trim();
    let (name, value) = rest
        .split_once('=')
        .ok_or_else(|| migration_error(0, "GUESS needs a value"))?;
    let (value, bounds) = match value.trim().split_once('[') {
        Some((value, bounds)) => (value.trim(), Some(bounds.trim_end_matches(']').trim())),
        None => (value.trim(), None),
    };
    let mut result = format!("guess({}, {}", name.trim().to_ascii_lowercase(), value);
    if let Some(bounds) = bounds {
        let (lower, upper) = bounds
            .split_once(',')
            .ok_or_else(|| migration_error(0, "GUESS bounds need lower and upper values"))?;
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
    fn refuses_ambiguous_model_blocks() {
        let error = migrate_legacy_source("COMPONENT Pump(in, out)\nEND").unwrap_err();
        assert!(error.to_string().contains("port-specific conversion"));
    }
}
