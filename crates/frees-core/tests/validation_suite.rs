//! The independent validation suite behind the in-app Verification page
//! (`web/src/docs/verification.md`).
//!
//! Each `fixtures/corpus/validation-*.frees` states a `// BASIS:` — a
//! closed-form derivation, exact arithmetic or a public table — and one
//! `// EXPECT <var> = <value> tol <abs>` (or `// EXPECT-UNC` for a propagated
//! uncertainty) per asserted quantity. The golden parity replay compares these
//! documents against frozen engine output; this test holds them to their
//! *independent* expectation instead, which is the claim the page makes.

use std::path::{Path, PathBuf};

// `solve_legacy`, as the parity replay uses: the corpus is frozen and several
// cases still spell their calls with the legacy `CALL` syntax.
use frees_core::{solve_legacy as solve, SolverSettings};

struct Expectation {
    uncertainty: bool,
    variable: String,
    value: f64,
    tol: f64,
}

fn expectations(path: &Path, source: &str) -> Vec<Expectation> {
    source
        .lines()
        .filter_map(|line| {
            let rest = line.trim().strip_prefix("//")?.trim();
            let (uncertainty, rest) = if let Some(r) = rest.strip_prefix("EXPECT-UNC ") {
                (true, r)
            } else {
                (false, rest.strip_prefix("EXPECT ")?)
            };
            let (lhs, rhs) = rest
                .split_once('=')
                .unwrap_or_else(|| panic!("{}: malformed directive {line:?}", path.display()));
            let (value, tol) = rhs
                .split_once(" tol ")
                .unwrap_or_else(|| panic!("{}: directive without tol {line:?}", path.display()));
            let number = |s: &str| {
                s.trim()
                    .parse::<f64>()
                    .unwrap_or_else(|e| panic!("{}: {e} in {line:?}", path.display()))
            };
            Some(Expectation {
                uncertainty,
                variable: lhs.trim().to_ascii_lowercase(),
                value: number(value),
                tol: number(tol),
            })
        })
        .collect()
}

fn validation_fixtures() -> Vec<PathBuf> {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/corpus");
    let mut paths: Vec<PathBuf> = std::fs::read_dir(&dir)
        .unwrap_or_else(|e| panic!("{}: {e}", dir.display()))
        .map(|entry| entry.expect("readable corpus entry").path())
        .filter(|p| {
            p.file_name()
                .and_then(|n| n.to_str())
                .is_some_and(|n| n.starts_with("validation-") && n.ends_with(".frees"))
        })
        .collect();
    paths.sort();
    paths
}

#[test]
fn every_validation_case_meets_its_independent_expectation() {
    let fixtures = validation_fixtures();
    assert!(!fixtures.is_empty(), "no validation fixtures found");
    let mut failures = Vec::new();
    for path in &fixtures {
        let source = std::fs::read_to_string(path).expect("readable fixture");
        let expected = expectations(path, &source);
        // An unasserted case verifies nothing.
        assert!(
            !expected.is_empty(),
            "{}: no EXPECT directive",
            path.display()
        );
        let solution = match solve(&source, &SolverSettings::default()) {
            Ok(solution) => solution,
            Err(failure) => {
                failures.push(format!("{}: did not solve: {failure:?}", path.display()));
                continue;
            }
        };
        for e in expected {
            let table = if e.uncertainty {
                &solution.uncertainties
            } else {
                &solution.values
            };
            match table.get(&e.variable) {
                Some(&got) if (got - e.value).abs() <= e.tol => {}
                got => failures.push(format!(
                    "{}: {}{} = {got:?}, expected {} ± {}",
                    path.display(),
                    if e.uncertainty { "uncertainty of " } else { "" },
                    e.variable,
                    e.value,
                    e.tol,
                )),
            }
        }
    }
    assert!(failures.is_empty(), "{}", failures.join("\n"));
}
