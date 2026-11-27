//! End-to-end tests for the `Integral` / `GaussIntegral` subsystem.
//!
//! Everything here drives only the public API (`frees_core::solve` /
//! `frees_core::check`), so it exercises exactly what the wasm boundary and the
//! CLI call.
//!
//! The adaptive-Simpson and Gauss–Legendre values are bit-exact Java oracle
//! values (`../frEES` `core` jar, via `tools/golden-dumper/classpath.sh`). The
//! constant-limit stepper is not: FX1e (owner-decided 2026-11-27) replaced the
//! Java Heun predictor–corrector with Dormand–Prince 5(4), so both `Integral`
//! paths give one value, and those cases are graded against closed forms.
//! FX1e also keeps the integration variable out of the solved variables: it
//! is pinned at the upper limit so the system is square, and the rest of the
//! system is reported there, but it is the integral's dummy, not a result.

use frees_core::{check, solve, CheckReport, FreesError, Solution, SolverSettings};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn solved(source: &str) -> Solution {
    solve(source, &SolverSettings::default())
        .unwrap_or_else(|err| panic!("expected {source:?} to solve, got: {err}"))
}

fn failure_message(source: &str) -> String {
    match solve(source, &SolverSettings::default()) {
        Ok(solution) => panic!("expected {source:?} to fail, got {:?}", solution.values),
        Err(failure) => failure.to_string_message(),
    }
}

fn get(solution: &Solution, name: &str) -> f64 {
    *solution.values.get(name).unwrap_or_else(|| {
        panic!(
            "no value for `{name}`; have {:?}",
            solution.values.keys().collect::<Vec<_>>()
        )
    })
}

fn names(solution: &Solution) -> Vec<&str> {
    solution.values.keys().map(String::as_str).collect()
}

fn checked(source: &str) -> CheckReport {
    check(source).unwrap_or_else(|err| panic!("check({source:?}) errored: {err}"))
}

#[track_caller]
fn assert_within(actual: f64, expected: f64, tolerance: f64) {
    assert!(
        (actual - expected).abs() <= tolerance,
        "expected {expected} ± {tolerance}, got {actual} (delta {})",
        actual - expected
    );
}

const PI: f64 = std::f64::consts::PI;

// ---------------------------------------------------------------------------
// Acceptance: the two documents the subsystem exists for
// ---------------------------------------------------------------------------

/// The headline behaviour: the stepping driver runs the sweep and its 5th-order
/// rule is exact on a quadratic (the Java Heun stepper gave
/// 0.33333333600411386). The integration variable is pinned at the upper limit
/// so the document is square, but it is not a result row.
#[test]
fn a_constant_limit_integral_steps_and_keeps_its_integration_variable_out() {
    let solution = solved("F = Integral(t^2, t, 0, 1)\n");
    assert_within(get(&solution, "f"), 1.0 / 3.0, 1e-15);
    assert_eq!(names(&solution), vec!["f"]);
    // A handful of steps, not the Java sweep's 108 139 Newton iterations.
    assert!(
        solution.stats.iterations < 200,
        "{}",
        solution.stats.iterations
    );
}

/// FX1e: the same integral gives one value on both paths, with or without a
/// step. `Integral(t^2, t, 0, 2, 0.5)` gave 2.75 (a fixed Heun step) where the
/// variable-limit form gave 8/3.
#[test]
fn both_integral_paths_agree_whatever_the_step() {
    for step in ["", ", 0.5", ", 0.01"] {
        let stepped = solved(&format!("F = Integral(t^2, t, 0, 2{step})\n"));
        let inlined = solved(&format!("b = 2\nF = Integral(t^2, t, 0, b{step})\n"));
        assert_within(get(&stepped, "f"), 8.0 / 3.0, 1e-12);
        assert_within(get(&inlined, "f"), 8.0 / 3.0, 1e-12);
        assert_eq!(names(&stepped), vec!["f"], "step `{step}`");
        assert_eq!(names(&inlined), vec!["b", "f"], "step `{step}`");
    }
}

