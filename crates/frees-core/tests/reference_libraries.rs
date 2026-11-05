//! Grading the statistics stack against NumPy, SciPy, statsmodels and SALib.
//!
//! `fixtures/stats/reference.json` is written by `tools/stats-ref/gen.py`,
//! which stamps the library versions and the seed into the file. Every case
//! is replayed here on the inputs the generator recorded; the sensitivity
//! groups replay frees' *own* designs, which the generator rebuilds, so SALib
//! grades the estimators rather than a second random draw.
//!
//! # Measured, 2026-10-31 (NumPy 2.5.4, SciPy 1.18.1, statsmodels 0.15.0, SALib 1.6.0)
//!
//! | group | worst | limit | what sets it |
//! |---|---:|---:|---|
//! | distributions, descriptive, tests, regression intrinsics | 3.1e-14 | 1e-12 | round-off |
//! | Bessel intrinsics | 5.6e-8 (`K0`) | 1e-7 | the Numerical Recipes polynomial fits ported from Java |
//! | `poly_fit` | 1.1e-15 | 1e-12 | round-off |
//! | curve-fit parameters, incl. bounded and robust | 9.4e-9 | 2e-8 | the LM and IRLS stopping tolerances (1e-10) |
//! | curve-fit covariance | 3.5e-8 | 1e-7 | the central-difference Jacobian (`h = 1e-8·|p|`) |
//! | curve-fit confidence and prediction bands | 6.6e-10 | 1e-8 | as the parameters |
//! | DFT, convolve, xcorr, windows, detrend, smoothing, `lfilter`, Welch | 1.7e-15 | 1e-12 | round-off |
//! | `filtfilt` against the same zero-state algorithm in SciPy primitives | 1.0e-15 | 1e-12 | round-off |
//! | `filtfilt` against `scipy.signal.filtfilt` | 8.6e-3 | 1e-2 | frees starts both passes from rest; SciPy starts them from `lfilter_zi` |
//! | Sobol' points, all 32 dimensions × 256 rows | bitwise | exact | — |
//! | Sobol' `S1`/`ST` against SALib on the same design | 2.5e-15 | 1e-12 | round-off |
//! | Morris `μ`, `μ*`, `σ` against SALib on the same trajectories | 0 | 1e-12 | — |
//!
//! Three defects surfaced on the way and were fixed at their source: Sobol'
//! dimensions 27–32 carried non-Joe–Kuo direction numbers, `digamma` inherited
//! Apache's sign slip in its asymptotic series (3e-9), and a bounded curve fit
//! stalled 3.5e-3 short of the constrained optimum because the projected LM
//! solved its step as if a pinned parameter could still move. A Cauchy fit
//! also showed the IRLS pass cap returning an unsettled point; the cap rose
//! and now fails loudly instead.
//!
//! SALib standardises `Y` by its global mean before the Saltelli estimator and
//! frees does not, so the Sobol' group subtracts the generator's `centre` in
//! the model. Both are Saltelli 2010 for `S1` and Jansen for `ST`; the centring
//! is the only difference, and on this design it moves `S1` by at most 2.1e-4
//! and `ST` not at all.

use std::collections::BTreeMap;
use std::path::Path;

use frees_core::analysis::curvefit::{fit, CurveFitRequest, Loss};
use frees_core::analysis::distributions::Distribution;
use frees_core::analysis::sampling::{uniform_design, Design, SOBOL_MAX_DIMENSIONS};
use frees_core::analysis::sensitivity::{morris, sobol, InputSpace, MorrisPlan, SobolPlan};
use frees_core::engine::solve_legacy_with_parametric_tables;
use frees_core::signal::{self, Window};
use frees_core::solver::SolverSettings;
use frees_core::statistics::poly_fit;
use serde_json::Value;

fn reference() -> Value {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/stats/reference.json");
    serde_json::from_str(&std::fs::read_to_string(&path).expect("read fixture"))
        .expect("parse fixture")
}

fn floats(v: &Value) -> Vec<f64> {
    v.as_array()
        .expect("array")
        .iter()
        .map(|x| x.as_f64().expect("number"))
        .collect()
}

fn matrix(v: &Value) -> Vec<Vec<f64>> {
    v.as_array().expect("array").iter().map(floats).collect()
}

/// Worst `|got − want|`, relative to the largest `|want|` in the vector — the
/// right scale for transform and band outputs, whose small entries are
/// cancellation residue of the large ones.
fn norm_err(got: &[f64], want: &[f64]) -> f64 {
    assert_eq!(got.len(), want.len(), "length mismatch");
    let scale = want
        .iter()
        .fold(0.0_f64, |m, w| m.max(w.abs()))
        .max(f64::MIN_POSITIVE);
    got.iter()
        .zip(want)
        .map(|(g, w)| (g - w).abs() / scale)
        .fold(0.0, f64::max)
}

