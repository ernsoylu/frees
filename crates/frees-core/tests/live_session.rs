//! Phase K1: a live session advanced in chunks produces the batch run's rows,
//! bit for bit — across chunk boundaries, set and stop events, the sparse
//! linear path, a budget that cuts chunks short, and a reset. Phase K1b: an
//! explicit block's states match too.

use frees_core::engine::prepared::PreparedDocument;
use frees_core::ode::live::{Chunk, LiveSession};
use frees_core::{solve, SolverSettings};

const BOUNCE: &str = "g = 9.81\nc = 0.05\nk_e = 0.8\n\
DYNAMIC ball (method = ida, time = 0 .. 4, points = 81)\n  \
  der(h) = v\n  \
  der(v) = -g - c*v*abs(v)\n  \
  KE = 0.5*v^2\n  \
  h(0) = 2\n  \
  v(0) = 0\n  \
  EVENT bounce: h = 0 | falling -> set v = -k_e*v\n\
END\n";

const STOP: &str = "DYNAMIC tank (method = ida, time = 0 .. 10, points = 41)\n  \
  der(L) = -0.4*sqrt(max(L, 0))\n  \
  q = 0.4*sqrt(max(L, 0))\n  \
  L(0) = 4\n  \
  EVENT low: L = 1 | falling -> stop\n\
END\n";

/// A 30-node conduction chain: 30 states plus 31 fluxes, past the sparse
/// threshold, so the parked solver carries the sparse LU between chunks.
fn chain() -> String {
    let mut s = String::from("N = 30\nDYNAMIC rod (method = ida, time = 0 .. 50, points = 26)\n");
    s.push_str("  F[1] = 2*(100 - T[1])\n");
    for i in 2..=30 {
        s.push_str(&format!("  F[{i}] = 2*(T[{}] - T[{i}])\n", i - 1));
    }
    s.push_str("  F[31] = 0\n");
    for i in 1..=30 {
        s.push_str(&format!(
            "  der(T[{i}]) = F[{i}] - F[{}]\n  T[{i}](0) = 20\n",
            i + 1
        ));
    }
    s.push_str("END\n");
    s
}

fn batch(src: &str) -> frees_core::ode::problem::OdeTableResult {
    let solution = solve(src, &SolverSettings::default()).unwrap_or_else(|e| panic!("{}", e.error));
    solution.ode_tables[0].clone()
}

fn open(src: &str) -> LiveSession {
    let doc = PreparedDocument::new(src, &SolverSettings::default(), &[], &[])
        .unwrap_or_else(|e| panic!("{}", e.error));
    doc.open_live(0, None)
        .unwrap_or_else(|e| panic!("{}", e.error))
        .1
}

fn bits(rows: &[Vec<f64>]) -> Vec<Vec<u64>> {
    rows.iter()
        .map(|r| r.iter().map(|v| v.to_bits()).collect())
        .collect()
}

/// Runs `session` to `end` in frames of `dt`. Each frame asks for its target
/// again until nothing is left, under a budget of `per` rows a chunk; returns
/// everything the chunks produced.
fn run(session: &mut LiveSession, end: f64, dt: f64, per: usize) -> Chunk {
    let mut all = Chunk::default();
    let mut t = 0.0;
    while !session.finished() && t < end {
        t = (t + dt).min(end);
        loop {
            let mut chunk = session.advance(t, &mut |c| c.rows.len() < per);
            assert!(chunk.error.is_none(), "{:?}", chunk.error);
            // A stop adds its own row; an explicit step can cross two rows.
            assert!(
                chunk.rows.len() <= per.max(2) + usize::from(chunk.stopped),
                "the budget held: {}",
                chunk.rows.len()
            );
            let done = chunk.rows.is_empty();
            all.rows.append(&mut chunk.rows);
            all.events.append(&mut chunk.events);
            all.stopped |= chunk.stopped;
            if done || session.finished() {
                break;
            }
        }
    }
    all
}

/// `tf` is the document's: a stop event ends the batch table early, and the
/// live run finds it, as the batch run did, integrating toward the next row.
fn assert_chunked_matches_batch(src: &str, tf: f64, dt: f64, per: usize) {
    let table = batch(src);
    let mut session = open(src);
    assert_eq!(session.columns(), table.columns.as_slice());
    let all = run(&mut session, tf, dt, per);
    assert_eq!(
        bits(&all.rows),
        bits(&table.rows),
        "rows differ from the batch run"
    );
    assert_eq!(all.events, table.events);
    assert_eq!(all.stopped, table.stopped);
}

#[test]
fn chunked_bounce_matches_batch_bitwise() {
    assert!(
        !batch(BOUNCE).events.is_empty(),
        "the ball must bounce in the span"
    );
    for (dt, per) in [(0.05, 1), (0.13, 2), (0.7, 3), (4.0, 1000)] {
        assert_chunked_matches_batch(BOUNCE, 4.0, dt, per);
    }
}

#[test]
fn chunked_stop_event_matches_batch_bitwise() {
    let table = batch(STOP);
    assert!(table.stopped);
    assert_chunked_matches_batch(STOP, 10.0, 0.3, 2);
    let mut session = open(STOP);
    let _ = run(&mut session, 10.0, 1.0, 1000);
    assert!(session.finished());
    assert!(session.advance(20.0, &mut |_| true).rows.is_empty());
}

#[test]
fn chunked_sparse_chain_matches_batch_bitwise() {
    let src = chain();
    assert_chunked_matches_batch(&src, 50.0, 3.0, 2);
}