/// `GaussIntegral` is the other kind: a bound integration variable, no system
/// coupling, and a rule that is *exact* for a quadratic where the stepper is
/// not — `t` never becomes a result variable.
#[test]
fn gauss_integral_is_exact_and_binds_its_integration_variable() {
    let solution = solved("G = GaussIntegral(t^2, t, 0, 1)\n");
    assert_eq!(get(&solution, "g"), 0.333_333_333_333_333_3); // oracle, bit-exact
    assert_eq!(names(&solution), vec!["g"]);
}

// ---------------------------------------------------------------------------
// Analytic checks
// ---------------------------------------------------------------------------

/// `∫₀^π sin t dt = 2`, through both quadratures (the Java stepper gave
/// 1.9999993342983777).
#[test]
fn the_integral_of_sin_over_a_half_period_is_two() {
    let stepped = solved("f = sin(t)\nQ = Integral(f, t, 0, 3.141592653589793)\n");
    assert_within(get(&stepped, "q"), 2.0, 1e-10);
    // The system is reported at the end of the sweep: t = π, so sin(t) ≈ 0.
    assert!(!names(&stepped).contains(&"t"));
    assert_within(get(&stepped, "f"), PI.sin(), 1e-15);

    let gauss = solved("y = GaussIntegral(sin(x), x, 0, 3.141592653589793)\n");
    assert_eq!(get(&gauss, "y"), 2.000_000_000_001_303); // oracle, bit-exact
    assert_within(get(&gauss, "y"), 2.0, 1e-11);
}

/// A Gauss rule of `n` points integrates polynomials of degree `2n − 1`
/// exactly, and the point count is user-selectable: `∫₀¹ eˣ dx = e − 1` lands
/// on the correctly-rounded double with a 7-point rule.
#[test]
fn gauss_integral_honours_an_explicit_point_count() {
    let solution = solved("y = GaussIntegral(exp(x), x, 0, 1, 7)\n");
    assert_eq!(get(&solution, "y"), std::f64::consts::E - 1.0);
}

/// Reversed limits sweep backwards and negate — the stepper's `direction` is
/// signed. This is *not* an error for `Integral`.
#[test]
fn reversed_limits_negate_the_stepped_integral() {
    let solution = solved("F = Integral(t^2, t, 1, 0)\n");
    assert_within(get(&solution, "f"), -1.0 / 3.0, 1e-15);
    assert_eq!(names(&solution), vec!["f"]);
}

/// The integrand receives the *running total* as well as the point, so
/// `dF/dt = f(t, F)` initial-value problems integrate directly:
/// `dF/dt = −½(F + 1)`, `F(0) = 0` ⇒ `F(2) = e⁻¹ − 1`.
#[test]
fn an_initial_value_problem_integrates_through_the_running_total() {
    let solution = solved("F = Integral(-0.5*(F + 1), t, 0, 2)\n");
    assert_within(
        get(&solution, "f"),
        std::f64::consts::E.recip() - 1.0,
        1e-10,
    );
    assert_eq!(names(&solution), vec!["f"]);
}

/// A positive fifth argument caps the step, which costs more quadrature points
/// for the same answer: an accuracy hint, not a different method.
#[test]
fn a_step_caps_the_step_size() {
    let free = solved("F = Integral(t, t, 0, 2)\n");
    let capped = solved("F = Integral(t, t, 0, 2, 0.01)\n");
    assert_within(get(&free, "f"), 2.0, 1e-14);
    assert_within(get(&capped, "f"), 2.0, 1e-12);
    assert!(capped.stats.iterations > 10 * free.stats.iterations);
}

// ---------------------------------------------------------------------------
// Coupling: the rest of the system is re-solved at every quadrature point
// ---------------------------------------------------------------------------

/// `x = 2t`, so `∫₀¹ x² dt = ∫₀¹ 4t² dt = 4/3` and the final `x` is `2` — the
/// ordinary subsystem is genuinely re-solved with `t` pinned at every step,
/// not evaluated once.
#[test]
fn the_ordinary_subsystem_is_re_solved_at_every_quadrature_point() {
    let solution = solved("x = 2*t\nF = Integral(x^2, t, 0, 1)\n");
    assert_within(get(&solution, "f"), 4.0 / 3.0, 1e-14);
    assert_eq!(get(&solution, "x"), 2.0);
    assert_eq!(names(&solution), vec!["f", "x"]);
}

