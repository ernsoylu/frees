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
