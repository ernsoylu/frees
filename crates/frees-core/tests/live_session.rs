//! Phase K1: a live session advanced in chunks produces the batch run's rows,
//! bit for bit — across chunk boundaries, set and stop events, the sparse
//! linear path, a budget that cuts chunks short, and a reset.

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
    let mut doc = PreparedDocument::new(src, &SolverSettings::default(), &[], &[])
        .unwrap_or_else(|e| panic!("{}", e.error));
    doc.open_live(0).unwrap_or_else(|e| panic!("{}", e.error)).1
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
            let mut left = per;
            let mut chunk = session.advance(t, &mut |_| {
                left -= 1;
                left > 0
            });
            assert!(chunk.error.is_none(), "{:?}", chunk.error);
            assert!(
                chunk.rows.len() <= per.max(2),
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

#[test]
fn an_explicit_method_is_refused_with_the_way_out() {
    let src = BOUNCE.replace("method = ida", "method = ode45");
    let mut doc = PreparedDocument::new(&src, &SolverSettings::default(), &[], &[])
        .unwrap_or_else(|e| panic!("{}", e.error));
    let message = doc.open_live(0).err().expect("refused").error.to_string();
    assert!(message.contains("Set its method to ida"), "{message}");
}

#[test]
fn a_block_that_does_not_exist_is_refused() {
    let mut doc = PreparedDocument::new(BOUNCE, &SolverSettings::default(), &[], &[])
        .unwrap_or_else(|e| panic!("{}", e.error));
    let message = doc.open_live(3).err().expect("refused").error.to_string();
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
