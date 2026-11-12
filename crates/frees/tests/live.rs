//! Phase K2: the live boundary hands out the batch rows in chunks, and every
//! call names its session, so a stale one is answered `gone`, never acted on.

use frees::live::{
    live_advance_json, live_dispose, live_open_json, live_reset_json, live_set_json,
    live_spectrum_json, live_step_json,
};
use serde_json::Value;

const BALL: &str = "g = 9.81\nk_e = 0.8\n\
DYNAMIC ball (method = ida, time = 0 .. 2, points = 41)\n  \
  der(h) = v\n  \
  der(v) = -g\n  \
  h(0) = 1\n  \
  v(0) = 0\n  \
  EVENT bounce: h = 0 | falling -> set v = -k_e*v\n\
END\n";

fn open(src: &str) -> (u32, Value) {
    let header: Value = serde_json::from_str(&live_open_json(src, "", 0)).unwrap();
    assert_eq!(header["ok"], true, "{header}");
    (header["session"].as_u64().unwrap() as u32, header)
}

fn parse(reply: &(String, Vec<f64>)) -> Value {
    serde_json::from_str(&reply.0).unwrap()
}

#[test]
fn chunks_reassemble_the_batch_table() {
    let batch: Value = serde_json::from_str(&frees::solve(BALL, "")).unwrap();
    let table = &batch["odeTables"][0];
    // The rows themselves come from the core, not from parsing the envelope:
    // serde_json's default float parser can land one ulp off.
    let core = frees_core::solve(BALL, &frees_core::SolverSettings::default())
        .unwrap_or_else(|e| panic!("{}", e.error));
    let expected: Vec<f64> = core.ode_tables[0].rows.iter().flatten().copied().collect();

    let (id, header) = open(BALL);
    assert_eq!(header["table"]["vars"], table["vars"]);
    assert_eq!(header["table"]["units"], table["units"]);
    assert_eq!(header["table"]["method"], table["method"]);
    let mut flat = Vec::new();
    let mut events = Vec::new();
    let mut t: f64 = 0.0;
    while t < 2.0 {
        t += 0.13;
        // A zero budget still moves: one row per chunk at the least.
        loop {
            let reply = live_advance_json(id, t.min(2.0), 0.0);
            let h = parse(&reply);
            assert!(h["error"].is_null(), "{h}");
            assert_eq!(h["numCols"], 3);
            assert_eq!(reply.1.len(), h["numRows"].as_u64().unwrap() as usize * 3);
            events.extend(h["events"].as_array().unwrap().iter().cloned());
            flat.extend_from_slice(&reply.1);
            if h["numRows"] == 0 {
                break;
            }
        }
    }
    assert_eq!(flat, expected);
    assert_eq!(Value::Array(events), table["events"]);
    live_dispose(id);
}

#[test]
fn a_stale_session_is_gone_and_never_acted_on() {
    let (old, _) = open(BALL);
    let (new, _) = open(BALL);
    assert_ne!(old, new);
    assert_eq!(parse(&live_advance_json(old, 1.0, 10.0))["gone"], true);
    assert_eq!(parse(&live_step_json(old, "sample", 1))["gone"], true);
    // The open session was untouched by the stale calls: it starts at t0.
    let first = live_step_json(new, "sample", 1);
    assert_eq!(first.1[0], 0.0);
    live_dispose(old); // not the open one: a no-op
    assert_eq!(parse(&live_step_json(new, "sample", 1))["numRows"], 1);
    live_dispose(new);
    assert_eq!(parse(&live_step_json(new, "sample", 1))["gone"], true);
}

#[test]
fn steps_and_reset() {
    let (id, _) = open(BALL);
    let to_event = parse(&live_step_json(id, "event", 10_000));
    assert_eq!(to_event["events"][0]["name"], "bounce", "{to_event}");
    let accepted = parse(&live_step_json(id, "accepted", 1));
    assert_eq!(accepted["state"].as_array().unwrap().len(), 3, "{accepted}");
    assert!(accepted["clock"]["h"].as_f64().unwrap() > 0.0);
    assert!(parse(&live_step_json(id, "sideways", 1))["error"]
        .as_str()
        .unwrap()
        .contains("use sample, event or accepted"));
    assert_eq!(
        serde_json::from_str::<Value>(&live_reset_json(id)).unwrap()["numRows"],
        0
    );
    let again = live_step_json(id, "sample", 1);
    assert_eq!(again.1[0], 0.0, "reset returns to t0");
    live_dispose(id);
}