#[test]
fn reset_replays_the_same_rows() {
    let mut session = open(BOUNCE);
    let first = run(&mut session, 4.0, 0.2, 5);
    session.reset();
    let again = run(&mut session, 4.0, 0.5, 1000);
    assert_eq!(bits(&first.rows), bits(&again.rows));
    assert_eq!(first.events, again.events);
}

#[test]
fn a_live_run_continues_past_tf_on_the_same_grid() {
    let table = batch(BOUNCE);
    let mut session = open(BOUNCE);
    let mut chunk = session.advance(6.0, &mut |_| true);
    assert!(chunk.error.is_none(), "{:?}", chunk.error);
    assert_eq!(chunk.rows.len(), 121, "rows every 0.05 s from 0 to 6");
    let tail = chunk.rows.split_off(table.rows.len());
    assert_eq!(bits(&chunk.rows), bits(&table.rows));
    assert_eq!(tail.last().unwrap()[0], 6.0);
    let (t, h) = session.clock().unwrap();
    assert!(t >= 6.0 && h > 0.0, "t = {t}, h = {h}");
}

#[test]
fn step_sample_produces_one_row() {
    let mut session = open(BOUNCE);
    assert_eq!(
        session.step_sample().rows.len(),
        2,
        "t0 and the first sample"
    );
    let one = session.step_sample();
    assert_eq!(one.rows.len(), 1);
    assert_eq!(one.rows[0][0], 0.1);
}

/// Phase K1b: an explicit block runs live too. Its time and state columns
/// are the batch run's bit for bit; the auxiliaries come from a separate
/// sampling solve, so they agree to the inner solve's tolerance.
fn assert_explicit_matches_batch(src: &str, states: usize, dt: f64, per: usize) {
    let table = batch(src);
    let mut session = open(src);
    assert_eq!(session.columns(), table.columns.as_slice());
    let tf = table.rows.last().unwrap()[0];
    let all = run(&mut session, tf, dt, per);
    assert_eq!(all.rows.len(), table.rows.len());
    for (live, batch) in all.rows.iter().zip(&table.rows) {
        let bits = |r: &[f64]| r[..=states].iter().map(|v| v.to_bits()).collect::<Vec<_>>();
        assert_eq!(bits(live), bits(batch), "t = {}", batch[0]);
        for (a, b) in live[states + 1..].iter().zip(&batch[states + 1..]) {
            assert!(
                (a - b).abs() <= 1e-6 * (1.0 + b.abs()),
                "t = {}: {a} vs {b}",
                batch[0]
            );
        }
    }
    assert_eq!(all.events, table.events);
}

#[test]
fn explicit_methods_run_live_with_the_batch_states() {
    for method in ["ode45", "ode23s", "rk4"] {
        let src = BOUNCE.replace("method = ida", &format!("method = {method}"));
        assert!(!batch(&src).events.is_empty(), "{method}: the ball bounces");
        for (dt, per) in [(0.05, 1), (0.37, 3), (4.0, 1000)] {
            assert_explicit_matches_batch(&src, 2, dt, per);
        }
    }
}

#[test]
fn an_explicit_live_run_ends_on_its_stop_event() {
    let src = STOP.replace("method = ida", "method = ode45");
    let table = batch(&src);
    assert!(table.stopped);
    let mut session = open(&src);
    let all = run(&mut session, 10.0, 0.5, 2);
    assert!(all.stopped && session.finished());
    assert_eq!(all.events, table.events);
    assert_eq!(
        all.rows.last().unwrap()[0],
        table.end_time,
        "ends on the stop"
    );
    assert!(session.advance(20.0, &mut |_| true).rows.is_empty());
}

#[test]
fn an_explicit_live_run_continues_past_tf_and_resets() {
    let src = BOUNCE.replace("method = ida", "method = ode45");
    let mut session = open(&src);
    // Before the bounces pile up (~5.7 s, where k_e = 0.8 makes them Zeno).
    let chunk = session.advance(5.0, &mut |_| true);
    assert!(chunk.error.is_none(), "{:?}", chunk.error);
    assert_eq!(chunk.rows.len(), 101, "rows every 0.05 s from 0 to 5");
    assert_eq!(chunk.rows.last().unwrap()[0], 5.0);
    let h = chunk.rows.last().unwrap()[1];
    assert!(h.abs() < 0.1, "the ball has nearly settled: h = {h}");
    assert!(
        chunk.events.len() > batch(&src).events.len(),
        "the bounces go on past tf"
    );
    session.reset();
    let again = session.advance(5.0, &mut |_| true);
    assert_eq!(bits(&chunk.rows), bits(&again.rows));
    assert_eq!(chunk.events, again.events);
}

#[test]
fn explicit_accepted_steps_move_forward() {
    let src = BOUNCE.replace("method = ida", "method = ode45");
    let table = batch(&src);
    let mut session = open(&src);
    let (mut rows, mut last_t) = (Vec::new(), -1.0);
    for _ in 0..10_000 {
        if rows.len() >= table.rows.len() {
            break;
        }
        let mut chunk = session.step_accepted();
        assert!(chunk.error.is_none(), "{:?}", chunk.error);
        let state = chunk.state.expect("an accepted step reports its state");
        assert!(state[0] > last_t, "{} after {last_t}", state[0]);
        last_t = state[0];
        rows.append(&mut chunk.rows);
    }
    let rows = &rows[..table.rows.len()];
    assert_eq!(
        rows.iter().map(|r| r[1].to_bits()).collect::<Vec<_>>(),
        table
            .rows
            .iter()
            .map(|r| r[1].to_bits())
            .collect::<Vec<_>>(),
        "one step at a time is still the batch trajectory"
    );
}