/// An `Integral` inside a larger expression is hoisted into a synthetic
/// `integral_1` with its own defining equation; the synthetic name is a
/// reported variable, exactly as in the Java.
#[test]
fn a_nested_integral_is_hoisted_into_a_synthetic_variable() {
    let solution = solved("A = 1 + Integral(2*t, t, 0, 1)\n");
    assert_eq!(names(&solution), vec!["a", "integral_1"]);
    assert_within(get(&solution, "integral_1"), 1.0, 1e-15);
    assert_within(get(&solution, "a"), 2.0, 1e-15);
}

/// Two integrals over the same variable pin it **once** — a second pin would
/// make the system overspecified.
#[test]
fn two_integrals_over_one_variable_pin_it_once() {
    let solution = solved("F = Integral(t, t, 0, 1)\nG = Integral(t^2, t, 0, 1)\n");
    assert_eq!(names(&solution), vec!["f", "g"]);
    assert_within(get(&solution, "f"), 0.5, 1e-15);
    assert_within(get(&solution, "g"), 1.0 / 3.0, 1e-15);
}

// ---------------------------------------------------------------------------
// Variable limits: the inlined-quadrature path
// ---------------------------------------------------------------------------

/// `∫₀^b 2t dt = b² = 9` ⇒ `b = 3`. The limit is an unknown, so the integral
/// cannot be stepped: it becomes an ordinary equation the evaluator computes by
/// adaptive Simpson at every Newton residual, and `t` is pinned to the *upper
/// limit expression* rather than to a number.
#[test]
fn a_variable_upper_limit_is_solved_by_the_inlined_quadrature() {
    let solution = solved("F = Integral(2*t, t, 0, b)\nF = 9\n");
    assert_eq!(get(&solution, "b"), 3.0);
    assert_eq!(get(&solution, "f"), 9.0);
    assert_eq!(names(&solution), vec!["b", "f"]);
    // Newton on a closed-form quadrature, not a sweep: single-digit effort.
    assert_eq!(solution.stats.iterations, 4);
}

/// The integrand must be closed-form in the integration variable, so a
/// `t`-dependent variable is replaced by its explicit definition:
/// `g = 3t²` is substituted into `Integral(g, t, 0, b)`, giving `b³ = 8`.
#[test]
fn a_variable_limit_inlines_a_t_dependent_definition() {
    let solution = solved("g = 3 * t^2\nF = Integral(g, t, 0, b)\nF = 8\n");
    assert_eq!(get(&solution, "b"), 2.0);
    assert_eq!(get(&solution, "g"), 12.0); // g at the final t = b = 2
    assert!(!names(&solution).contains(&"t"));
}

/// A variable that does **not** depend on `t` is left standing as a system
/// unknown rather than folded into the integrand.
#[test]
fn a_variable_limit_leaves_t_independent_variables_as_unknowns() {
    let solution = solved("k = 4\nF = Integral(k * t, t, 0, b)\nF = 8\n"); // 2b² = 8
    assert_eq!(get(&solution, "b"), 2.0);
    assert_eq!(get(&solution, "k"), 4.0);
    assert_eq!(names(&solution), vec!["b", "f", "k"]);
}

/// A variable limit works for `GaussIntegral` too, through its own in-place
/// quadrature: `∫₀^b 2x dx = b² = 9`. `x` stays bound and never surfaces.
#[test]
fn gauss_integral_supports_a_variable_limit() {
    let solution = solved("y = GaussIntegral(2*x, x, 0, b)\ny = 9\n");
    assert_eq!(get(&solution, "b"), 3.0);
    assert_eq!(names(&solution), vec!["b", "y"]);
}

/// A user `FUNCTION` in the integrand resolves on **both** paths — the stepper
/// evaluates it against the document's definitions, and the inlined form keeps
/// the call node and evaluates it the same way.
#[test]
fn a_user_function_resolves_inside_both_integral_paths() {
    let stepped = solved("FUNCTION f2(u)\n  f2 := u^2 + 1\nEND\nF = Integral(f2(t), t, 0, 3)\n");
    assert_within(get(&stepped, "f"), 12.0, 1e-13); // ∫₀³ (t²+1) dt = 12

    let inlined =
        solved("FUNCTION f2(u)\n  f2 := u^2 + 1\nEND\nF = Integral(f2(t), t, 0, b)\nF = 12\n");
    assert_eq!(get(&inlined, "b"), 3.0);
    assert_eq!(names(&inlined), vec!["b", "f"]);
}