fn rel_err(got: f64, want: f64) -> f64 {
    (got - want).abs() / want.abs().max(f64::MIN_POSITIVE)
}

const ROUND_OFF: f64 = 1e-12;
const NR_BESSEL: f64 = 1e-7;
const FIT_PARAMETERS: f64 = 2e-8;
const FD_COVARIANCE: f64 = 1e-7;
const FIT_BANDS: f64 = 1e-8;
/// See the table: the two filtfilts differ in their start-up state, by design.
const FILTFILT_START_STATE: f64 = 1e-2;

fn report(group: &str, worst: f64, limit: f64) {
    eprintln!("{group:<34} worst {worst:.3e} (limit {limit:.0e})");
    assert!(
        worst <= limit,
        "{group}: worst error {worst:.3e} exceeds {limit:.0e}"
    );
}

#[test]
fn scalar_intrinsics_match_scipy_and_statsmodels() {
    let r = reference();
    let cases = r["scalar"].as_array().unwrap();
    let document: String = cases
        .iter()
        .enumerate()
        .map(|(i, c)| format!("c{i} = {}\n", c["expr"].as_str().unwrap()))
        .collect();
    let outcome =
        solve_legacy_with_parametric_tables(&document, &SolverSettings::default(), &[], None, &[])
            .unwrap_or_else(|e| panic!("solve failed: {e}"));
    let values: BTreeMap<String, f64> = outcome.values.into_iter().collect();
    let (mut exact, mut bessel) = (0.0_f64, 0.0_f64);
    for (i, c) in cases.iter().enumerate() {
        let e = rel_err(values[&format!("c{i}")], c["value"].as_f64().unwrap());
        assert!(e.is_finite(), "{}", c["reference"]);
        let slot = if c["expr"].as_str().unwrap().starts_with("bessel") {
            &mut bessel
        } else {
            &mut exact
        };
        *slot = slot.max(e);
    }
    report("scalar intrinsics", exact, ROUND_OFF);
    report("Bessel intrinsics", bessel, NR_BESSEL);
}

#[test]
fn polynomial_fits_match_numpy() {
    let r = reference();
    let mut worst = 0.0_f64;
    for case in r["polyfit"].as_array().unwrap() {
        let got = poly_fit(
            &floats(&case["x"]),
            &floats(&case["y"]),
            case["degree"].as_u64().unwrap() as usize,
        )
        .unwrap();
        worst = worst.max(norm_err(&got, &floats(&case["coefficients"])));
    }
    report("polyfit", worst, ROUND_OFF);
}

#[test]
fn curve_fits_match_scipy_and_statsmodels() {
    let r = reference();
    for case in r["curvefit"].as_array().unwrap() {
        let name = case["name"].as_str().unwrap();
        let model = case["model"].as_str().unwrap();
        let x = vec![floats(&case["x"])];
        let y = floats(&case["y"]);
        let guess = floats(&case["initial_guess"]);
        let sigma = case.get("sigma").map(floats);
        let lower = case.get("lower").map(floats);
        let upper = case.get("upper").map(floats);
        let loss = match case.get("loss").and_then(Value::as_str) {
            None => Loss::Linear,
            Some("soft_l1") => Loss::SoftL1,
            Some("huber") => Loss::Huber,
            Some("cauchy") => Loss::Cauchy,
            Some(other) => panic!("unknown loss {other}"),
        };
        let params: Vec<String> = ["a", "b", "c"].map(String::from).to_vec();
        let xs = vec!["x".to_string()];
        let result = fit(&CurveFitRequest {
            model,
            y_variable: "y",
            x_variables: &xs,
            parameters: &params,
            x_data: &x,
            y_data: &y,
            initial_guess: Some(&guess),
            sigma: sigma.as_deref(),
            lower: lower.as_deref(),
            upper: upper.as_deref(),
            loss,
            f_scale: case.get("f_scale").and_then(Value::as_f64),
            confidence: 0.95,
        })
        .unwrap_or_else(|e| panic!("{name}: {e}"));
        report(
            &format!("{name} parameters"),
            norm_err(&result.fitted_parameters, &floats(&case["parameters_ref"])),
            FIT_PARAMETERS,
        );
        if let Some(cov) = case.get("covariance") {
            let want = matrix(cov);
            let got = &result.parameter_covariance;
            let worst = (0..3)
                .flat_map(|i| (0..3).map(move |j| (i, j)))
                .map(|(i, j)| (got[i][j] - want[i][j]).abs() / (want[i][i] * want[j][j]).sqrt())
                .fold(0.0, f64::max);
            report(&format!("{name} covariance"), worst, FD_COVARIANCE);
            let cb = matrix(&case["confidence_band"]);
            let pb = matrix(&case["prediction_band"]);
            let worst = [
                norm_err(&result.confidence_band_lo, &cb[0]),
                norm_err(&result.confidence_band_hi, &cb[1]),
                norm_err(&result.prediction_band_lo, &pb[0]),
                norm_err(&result.prediction_band_hi, &pb[1]),
            ]
            .into_iter()
            .fold(0.0, f64::max);
            report(&format!("{name} bands"), worst, FIT_BANDS);
        }
    }
}