#[test]
fn a_block_that_does_not_exist_is_refused() {
    let doc = PreparedDocument::new(BOUNCE, &SolverSettings::default(), &[], &[])
        .unwrap_or_else(|e| panic!("{}", e.error));
    let message = doc
        .open_live(3, None)
        .err()
        .expect("refused")
        .error
        .to_string();
    assert!(message.contains("no block 4"), "{message}");
}

#[test]
fn step_event_stops_at_the_first_bounce() {
    let table = batch(BOUNCE);
    let first = table.events[0].time;
    let mut session = open(BOUNCE);
    let chunk = session.step_event(10_000);
    assert_eq!(chunk.events.len(), 1, "{:?}", chunk.events);
    assert_eq!(chunk.events[0].time.to_bits(), first.to_bits());
    let rows = chunk.rows.len();
    assert_eq!(bits(&chunk.rows), bits(&table.rows[..rows]));
    assert!(chunk.rows.last().unwrap()[0] >= first);
}

#[test]
fn accepted_steps_walk_the_trajectory_within_tolerance() {
    let table = batch(BOUNCE);
    let mut session = open(BOUNCE);
    let mut rows = Vec::new();
    let mut events = Vec::new();
    let mut last_t = 0.0;
    let mut steps = 0;
    while rows.len() < table.rows.len() && steps < 10_000 {
        let mut chunk = session.step_accepted();
        assert!(chunk.error.is_none(), "{:?}", chunk.error);
        let state = chunk.state.expect("an accepted step reports its state");
        assert!(
            state[0] > last_t,
            "time moves forward: {} after {last_t}",
            state[0]
        );
        last_t = state[0];
        rows.append(&mut chunk.rows);
        events.append(&mut chunk.events);
        steps += 1;
    }
    assert!(steps > 81, "steps are internal steps, not rows: {steps}");
    let rows = &rows[..table.rows.len()];
    for (live, batch) in rows.iter().zip(&table.rows) {
        assert_eq!(live[0], batch[0]);
        for (a, b) in live[1..].iter().zip(&batch[1..]) {
            assert!(
                (a - b).abs() <= 1e-3 * (1.0 + b.abs()),
                "t = {}: {a} vs {b}",
                live[0]
            );
        }
    }
    assert_eq!(events.len(), table.events.len());
}

/// K4: a retry caps the step for the session (both paths), and the capped run
/// still reaches the batch trajectory within the integrator's tolerance.
#[test]
fn a_capped_session_never_steps_past_its_cap() {
    for method in ["ida", "ode45"] {
        let src = BOUNCE.replace("method = ida", &format!("method = {method}"));
        let table = batch(&src);
        let doc = PreparedDocument::new(&src, &SolverSettings::default(), &[], &[])
            .unwrap_or_else(|e| panic!("{}", e.error));
        let mut session = doc
            .open_live(0, Some(0.004))
            .unwrap_or_else(|e| panic!("{}", e.error))
            .1;
        let mut largest: f64 = 0.0;
        let mut rows = Vec::new();
        while rows.len() < table.rows.len() {
            let mut chunk = session.step_accepted();
            assert!(chunk.error.is_none(), "{method}: {:?}", chunk.error);
            largest = largest.max(session.clock().unwrap().1);
            rows.append(&mut chunk.rows);
        }
        assert!(largest <= 0.004 * (1.0 + 1e-12), "{method}: step {largest}");
        for (live, batch) in rows.iter().zip(&table.rows) {
            assert!(
                (live[1] - batch[1]).abs() <= 1e-3 * (1.0 + batch[1].abs()),
                "{method} t = {}",
                batch[0]
            );
        }
    }
}

/// Phase L1: a heater with a first-order lag, `T∞ = 20 + 2Q`, `τ = 4 s`.
const HEATER: &str = "Q = 10\n\
DYNAMIC heat (method = ida, time = 0 .. 10, points = 101)\n  \
  der(T) = (Q - 0.5*(T - 20))/2\n  \
  T(0) = 20\n\
END\n";

fn heater(method: &str) -> String {
    HEATER.replace("method = ida", &format!("method = {method}"))
}

/// Advance to the logged time `time` exactly: an IDA change applies at a
/// row, an explicit one at an internal step.
fn reach(session: &mut LiveSession, method: &str, time: f64) -> Vec<Vec<f64>> {
    let mut rows = Vec::new();
    if method == "ida" {
        rows.append(&mut session.advance(time, &mut |_| true).rows);
    } else {
        while session.clock().is_none_or(|(t, _)| t < time) {
            let mut chunk = session.step_accepted();
            assert!(chunk.error.is_none(), "{:?}", chunk.error);
            rows.append(&mut chunk.rows);
        }
    }
    assert!(
        method == "ida" || session.clock().map(|(t, _)| t.to_bits()) == Some(time.to_bits()),
        "the replay reached the logged time"
    );
    rows
}

#[test]
fn an_input_change_follows_the_piecewise_solution() {
    for method in ["ida", "ode45", "rk4"] {
        let mut session = open(&heater(method));
        let mut rows = run(&mut session, 3.0, 0.7, 1000).rows;
        let t1 = session.set_inputs(&[("Q".into(), 50.0)]).unwrap();
        assert!((2.0..=3.5).contains(&t1), "{method}: applied at {t1}");
        rows.extend(run(&mut session, 10.0, 0.7, 1000).rows);
        assert_eq!(rows.len(), 101, "{method}");
        let before = |t: f64| 20.0 + 20.0 * (1.0 - (-t / 4.0).exp());
        let after = |t: f64| 120.0 + (before(t1) - 120.0) * (-(t - t1) / 4.0).exp();
        for row in &rows {
            let (t, temp) = (row[0], row[1]);
            let exact = if t <= t1 { before(t) } else { after(t) };
            assert!(
                (temp - exact).abs() < 2e-4,
                "{method}, t = {t}: {temp} vs {exact}"
            );
        }
        assert_eq!(session.input_log().len(), 1);
        assert_eq!(session.input_log()[0].time, t1);
    }
}

