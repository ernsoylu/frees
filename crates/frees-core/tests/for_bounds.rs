//! FX3a: `FOR i = 1 TO 2.5` ran three times (the bound was rounded) and
//! `FOR i = 3 TO 1` ran 1, 2, 3 (a reversed range counted down). A
//! non-integer bound is now an error and a reversed range runs zero times;
//! a descending loop says so with a step, `FOR i = 3 : -1 : 1`.

use frees_core::{solve, SolverSettings};

fn run(text: &str) -> Result<Vec<(String, f64)>, String> {
    solve(text, &SolverSettings::default())
        .map(|s| s.values.into_iter().collect())
        .map_err(|e| format!("{:?}", e.error))
}

#[test]
fn a_non_integer_bound_is_an_error() {
    let err = run("FOR i = 1 TO 2.5\n  x[i] = i\nEND\n").unwrap_err();
    assert!(
        err.contains("FOR range end must be an integer, got 2.5"),
        "{err}"
    );
}

#[test]
fn a_reversed_range_runs_zero_times() {
    assert_eq!(
        run("n = 1\nFOR i = 3 TO 1\n  y[i] = i\nEND\n").unwrap(),
        [("n".into(), 1.0)]
    );
}

#[test]
fn a_descending_loop_takes_a_negative_step() {
    let values = run("FOR i = 3 : -1 : 1\n  y[i] = 10 * i\nEND\n").unwrap();
    assert_eq!(
        values,
        [
            ("y[1]".into(), 10.0),
            ("y[2]".into(), 20.0),
            ("y[3]".into(), 30.0)
        ]
    );
}

#[test]
fn a_bound_a_rounding_error_off_an_integer_still_counts() {
    let values = run("N = 0.1 * 30\nFOR i = 1 TO N\n  z[i] = i\nEND\n").unwrap();
    assert_eq!(values.len(), 4, "{values:?}");
}

#[test]
fn the_ode_path_follows_the_same_rule() {
    let text = "DYNAMIC d (t = 0 .. 1)\n  FOR i = 2 TO 1\n    der(x[i]) = 1\n  END\n  der(y) = 1\n  y(0) = 0\nEND\n";
    assert!(run(text).is_ok(), "{:?}", run(text));
    let text = "DYNAMIC d (t = 0 .. 1)\n  FOR i = 1 TO 1.5\n    der(x[i]) = 1\n  END\n  x[1](0) = 0\nEND\n";
    let err = run(text).unwrap_err();
    assert!(
        err.contains("FOR range end must be an integer, got 1.5"),
        "{err}"
    );
}

#[test]
fn a_function_body_follows_the_same_rule() {
    let f = "FUNCTION s(n)\n  t := 0\n  FOR i = n TO 1\n    t := t + i\n  END\n  s := t\nEND\n";
    assert_eq!(run(&format!("{f}y = s(3)\n")).unwrap(), [("y".into(), 0.0)]);
    let err = run(&format!("{f}y = s(1.5)\n")).unwrap_err();
    assert!(
        err.contains("FOR range start must be an integer, got 1.5"),
        "{err}"
    );
}