#[test]
fn signal_kernels_match_numpy_and_scipy() {
    let r = reference();
    let s = &r["signal"];
    for n in [12, 64, 100] {
        let case = &s[format!("dft_{n}")];
        let (re, im) = (floats(&case["re"]), floats(&case["im"]));
        for (inverse, key) in [(false, "forward"), (true, "inverse")] {
            let want = matrix(&case[key]);
            let (gr, gi) = signal::dft(&re, &im, inverse).unwrap();
            let worst = norm_err(&gr, &want[0]).max(norm_err(&gi, &want[1]));
            report(&format!("dft n={n} {key}"), worst, ROUND_OFF);
        }
    }
    let (a, b) = (floats(&s["convolve"]["a"]), floats(&s["convolve"]["b"]));
    report(
        "convolve",
        norm_err(
            &signal::convolve(&a, &b).unwrap(),
            &floats(&s["convolve"]["out"]),
        ),
        ROUND_OFF,
    );
    report(
        "xcorr",
        norm_err(&signal::xcorr(&a, &b).unwrap(), &floats(&s["xcorr"]["out"])),
        ROUND_OFF,
    );

    let mut worst = 0.0_f64;
    for w in s["windows"].as_array().unwrap() {
        let kind = Window::from_name(w["kind"].as_str().unwrap()).unwrap();
        let got = signal::window_weights(
            kind,
            w["n"].as_u64().unwrap() as usize,
            w["periodic"].as_bool().unwrap(),
        );
        worst = worst.max(norm_err(&got, &floats(&w["weights"])));
    }
    report("windows", worst, ROUND_OFF);

    let d = &s["detrend"];
    let y = floats(&d["y"]);
    report(
        "detrend constant",
        norm_err(
            &signal::detrend(&y, false).unwrap(),
            &floats(&d["constant"]),
        ),
        ROUND_OFF,
    );
    report(
        "detrend linear",
        norm_err(&signal::detrend(&y, true).unwrap(), &floats(&d["linear"])),
        ROUND_OFF,
    );

    let m = &s["moving_average"];
    let got = signal::moving_average(&floats(&m["x"]), m["k"].as_u64().unwrap() as usize).unwrap();
    report(
        "moving average",
        norm_err(&got, &floats(&m["out"])),
        ROUND_OFF,
    );

    let f = &s["filter"];
    let (fb, fa, fx) = (floats(&f["b"]), floats(&f["a"]), floats(&f["x"]));
    report(
        "lfilter",
        norm_err(
            &signal::lfilter(&fb, &fa, &fx).unwrap(),
            &floats(&f["lfilter"]),
        ),
        ROUND_OFF,
    );
    let ff = signal::filtfilt(&fb, &fa, &fx).unwrap();
    report(
        "filtfilt (zero-state algorithm)",
        norm_err(&ff, &floats(&f["filtfilt_zero_state"])),
        ROUND_OFF,
    );
    report(
        "filtfilt vs scipy.signal.filtfilt",
        norm_err(&ff, &floats(&f["filtfilt_scipy"])),
        FILTFILT_START_STATE,
    );

    let w = &s["welch"];
    let (freq, pxx) = signal::welch(
        &floats(&w["x"]),
        w["fs"].as_f64().unwrap(),
        w["nperseg"].as_u64().unwrap() as usize,
    )
    .unwrap();
    report("welch f", norm_err(&freq, &floats(&w["f"])), ROUND_OFF);
    report("welch pxx", norm_err(&pxx, &floats(&w["pxx"])), ROUND_OFF);

    let p = &s["peaks"];
    let got = signal::peak_indices(
        &floats(&p["x"]),
        p["min_height"].as_f64().unwrap(),
        p["min_distance"].as_u64().unwrap() as usize,
    );
    let want: Vec<usize> = p["indices"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_u64().unwrap() as usize)
        .collect();
    assert_eq!(got, want, "peak indices");
}