#[test]
fn replaying_the_input_log_reproduces_the_run_bitwise() {
    for method in ["ida", "ode45"] {
        let src = heater(method);
        let mut first = open(&src);
        let mut rows = run(&mut first, 2.0, 0.5, 7).rows;
        first.set_inputs(&[("Q".into(), 50.0)]).unwrap();
        rows.extend(run(&mut first, 5.0, 0.5, 7).rows);
        first.set_inputs(&[("q".into(), 5.0)]).unwrap();
        first.set_inputs(&[("Q".into(), 0.0)]).unwrap();
        rows.extend(run(&mut first, 10.0, 0.5, 7).rows);
        let log = first.input_log().to_vec();
        assert_eq!(log.len(), 3);

        let mut second = open(&src);
        let mut replayed = Vec::new();
        for change in &log {
            replayed.extend(reach(&mut second, method, change.time));
            let at = second
                .set_inputs(&[(change.name.clone(), change.value)])
                .unwrap();
            assert_eq!(at.to_bits(), change.time.to_bits(), "{method}");
        }
        replayed.extend(run(&mut second, 10.0, 0.5, 1000).rows);
        assert_eq!(bits(&replayed), bits(&rows), "{method}");
        assert_eq!(second.input_log(), log.as_slice());
    }
}

#[test]
fn a_refused_input_change_leaves_the_run_unchanged() {
    for method in ["ida", "ode45"] {
        let src = heater(method);
        let table = batch(&src);
        let mut session = open(&src);
        let mut rows = run(&mut session, 4.0, 0.5, 1000).rows;
        let refused = session.set_inputs(&[("Q".into(), f64::NAN)]);
        assert!(refused.is_err(), "{method}: {refused:?}");
        assert!(session.input_log().is_empty());
        rows.extend(run(&mut session, 10.0, 0.5, 1000).rows);
        assert_eq!(bits(&rows), bits(&table.rows), "{method}");
    }
}

#[test]
fn reset_restores_the_opening_inputs() {
    for method in ["ida", "ode45"] {
        let src = heater(method);
        let table = batch(&src);
        let mut session = open(&src);
        run(&mut session, 4.0, 0.5, 1000);
        session.set_inputs(&[("Q".into(), 50.0)]).unwrap();
        run(&mut session, 6.0, 0.5, 1000);
        session.reset();
        assert!(session.input_log().is_empty());
        let rows = run(&mut session, 10.0, 0.5, 1000).rows;
        assert_eq!(bits(&rows), bits(&table.rows), "{method}");
    }
}

/// Phase L4: a tank draining as `L = (2 − 0.2 t)²`, with `q = 0.4·√L`.
const TANK: &str = "DYNAMIC tank (method = ida, time = 0 .. 10, points = 41)\n  \
  der(L) = -0.4*sqrt(max(L, 0))\n  \
  q = 0.4*sqrt(max(L, 0))\n  \
  L(0) = 4\n\
END\n";

/// Runs a watched session to `tf` a frame at a time; the rows, and each
/// pause with its event's time.
fn run_watched(session: &mut LiveSession, tf: f64) -> (Vec<Vec<f64>>, Vec<(String, f64)>) {
    let (mut rows, mut pauses) = (Vec::new(), Vec::new());
    for _ in 0..1000 {
        let chunk = session.advance(tf, &mut |_| true);
        assert!(chunk.error.is_none(), "{:?}", chunk.error);
        if let Some(name) = &chunk.paused {
            let hit = chunk
                .events
                .iter()
                .find(|e| &e.name == name)
                .expect("the pause is an event");
            pauses.push((name.clone(), hit.time));
        }
        rows.extend(chunk.rows);
        if rows.last().is_some_and(|r: &Vec<f64>| r[0] >= tf) {
            break;
        }
    }
    (rows, pauses)
}

#[test]
fn a_watch_pauses_where_it_crosses_and_the_rows_stay_the_batch_rows() {
    for method in ["ida", "ode45", "rk4"] {
        let src = TANK.replace("method = ida", &format!("method = {method}"));
        let table = batch(&src);
        let doc = PreparedDocument::new(&src, &SolverSettings::default(), &[], &[])
            .unwrap_or_else(|e| panic!("{}", e.error));
        let watches = ["L < 2.25".to_string(), "Q < 0.4 [m^3/s]".to_string()];
        let mut session = doc
            .open_live_watching(0, None, &watches)
            .unwrap_or_else(|e| panic!("{}", e.error))
            .1;
        let (rows, pauses) = run_watched(&mut session, 10.0);
        // Each in turn, where the analytic solution crosses (√L = 1.5 at 2.5 s, 1 at 5 s).
        assert_eq!(
            pauses.iter().map(|p| p.0.as_str()).collect::<Vec<_>>(),
            ["L < 2.25", "Q < 0.4 [m^3/s]"],
            "{method}"
        );
        assert!((pauses[0].1 - 2.5).abs() < 1e-3, "{method}: {pauses:?}");
        assert!((pauses[1].1 - 5.0).abs() < 1e-3, "{method}: {pauses:?}");
        // The run is the batch run: IDA bit for bit; an explicit run's time and
        // state bit for bit, its auxiliary within the sampler's solve.
        assert_eq!(rows.len(), table.rows.len(), "{method}");
        if method == "ida" {
            assert_eq!(bits(&rows), bits(&table.rows));
        } else {
            for (live, batch) in rows.iter().zip(&table.rows) {
                assert_eq!(
                    bits(&[live[..2].to_vec()]),
                    bits(&[batch[..2].to_vec()]),
                    "{method}"
                );
                assert!(
                    (live[2] - batch[2]).abs() <= 1e-6 * batch[2].abs().max(1.0),
                    "{method}: {live:?} {batch:?}"
                );
            }
        }
        // A reset rearms the watches.
        session.reset();
        assert_eq!(run_watched(&mut session, 10.0).1.len(), 2, "{method}");
    }
}