#[test]
fn an_explicit_block_runs_live_with_the_batch_states() {
    let src = BALL.replace("method = ida", "method = ode45");
    let core = frees_core::solve(&src, &frees_core::SolverSettings::default())
        .unwrap_or_else(|e| panic!("{}", e.error));
    let table = &core.ode_tables[0];
    let (id, header) = open(&src);
    let cols = header["table"]["vars"].as_array().unwrap().len();
    assert_eq!(cols, table.columns.len());
    let mut rows = Vec::new();
    let mut calls = 0;
    while rows.len() < table.rows.len() * cols {
        // At a zero budget an explicit chunk is one internal step, which may
        // not reach the next row.
        let reply = live_advance_json(id, 2.0, 0.0);
        assert!(parse(&reply)["error"].is_null(), "{}", reply.0);
        rows.extend(reply.1);
        calls += 1;
        assert!(calls < 10_000, "the run makes progress");
    }
    assert!(
        calls > table.rows.len(),
        "zero-budget chunks are single steps: {calls}"
    );
    // Time and the two states h, v are the batch run's bit for bit.
    for (live, batch) in rows.chunks(cols).zip(&table.rows) {
        let bits = |r: &[f64]| r[..3].iter().map(|v| v.to_bits()).collect::<Vec<_>>();
        assert_eq!(bits(live), bits(batch), "t = {}", batch[0]);
    }
    live_dispose(id);
}