// ---------------------------------------------------------------------------
// check(): the structural view
// ---------------------------------------------------------------------------

/// `check` never solves, so it cannot know the integral's value — it sees the
/// *structural view*: a `F = 0` placeholder plus the `t` pin, two equations in
/// two unknowns.
#[test]
fn check_accepts_a_constant_limit_integral() {
    let report = checked("F = Integral(t^2, t, 0, 1)\n");
    assert!(report.solvable, "{}", report.message);
    assert_eq!(report.equation_count, 2);
    assert_eq!(report.unknown_count, 2);
    assert_eq!(report.variables, vec!["f", "t"]);
}

#[test]
fn check_accepts_a_coupled_integral_system() {
    let report = checked("f = sin(t)\nQ = Integral(f, t, 0, 1)\n");
    assert!(report.solvable, "{}", report.message);
    assert_eq!(report.equation_count, 3);
    assert_eq!(report.unknown_count, 3);
}

/// A nested integral is hoisted before the structural view is built, so the
/// synthetic variable is counted on both sides of the balance.
#[test]
fn check_accepts_a_nested_integral() {
    let report = checked("y = y0 + Integral(dydt, t, 0, 5)\ndydt = y * cos(t)\ny0 = 1\n");
    assert!(report.solvable, "{}", report.message);
    assert_eq!(report.equation_count, 5);
    assert_eq!(report.unknown_count, 5);
    assert_eq!(report.variables, vec!["dydt", "integral_1", "t", "y", "y0"]);
}

/// `check` reports a `GaussIntegral` document with the integration variable
/// *bound*: one equation, one unknown.
#[test]
fn check_counts_a_gauss_integral_variable_as_bound() {
    let report = checked("G = GaussIntegral(t^2, t, 0, 1)\n");
    assert!(report.solvable, "{}", report.message);
    assert_eq!(report.equation_count, 1);
    assert_eq!(report.unknown_count, 1);
    assert_eq!(report.variables, vec!["g"]);
}

/// Nothing determines `b`: the structural view is two equations in three
/// unknowns and the blocker says so, on both entry points.
#[test]
fn a_free_variable_limit_is_underspecified() {
    let message = failure_message("F = Integral(t, t, 0, b)\n");
    assert!(message.contains("underspecified"), "{message}");

    let report = checked("F = Integral(t, t, 0, b)\n");
    assert!(!report.solvable);
    assert_eq!(report.equation_count, 2);
    assert_eq!(report.unknown_count, 3);
}

// ---------------------------------------------------------------------------
// Error paths
// ---------------------------------------------------------------------------

/// A variable-limit integral cannot be a function of its own result — that
/// would be an implicit ODE the quadrature has no way to close.
#[test]
fn an_integrand_referencing_its_own_result_is_refused() {
    let message = failure_message("F = Integral(F, t, 0, b)\nb = 2\n");
    assert!(
        message.starts_with("An Integral with variable limits cannot reference its own result"),
        "{message}"
    );
    // …and `check` reports it as data, with the counts of the system as it
    // stood when the pass refused.
    let report = checked("F = Integral(F, t, 0, b)\nb = 2\n");
    assert!(!report.solvable);
    assert_eq!(report.equation_count, 2);
    assert_eq!(report.unknown_count, 3);
    assert!(
        report.message.contains("its own result"),
        "{}",
        report.message
    );
}

/// `x` depends on `t` through `x = y + t`, `y = x` — a circular chain with no
/// explicit definition to substitute. The diagnostic names the variable.
#[test]
fn a_circular_t_dependent_chain_is_refused_by_name() {
    let message = failure_message("F = Integral(x, t, 0, b)\nx = y + t\ny = x\nF = 9\n");
    assert!(
        message.contains("'x' depends on the integration variable t"),
        "{message}"
    );
    assert!(message.contains("no explicit definition"), "{message}");
}