#[test]
fn a_watch_across_a_set_event_crosses_at_the_reset_not_before_it() {
    // `v > 0` turns true only at the bounce, where the reset flips `v`. On an
    // explicit method the step ends at the crossing with the reset state, and
    // its interpolant would cross zero before the bounce.
    for method in ["ida", "ode45", "rk4"] {
        let src = BOUNCE.replace("method = ida", &format!("method = {method}"));
        let doc = PreparedDocument::new(&src, &SolverSettings::default(), &[], &[])
            .unwrap_or_else(|e| panic!("{}", e.error));
        let mut session = doc
            .open_live_watching(0, None, &["v > 0".to_string()])
            .unwrap_or_else(|e| panic!("{}", e.error))
            .1;
        let mut bounce = None;
        let mut pause = None;
        for _ in 0..1000 {
            let chunk = session.advance(4.0, &mut |_| true);
            assert!(chunk.error.is_none(), "{:?}", chunk.error);
            for e in &chunk.events {
                match e.name.as_str() {
                    "bounce" => bounce = bounce.or(Some(e.time)),
                    "v > 0" => pause = pause.or(Some(e.time)),
                    _ => {}
                }
            }
            if chunk.paused.is_some() {
                break;
            }
        }
        let (Some(bounce), Some(pause)) = (bounce, pause) else {
            panic!("{method}: bounce {bounce:?}, pause {pause:?}")
        };
        assert!(
            (pause - bounce).abs() <= 1e-9 * bounce,
            "{method}: paused at {pause}, bounced at {bounce}"
        );
    }
}

#[test]
fn two_watches_crossed_in_one_step_pause_in_time_order_one_per_resume() {
    // Both cross in rk4's first 0.1 s step: L = 3.95 at 0.0627 s, 3.94 at
    // 0.0753 s; the later one is written first.
    let src = TANK.replace("method = ida", "method = rk4, step = 0.1");
    let doc = PreparedDocument::new(&src, &SolverSettings::default(), &[], &[])
        .unwrap_or_else(|e| panic!("{}", e.error));
    let watches = ["L < 3.94".to_string(), "L < 3.95".to_string()];
    let mut session = doc
        .open_live_watching(0, None, &watches)
        .unwrap_or_else(|e| panic!("{}", e.error))
        .1;
    let (rows, pauses) = run_watched(&mut session, 10.0);
    assert_eq!(
        pauses.iter().map(|p| p.0.as_str()).collect::<Vec<_>>(),
        ["L < 3.95", "L < 3.94"]
    );
    let at = |l: f64| (2.0 - l.sqrt()) / 0.2;
    assert!((pauses[0].1 - at(3.95)).abs() < 1e-4, "{pauses:?}");
    assert!((pauses[1].1 - at(3.94)).abs() < 1e-4, "{pauses:?}");
    assert_eq!(rows.len(), 41);
    // A reset forgets a held crossing.
    let first = session.advance(10.0, &mut |_| true);
    assert_eq!(first.paused, None);
    session.reset();
    let (_, again) = run_watched(&mut session, 10.0);
    assert_eq!(again.len(), 2);
}

#[test]
fn a_pause_condition_is_parsed_against_the_columns_in_si() {
    use frees_core::ode::live::Watch;
    let columns = ["t", "L", "body$port$T"].map(String::from);
    let w = Watch::parse(" body.port.T >= 60 [C] ", &columns).unwrap();
    assert_eq!(
        (w.name.as_str(), w.column, w.direction),
        ("body.port.T >= 60 [C]", 2, 1)
    );
    assert!((w.threshold - 333.15).abs() < 1e-9);
    assert_eq!(Watch::parse("l < -2", &columns).unwrap().threshold, -2.0);
    for (bad, says) in [
        ("L 2", "needs `>` or `<`"),
        ("x > 1", "not a column"),
        ("L > 1 [zz]", "known unit"),
        ("L > a + 1", "must be a number"),
    ] {
        let e = Watch::parse(bad, &columns).unwrap_err().to_string();
        assert!(e.contains(says), "{bad}: {e}");
    }
    // A watch the block cannot carry fails the open, by name.
    let doc = PreparedDocument::new(TANK, &SolverSettings::default(), &[], &[])
        .unwrap_or_else(|e| panic!("{}", e.error));
    let e = doc
        .open_live_watching(0, None, &["V > 1".into()])
        .err()
        .expect("refused")
        .error
        .to_string();
    assert!(e.contains("`V`"), "{e}");
}

// ── Phase L acceptance ───────────────────────────────────────────────────────
//
// A live input change is checked against a reference built from batch runs
// alone: the document as written up to the change, then the document with the
// new input value, started at the change time from the first run's state
// there. An IDA change applies at a row; `rk4` with its step on the row
// spacing applies at a step that is a row, so both references share the live
// run's grid. (`ode45` applies at an adaptive step between rows; L1's heater
// test checks it against the analytic piecewise solution.)

struct Case {
    name: &'static str,
    /// The document, with `{method}`, `{t0}`, `{points}` and an `{init:x}`
    /// placeholder for each state's initial value.
    template: &'static str,
    /// Input values as the document writes them (`Kp = 2`).
    inputs: &'static [(&'static str, f64)],
    states: &'static [(&'static str, f64)],
    tf: f64,
    points: usize,
    /// When the input changes, and to what.
    at: f64,
    change: (&'static str, f64),
}