#[test]
fn inputs_change_live_in_document_units_and_are_logged() {
    let src = "P = 2 [kW]\nDYNAMIC heat (method = ida, time = 0 .. 10, points = 11)\n  \
  der(T) = (P/1000 - 0.5*(T - 20))/2\n  \
  T(0) = 20\n\
END\n";
    let (id, _) = open(src);
    let to = |t: f64| live_advance_json(id, t, 50.0);
    let rows = to(4.0).1;
    assert_eq!(rows.len(), 5 * 2);
    let set: Value = serde_json::from_str(&live_set_json(id, r#"["P = 3 [kW]"]"#)).unwrap();
    assert_eq!(set["time"], 4.0, "{set}");
    assert_eq!(set["log"][0]["name"], "p");
    assert_eq!(set["log"][0]["value"], 3000.0, "SI value: {set}");
    // T∞ = 20 + 2·3 = 26 from t = 4 on.
    let t10 = to(10.0).1[11];
    let t4 = rows[9];
    let exact = 26.0 + (t4 - 26.0) * (-6.0f64 / 4.0).exp();
    assert!((t10 - exact).abs() < 1e-4, "{t10} vs {exact}");

    let refused: Value = serde_json::from_str(&live_set_json(id, r#"["nope = 1"]"#)).unwrap();
    assert!(
        refused["error"].as_str().unwrap().contains("`nope`"),
        "{refused}"
    );
    let not_literal: Value = serde_json::from_str(&live_set_json(id, r#"["P = 2*x"]"#)).unwrap();
    assert!(not_literal["error"].is_string(), "{not_literal}");
    live_dispose(id);
    assert_eq!(
        serde_json::from_str::<Value>(&live_set_json(id, r#"["P = 1"]"#)).unwrap()["gone"],
        true
    );
}

#[test]
fn a_scope_spectrum_peaks_at_the_signal_frequency() {
    // 5 Hz on a ramp, sampled at 100 Hz for 4 s.
    let fs = 100.0;
    let x: Vec<f64> = (0..400)
        .map(|i| {
            let t = f64::from(i) / fs;
            3.0 * t + (2.0 * std::f64::consts::PI * 5.0 * t).sin()
        })
        .collect();
    let out: Value = serde_json::from_str(&live_spectrum_json(&x, fs, true)).unwrap();
    let freq = out["freq"].as_array().unwrap();
    let power = out["power"].as_array().unwrap();
    assert_eq!(freq.len(), 129, "256-sample segments: {out}");
    let peak = (0..power.len())
        .max_by(|&a, &b| {
            power[a]
                .as_f64()
                .unwrap()
                .total_cmp(&power[b].as_f64().unwrap())
        })
        .unwrap();
    assert!(
        (freq[peak].as_f64().unwrap() - 5.0).abs() <= fs / 256.0,
        "{}",
        freq[peak]
    );
    let refused: Value = serde_json::from_str(&live_spectrum_json(&[1.0], fs, false)).unwrap();
    assert!(refused["error"].is_string(), "{refused}");
}

#[test]
fn a_watch_in_the_request_pauses_the_run_where_it_crosses() {
    let opened: Value = serde_json::from_str(&live_open_json(
        BALL,
        r#"{"liveWatches":["h < 50 [cm]"]}"#,
        0,
    ))
    .unwrap();
    assert_eq!(opened["ok"], true, "{opened}");
    let id = opened["session"].as_u64().unwrap() as u32;
    let chunk = parse(&live_advance_json(id, 2.0, 1e9));
    // Free fall from 1 m reaches 0.5 m at √(0.5/4.905) s.
    assert_eq!(chunk["paused"], "h < 50 [cm]", "{chunk}");
    let hit = chunk["events"]
        .as_array()
        .unwrap()
        .iter()
        .find(|e| e["name"] == "h < 50 [cm]")
        .unwrap();
    assert!(
        (hit["time"].as_f64().unwrap() - (0.5f64 / 4.905).sqrt()).abs() < 1e-4,
        "{hit}"
    );
    // The next chunk carries on past it, to the bounce.
    let next = parse(&live_advance_json(id, 2.0, 1e9));
    assert!(
        next["paused"].is_null() || next["paused"] == "h < 50 [cm]",
        "{next}"
    );
    live_dispose(id);

    let refused: Value =
        serde_json::from_str(&live_open_json(BALL, r#"{"liveWatches":["depth > 1"]}"#, 0)).unwrap();
    assert_eq!(refused["ok"], false);
    assert!(
        refused["error"].as_str().unwrap().contains("`depth`"),
        "{refused}"
    );
}

#[test]
fn the_open_names_the_run_settings_and_its_property_sources() {
    // L5: what a recording carries as its solver settings and provenance.
    let (id, header) = open(BALL);
    let s = &header["settings"];
    assert_eq!(s["method"], "ida");
    assert_eq!(
        (s["t0"].as_f64(), s["tf"].as_f64(), s["points"].as_u64()),
        (Some(0.0), Some(2.0), Some(41))
    );
    assert!(
        s["rtol"].as_f64().unwrap() > 0.0 && s["atol"].as_f64().unwrap() > 0.0,
        "{s}"
    );
    assert!(s["maxStep"].is_null(), "an uncapped IDA run: {s}");
    assert_eq!(header["provenance"]["fluids"], serde_json::json!([]));
    assert!(header["provenance"]["backend"].is_string());
    live_dispose(id);

    // A retry's cap and an explicit block's fixed step are named; so is a fluid.
    let src = BALL.replace("method = ida", "method = rk4, step = 0.01")
        + "rho = Density(Water, T = 300 [K], P = 1e5 [Pa])\n";
    let opened: Value =
        serde_json::from_str(&live_open_json(&src, r#"{"liveMaxStep":0.005}"#, 0)).unwrap();
    assert_eq!(opened["ok"], true, "{opened}");
    let s = &opened["settings"];
    assert_eq!(
        (
            s["method"].as_str(),
            s["step"].as_f64(),
            s["maxStep"].as_f64()
        ),
        (Some("rk4"), Some(0.01), Some(0.005)),
        "{s}"
    );
    assert_eq!(opened["provenance"]["fluids"], serde_json::json!(["Water"]));
    live_dispose(opened["session"].as_u64().unwrap() as u32);
}
