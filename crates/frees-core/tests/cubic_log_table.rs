//! FX3c: `Interpolate1` fitted its spline in raw space even on an `XLOG YLOG`
//! table, so it disagreed with `Interpolate` on a power law. The spline now
//! runs in the same log10 space as the linear path.

use frees_core::{solve, SolverSettings};

#[test]
fn a_log_log_cubic_lookup_follows_the_power_law() {
    // y = x^2 is a straight line in log-log space, so both rules are exact.
    let text = "TABLE sq(x) XLOG YLOG\n  1     1\n  10    100\n  100   10000\n  1000  1000000\nEND\nyc = Interpolate1('sq', 31.6)\nyl = Interpolate('sq', 31.6)\n";
    let s = solve(text, &SolverSettings::default()).expect("solves");
    let exact = 31.6_f64 * 31.6;
    assert!(
        (s.values["yl"] - exact).abs() < 1e-9 * exact,
        "{}",
        s.values["yl"]
    );
    assert!(
        (s.values["yc"] - exact).abs() < 1e-9 * exact,
        "{}",
        s.values["yc"]
    );
}