const CASES: &[Case] = &[
    Case {
        name: "RC load step",
        template: "Vs = {Vs}\nR = 1000\nRl = {Rl}\nC = 0.001\n\
DYNAMIC rc (method = {method}, time = {t0} .. 10, points = {points})\n  \
  der(v) = (Vs - v)/(R*C) - v/(Rl*C)\n  \
  i_load = v/Rl\n  \
  v(0) = {init:v}\n\
END\n",
        inputs: &[("Vs", 5.0), ("Rl", 2000.0)],
        states: &[("v", 0.0)],
        tf: 10.0,
        points: 101,
        at: 3.0,
        change: ("Rl", 500.0),
    },
    Case {
        name: "thermal load step",
        template: "Q = {Q}\nUA = 5\nCth = 400\nT_a = 20\n\
DYNAMIC wall (method = {method}, time = {t0} .. 600, points = {points})\n  \
  der(T) = (Q - UA*(T - T_a))/Cth\n  \
  q_loss = UA*(T - T_a)\n  \
  T(0) = {init:T}\n  \
  EVENT warm: T = 30 | rising -> record\n  \
  EVENT hot: T = 50 | rising -> record\n\
END\n",
        inputs: &[("Q", 100.0)],
        states: &[("T", 20.0)],
        tf: 600.0,
        points: 121,
        at: 200.0,
        change: ("Q", 300.0),
    },
    Case {
        name: "pressure command",
        template: "p_cmd = {p_cmd}\nKv = 1e-4\nKo = 2e-5\nCh = 1e-6\n\
DYNAMIC vessel (method = {method}, time = {t0} .. 20, points = {points})\n  \
  dp = p_cmd - p\n  \
  q_in = Kv*dp/sqrt(abs(dp) + 1000)\n  \
  q_out = Ko*sqrt(max(p, 0))\n  \
  der(p) = (q_in - q_out)/Ch\n  \
  p(0) = {init:p}\n\
END\n",
        inputs: &[("p_cmd", 300000.0)],
        states: &[("p", 100000.0)],
        tf: 20.0,
        points: 101,
        at: 8.0,
        change: ("p_cmd", 500000.0),
    },
    Case {
        name: "PID gain change",
        template: "Kp = {Kp}\nKi = 0.5\nr = 1\ntau = 3\n\
DYNAMIC loop (method = {method}, time = {t0} .. 30, points = {points})\n  \
  e = r - y\n  \
  u = Kp*e + Ki*I\n  \
  der(I) = e\n  \
  der(y) = (u - y)/tau\n  \
  I(0) = {init:I}\n  \
  y(0) = {init:y}\n\
END\n",
        inputs: &[("Kp", 2.0)],
        states: &[("I", 0.0), ("y", 0.0)],
        tf: 30.0,
        points: 151,
        at: 10.0,
        change: ("Kp", 6.0),
    },
];

impl Case {
    fn dt(&self) -> f64 {
        self.tf / (self.points - 1) as f64
    }

    /// `rk4` steps on the row spacing, so its steps are the rows; the cap is
    /// stated, as the default (span / 100) would differ between the runs.
    fn method_spec(&self, method: &str) -> String {
        if method == "rk4" {
            format!("rk4, step = {0}, maxstep = {0}", self.dt())
        } else {
            method.to_string()
        }
    }

    fn doc(
        &self,
        method: &str,
        t0: f64,
        points: usize,
        inputs: &[(&str, f64)],
        init: &[(String, f64)],
    ) -> String {
        let mut s = self
            .template
            .replace("{method}", &self.method_spec(method))
            .replace("{t0}", &format!("{t0:?}"))
            .replace("{points}", &points.to_string());
        for (name, value) in inputs {
            s = s.replace(&format!("{{{name}}}"), &format!("{value:?}"));
        }
        for (name, value) in init {
            s = s.replace(&format!("{{init:{name}}}"), &format!("{value:?}"));
        }
        s
    }

    fn original(&self, method: &str) -> String {
        let init: Vec<(String, f64)> = self
            .states
            .iter()
            .map(|(n, v)| (n.to_string(), *v))
            .collect();
        self.doc(method, 0.0, self.points, self.inputs, &init)
    }
}

/// Advance a live run to `time` and change the input there; answers the rows
/// so far and the time the change applied at.
fn change_at(
    session: &mut LiveSession,
    method: &str,
    dt: f64,
    time: f64,
    change: (&str, f64),
) -> (Vec<Vec<f64>>, f64) {
    let mut rows = run(session, time, dt * 3.0, 4).rows;
    if method != "ida" {
        // An explicit run applies at its current step; step to the row first.
        while session
            .clock()
            .is_none_or(|(t, _)| t < time - 1e-9 * time.max(1.0))
        {
            rows.append(&mut session.step_accepted().rows);
        }
    }
    let applied = session.set_inputs(&[(change.0.into(), change.1)]).unwrap();
    (rows, applied)
}

