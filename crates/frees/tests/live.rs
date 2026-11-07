//! Phase K2: the live boundary hands out the batch rows in chunks, and every
//! call names its session, so a stale one is answered `gone`, never acted on.

use frees::live::{
    live_advance_json, live_dispose, live_open_json, live_reset_json, live_step_json,
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
fn an_explicit_block_opens_with_the_reason_it_cannot_run_live() {
    let src = BALL.replace("method = ida", "method = ode45");
    let header: Value = serde_json::from_str(&live_open_json(&src, "", 0)).unwrap();
    assert_eq!(header["ok"], false);
    assert!(
        header["error"]
            .as_str()
            .unwrap()
            .contains("Set its method to ida"),
        "{header}"
    );
}