/// frees' Sobol' design is the unscrambled sequence XOR one shift word per
/// dimension, and row 0 of the unscrambled sequence is all zeros — so row 0
/// *is* the shift, and XOR-ing it back off recovers the raw points.
#[test]
fn sobol_points_match_scipy_unscrambled() {
    let r = reference();
    let sp = &r["sobol_points"];
    let dims = sp["dimensions"].as_u64().unwrap() as usize;
    let n = sp["n"].as_u64().unwrap() as usize;
    assert_eq!(
        dims, SOBOL_MAX_DIMENSIONS,
        "fixture covers every dimension frees supports"
    );
    let rows = uniform_design(Design::Sobol, n, dims, 12345).unwrap();
    let bits = |u: f64| (u * 4_294_967_296.0) as u32;
    let shift: Vec<u32> = rows[0].iter().map(|&u| bits(u)).collect();
    for (i, (row, want)) in rows
        .iter()
        .zip(sp["points_u32"].as_array().unwrap())
        .enumerate()
    {
        let got: Vec<u32> = row.iter().zip(&shift).map(|(&u, s)| bits(u) ^ s).collect();
        let want: Vec<u32> = want
            .as_array()
            .unwrap()
            .iter()
            .map(|v| v.as_u64().unwrap() as u32)
            .collect();
        assert_eq!(got, want, "Sobol' row {i}");
    }
}

fn uniform_space(names: &[&str], bounds: &[(f64, f64)]) -> InputSpace {
    InputSpace {
        names: names.iter().map(|s| s.to_string()).collect(),
        marginals: bounds
            .iter()
            .map(|&(lo, hi)| Distribution::Uniform { lo, hi })
            .collect(),
        bounds: vec![(f64::NEG_INFINITY, f64::INFINITY); names.len()],
    }
}

#[test]
fn sobol_indices_match_salib_on_the_same_design() {
    let r = reference();
    let c = &r["sobol_indices"];
    let b = floats(&c["bounds"]);
    let centre = c["centre"].as_f64().unwrap();
    let plan = SobolPlan {
        space: uniform_space(&["x1", "x2", "x3"], &[(b[0], b[1]); 3]),
        base_samples: c["base_samples"].as_u64().unwrap() as usize,
        seed: c["seed"].as_i64().unwrap(),
        design: Design::Sobol,
        bootstrap: 0,
    };
    let ishigami =
        |p: &[f64]| p[0].sin() + 7.0 * p[1].sin().powi(2) + 0.1 * p[2].powi(4) * p[0].sin();
    let (out, _) = sobol(
        &plan,
        |p| Some(BTreeMap::from([("y".to_string(), ishigami(p) - centre)])),
        || false,
    )
    .unwrap();
    let s1: Vec<f64> = out[0].indices.iter().map(|i| i.first_order).collect();
    let st: Vec<f64> = out[0].indices.iter().map(|i| i.total).collect();
    report(
        "sobol S1 vs SALib",
        norm_err(&s1, &floats(&c["s1"])),
        ROUND_OFF,
    );
    report(
        "sobol ST vs SALib",
        norm_err(&st, &floats(&c["st"])),
        ROUND_OFF,
    );
}

#[test]
fn morris_effects_match_salib_on_the_same_trajectories() {
    let r = reference();
    let c = &r["morris"];
    let bounds: Vec<(f64, f64)> = matrix(&c["bounds"]).iter().map(|b| (b[0], b[1])).collect();
    let plan = MorrisPlan {
        space: uniform_space(&["p1", "p2", "p3", "p4"], &bounds),
        trajectories: c["trajectories"].as_u64().unwrap() as usize,
        levels: c["levels"].as_u64().unwrap() as usize,
        seed: c["seed"].as_i64().unwrap(),
    };
    let model = |p: &[f64]| p[0] + 2.0 * p[1] * p[1] + 0.1 * p[0] * p[2] - 3.0 * p[3].sin();
    let (out, _) = morris(
        &plan,
        |p| Some(BTreeMap::from([("y".to_string(), model(p))])),
        || false,
    )
    .unwrap();
    let pick = |f: fn(&frees_core::analysis::sensitivity::MorrisEffect) -> f64| -> Vec<f64> {
        out[0].effects.iter().map(f).collect()
    };
    report(
        "morris mu",
        norm_err(&pick(|e| e.mu), &floats(&c["mu"])),
        ROUND_OFF,
    );
    report(
        "morris mu*",
        norm_err(&pick(|e| e.mu_star), &floats(&c["mu_star"])),
        ROUND_OFF,
    );
    report(
        "morris sigma",
        norm_err(&pick(|e| e.sigma), &floats(&c["sigma"])),
        ROUND_OFF,
    );
}