#[test]
fn input_changes_match_a_batch_reference_with_piecewise_inputs() {
    for case in CASES {
        for method in ["ida", "rk4"] {
            let src = case.original(method);
            let first = batch(&src);
            let mut session = open(&src);
            let dt = case.dt();
            let (mut rows, t1) = change_at(&mut session, method, dt, case.at, case.change);
            rows.extend(run(&mut session, case.tf, dt * 3.0, 4).rows);
            let label = format!("{}, {method}", case.name);
            assert_eq!(rows.len(), case.points, "{label}");

            // The reference's second run starts at t1 from the first run's
            // state there, with the new input.
            let k = first
                .rows
                .iter()
                .position(|r| (r[0] - t1).abs() <= 1e-9 * case.tf)
                .unwrap_or_else(|| panic!("{label}: t1 = {t1} is a row"));
            let cols = &first.columns;
            let init: Vec<(String, f64)> = case
                .states
                .iter()
                .map(|(n, _)| {
                    (
                        n.to_string(),
                        first.rows[k][cols.iter().position(|c| c.eq_ignore_ascii_case(n)).unwrap()],
                    )
                })
                .collect();
            let mut inputs = case.inputs.to_vec();
            inputs
                .iter_mut()
                .find(|(n, _)| *n == case.change.0)
                .unwrap()
                .1 = case.change.1;
            let second =
                batch(&case.doc(method, first.rows[k][0], case.points - k, &inputs, &init));
            assert_eq!(&second.columns, cols, "{label}");

            // Rows at or before t1 precede the change; an rk4 clock can sit an
            // ulp short of its grid row, which then follows the change.
            let split = rows.iter().take_while(|r| r[0] <= t1).count();
            // Before it the live rows are the batch rows: bit for bit on IDA;
            // on an explicit method time and states are, and auxiliaries
            // agree to the inner solve's tolerance (K1b).
            let exact = if method == "ida" {
                cols.len()
            } else {
                1 + case.states.len()
            };
            let head = |r: &[Vec<f64>]| {
                r.iter()
                    .map(|row| row[..exact].to_vec())
                    .collect::<Vec<_>>()
            };
            assert_eq!(
                bits(&head(&rows[..split])),
                bits(&head(&first.rows[..split])),
                "{label}: before the change"
            );
            for (live, batch) in rows[..split].iter().zip(&first.rows) {
                for (a, b) in live.iter().zip(batch).skip(exact) {
                    assert!(
                        (a - b).abs() <= 1e-6 * b.abs().max(1.0),
                        "{label}: t = {}: {a} vs {b}",
                        live[0]
                    );
                }
            }
            // After it they are the second run's, every column, each measured
            // against its own range over the run: a small difference of large
            // values (the loop error `e = r - y`) is not a large relative one.
            let scale: Vec<f64> = (0..cols.len())
                .map(|c| second.rows.iter().map(|r| r[c].abs()).fold(1e-12, f64::max))
                .collect();
            let mut worst = 0.0f64;
            for (live, reference) in rows[split..].iter().zip(&second.rows[split - k..]) {
                assert!(
                    (live[0] - reference[0]).abs() <= 1e-9 * case.tf,
                    "{label}: t {} vs {}",
                    live[0],
                    reference[0]
                );
                for (c, (a, b)) in live.iter().zip(reference).enumerate().skip(1) {
                    worst = worst.max((a - b).abs() / scale[c]);
                }
            }
            // Both runs integrate at the default rtol = 1e-6 with their own
            // step histories, so they agree to the tolerance, not the bit.
            println!("{label}: worst relative difference {worst:.2e}");
            assert!(worst < 1e-5, "{label}: worst relative difference {worst:e}");

            // Events: the first run's up to the change, then the second's; none twice, none lost.
            let mut expected: Vec<_> = first
                .events
                .iter()
                .filter(|e| e.time <= t1)
                .cloned()
                .collect();
            expected.extend(second.events.iter().filter(|e| e.time > t1).cloned());
            if case.name == "thermal load step" {
                // `warm` crosses before the change; `hot` only after it.
                let names: Vec<&str> = expected.iter().map(|e| e.name.as_str()).collect();
                assert_eq!(names, ["warm", "hot"], "{label}");
            }
            let live_events = run_events(&case.original(method), method, dt, case);
            assert_eq!(
                live_events.len(),
                expected.len(),
                "{label}: {live_events:?} vs {expected:?}"
            );
            for (a, b) in live_events.iter().zip(&expected) {
                assert_eq!(a.name, b.name, "{label}");
                assert!(
                    (a.time - b.time).abs() < 1e-6 * case.tf,
                    "{label}: {} at {} vs {}",
                    a.name,
                    a.time,
                    b.time
                );
            }
        }
    }
}

/// The events of a live run with the case's change, collected chunk by chunk.
fn run_events(
    src: &str,
    method: &str,
    dt: f64,
    case: &Case,
) -> Vec<frees_core::ode::problem::TableEventHit> {
    let mut session = open(src);
    let mut events = run(&mut session, case.at, dt * 3.0, 4).events;
    if method != "ida" {
        while session
            .clock()
            .is_none_or(|(t, _)| t < case.at - 1e-9 * case.at)
        {
            events.append(&mut session.step_accepted().events);
        }
    }
    session
        .set_inputs(&[(case.change.0.into(), case.change.1)])
        .unwrap();
    events.extend(run(&mut session, case.tf, dt * 3.0, 4).events);
    events
}

#[test]
fn a_refused_change_on_a_dae_keeps_a_consistent_state() {
    // The PID loop carries algebraic `e` and `u`; a refused gain leaves the
    // run the batch run, and a later accepted one still matches its reference.
    let case = &CASES[3];
    for method in ["ida", "ode45"] {
        let src = case.original(method);
        let table = batch(&src);
        let mut session = open(&src);
        let mut rows = run(&mut session, 6.0, 0.5, 3).rows;
        for bad in [f64::NAN, f64::INFINITY] {
            assert!(
                session.set_inputs(&[("Kp".into(), bad)]).is_err(),
                "{method}"
            );
        }
        assert!(
            session.set_inputs(&[("nope".into(), 1.0)]).is_err(),
            "{method}"
        );
        assert!(session.input_log().is_empty(), "{method}");
        rows.extend(run(&mut session, case.tf, 0.5, 3).rows);
        assert_eq!(bits(&rows), bits(&table.rows), "{method}");
    }
}