#[test]
fn a_malformed_argument_list_is_refused_with_guidance() {
    for (source, expected) in [
        (
            "F = Integral(t^2, t, 0)\n",
            "Integral expects Integral(f, t, lower, upper[, step])",
        ),
        (
            "F = Integral(t^2, 5, 0, 1)\n",
            "The second argument of Integral must be the integration variable",
        ),
        (
            "F = Integral(t^2, t, 0, 1, h)\n",
            "The step size of Integral must be a numeric constant",
        ),
    ] {
        let message = failure_message(source);
        assert!(message.starts_with(expected), "{source:?}: {message}");
        let report = checked(source);
        assert!(!report.solvable, "{source:?}");
        assert!(report.message.starts_with(expected), "{source:?}");
    }
}

/// Apache's `verifyInterval` rejects `lower >= upper`, and the Java engine
/// propagates it. `GaussIntegral` therefore refuses what `Integral` merely
/// negates.
#[test]
fn gauss_integral_refuses_reversed_limits() {
    let message = failure_message("G = GaussIntegral(t^2, t, 1, 0)\n");
    assert!(
        message.contains("endpoints do not specify an interval"),
        "{message}"
    );
}

/// The Java refuses the combination outright rather than expanding an integral
/// the quadrature cannot drive.
#[test]
fn an_integral_in_complex_mode_is_refused() {
    let settings = SolverSettings {
        complex_mode: true,
        ..SolverSettings::default()
    };
    let failure = solve("F = Integral(t, t, 0, 1)\n", &settings)
        .expect_err("complex mode + Integral must be refused");
    assert_eq!(
        failure.to_string_message(),
        "Integral is not supported in complex mode."
    );
    assert!(matches!(failure.error, FreesError::Solver { .. }));
    // A pre-block refusal ships no partial diagnostics, as in Java.
    assert_eq!(failure.failed_block_index, None);
    assert!(failure.partial.is_none());
}

/// Equal limits integrate to zero without running the sweep at all.
#[test]
fn equal_limits_integrate_to_zero() {
    let solution = solved("F = Integral(t^2, t, 1, 1)\nz = 1\n");
    assert_eq!(get(&solution, "f"), 0.0);
    assert_eq!(get(&solution, "z"), 1.0);
    assert_eq!(names(&solution), vec!["f", "z"]);
}

// ---------------------------------------------------------------------------
// The pass must be inert on documents without integrals
// ---------------------------------------------------------------------------

/// `hoist_nested` short-circuits on a document that mentions no `Integral`, and
/// `find_integrals` returns an empty list, so the pipeline is exactly what it
/// was. These are the shapes most likely to be perturbed by a hoisting bug: a
/// dependency chain, a simultaneous block, a `FOR` unroll, a `FUNCTION` call
/// and a `GUESS`-selected root.
#[test]
fn documents_without_integrals_are_unaffected_by_the_pass() {
    let chain = solved("c = b + 1\nb = a * 3\na = 2\n");
    assert_eq!(get(&chain, "a"), 2.0);
    assert_eq!(get(&chain, "b"), 6.0);
    assert_eq!(get(&chain, "c"), 7.0);
    assert_eq!(chain.blocks.len(), 3);

    let simultaneous = solved("u + v = 10\nu - v = 2\n");
    assert_eq!(get(&simultaneous, "u"), 6.0);
    assert_eq!(get(&simultaneous, "v"), 4.0);
    assert_eq!(simultaneous.blocks.len(), 1);

    let loop_doc = solved("FOR i = 1 TO 2\n  a[i] = 5 * i\nEND\nb = a[1] + a[2]\n");
    assert_eq!(get(&loop_doc, "b"), 15.0);

    let function_doc = solved("FUNCTION sq(u)\n  sq := u^2\nEND\ny = sq(3)\n");
    assert_eq!(get(&function_doc, "y"), 9.0);

    assert_eq!(get(&solved("GUESS x = -3\nx ^ 2 = 9\n"), "x"), -3.0);
}

/// A variable merely *named* like the hoisting temporary must not collide with
/// one: the fresh name skips every name the document already uses.
#[test]
fn a_synthetic_name_never_collides_with_a_document_variable() {
    let solution = solved("integral_1 = 4\ny = integral_1 + Integral(t, t, 0, 1, 0.005)\n");
    assert_eq!(get(&solution, "integral_1"), 4.0);
    assert!(
        solution.values.contains_key("integral_2"),
        "have {:?}",
        names(&solution)
    );
    assert_within(get(&solution, "y"), 4.5, 1e-9);
}