#[test]
fn rapid_changes_keep_the_log_ordered_and_replay_bitwise() {
    // Thirty gain changes, several at the same row or step, as a fast slider
    // drag sends them between chunks.
    let case = &CASES[3];
    for method in ["ida", "ode45"] {
        let src = case.original(method);
        let mut first = open(&src);
        let mut rows = Vec::new();
        for i in 0..30 {
            if i % 3 != 2 {
                rows.extend(run(&mut first, 0.8 * (i + 1) as f64, 0.4, 2).rows);
            }
            first
                .set_inputs(&[("Kp".into(), 1.0 + (i % 7) as f64)])
                .unwrap();
        }
        rows.extend(run(&mut first, case.tf, 0.4, 2).rows);
        let log = first.input_log().to_vec();
        assert_eq!(log.len(), 30, "{method}");
        assert!(
            log.windows(2).all(|w| w[0].time <= w[1].time),
            "{method}: the log is in time order"
        );
        assert!(
            log.windows(2).any(|w| w[0].time == w[1].time),
            "{method}: some changes share a time"
        );

        let mut second = open(&src);
        let mut replayed = Vec::new();
        for change in &log {
            replayed.extend(reach(&mut second, method, change.time));
            let at = second
                .set_inputs(&[(change.name.clone(), change.value)])
                .unwrap();
            assert_eq!(at.to_bits(), change.time.to_bits(), "{method}");
        }
        replayed.extend(run(&mut second, case.tf, 0.4, 1000).rows);
        assert_eq!(bits(&replayed), bits(&rows), "{method}");
    }
}

#[test]
fn a_logged_run_scheduled_as_a_timeline_replays_bitwise() {
    // Phase M2: a shared experiment is the input log, scheduled on a fresh
    // open. An explicit change lands at an internal step's end, between rows;
    // the replay must apply it there, not at the next row.
    for method in ["ida", "ode45", "rk4"] {
        let src = heater(method);
        let mut first = open(&src);
        let mut rows = run(&mut first, 2.0, 0.37, 7).rows;
        first.set_inputs(&[("Q".into(), 50.0)]).unwrap();
        rows.extend(run(&mut first, 5.3, 0.37, 7).rows);
        first.set_inputs(&[("Q".into(), 0.0)]).unwrap();
        rows.extend(run(&mut first, 10.0, 0.37, 7).rows);
        let log = first.input_log().to_vec();
        let mut second = open(&src);
        second.schedule(
            log.iter()
                .map(|c| (c.time, vec![(c.name.clone(), c.value)]))
                .collect(),
        );
        let replayed = run(&mut second, 10.0, 10.0, 1000).rows;
        let times: Vec<u64> = second
            .input_log()
            .iter()
            .map(|c| c.time.to_bits())
            .collect();
        assert_eq!(
            times,
            log.iter().map(|c| c.time.to_bits()).collect::<Vec<_>>(),
            "{method}"
        );
        assert_eq!(bits(&replayed), bits(&rows), "{method}");
    }
}

#[test]
fn a_timeline_applies_at_its_rows_at_any_frame_budget_and_replays_after_a_reset() {
    // Phase M1: Q 10 → 50 W at 3 s, then 0 at 6.05 s (on the row at 6.1 s).
    for method in ["ida", "ode45", "rk4"] {
        let mut session = open(&heater(method));
        session.schedule(vec![
            (6.05, vec![("Q".into(), 0.0)]),
            (3.0, vec![("Q".into(), 50.0)]),
        ]);
        let whole = run(&mut session, 10.0, 10.0, 1000).rows;
        let log: Vec<(f64, f64)> = session
            .input_log()
            .iter()
            .map(|c| (c.time, c.value))
            .collect();
        assert_eq!(whole.len(), 101, "{method}");
        assert_eq!(
            log.iter().map(|c| c.1).collect::<Vec<_>>(),
            [50.0, 0.0],
            "{method}"
        );
        // At the row on IDA; on an explicit method at the end of the first
        // internal step at or after the change's own time (M2).
        for ((t, _), (at, row)) in log.iter().zip([(3.0, 3.0), (6.05, 6.1)]) {
            if method == "ida" {
                assert!((t - row).abs() < 1e-12, "{method}: {t}");
            } else {
                assert!(*t >= at && *t < at + 0.1, "{method}: applied at {t}");
            }
        }
        let (t1, t2) = (log[0].0, log[1].0);
        let first = |t: f64| 20.0 + 20.0 * (1.0 - (-t / 4.0).exp());
        let second = |t: f64| 120.0 + (first(t1) - 120.0) * (-(t - t1) / 4.0).exp();
        let third = |t: f64| 20.0 + (second(t2) - 20.0) * (-(t - t2) / 4.0).exp();
        for row in &whole {
            let (t, temp) = (row[0], row[1]);
            let exact = if t <= t1 {
                first(t)
            } else if t <= t2 {
                second(t)
            } else {
                third(t)
            };
            assert!(
                (temp - exact).abs() < 2e-4,
                "{method}, t = {t}: {temp} vs {exact}"
            );
        }
        // Small frames and two-row chunks, after a reset: the same run.
        session.reset();
        let framed = run(&mut session, 10.0, 0.13, 2).rows;
        assert_eq!(bits(&framed), bits(&whole), "{method}");
        let again: Vec<(f64, f64)> = session
            .input_log()
            .iter()
            .map(|c| (c.time, c.value))
            .collect();
        assert_eq!(again, log, "{method}");
    }
}
