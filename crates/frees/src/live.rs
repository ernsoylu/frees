//! Phase K2: the live-session boundary.
//!
//! The worker that owns live mode keeps one [`LiveSession`] here, between
//! calls, and the main thread pulls chunks from it once per animation frame.
//! Each open replaces the session and hands out a new id; every other call
//! names the id it means, and a call for a session that is gone answers
//! `{"gone": true}` rather than acting on the wrong one.
//!
//! The JSON halves are plain functions so the native tests exercise exactly
//! what the browser runs; the `#[wasm_bindgen]` wrappers only move the row
//! buffer into a `Float64Array`.

use std::cell::{Cell, RefCell};

use frees_core::engine::prepared::PreparedDocument;
use frees_core::ode::live::{Chunk, LiveSession};
use serde_json::{json, Value};
use wasm_bindgen::prelude::*;

use crate::settings_of;
use crate::{apply_overrides, function_table_defs_of, now_ms, overrides_of, parse_request};

std::thread_local! {
    static LIVE: RefCell<Option<(u32, LiveSession)>> = const { RefCell::new(None) };
    static NEXT_ID: Cell<u32> = const { Cell::new(1) };
}

/// The most a single chunk may take, whatever the caller asks: commands queued
/// behind a chunk wait at most this long.
const MAX_BUDGET_MS: f64 = 50.0;

/// Open DYNAMIC block `block` (0-based) of `source` live, replacing any open
/// session. The request is the solve request (tolerances, overrides, Function
/// Tables). Answers `{ok, session, table: {name, vars, units, method}}` or
/// `{ok: false, error}`.
pub fn live_open_json(source: &str, request_json: &str, block: u32) -> String {
    LIVE.with(|slot| *slot.borrow_mut() = None);
    let request = match parse_request(request_json) {
        Ok(request) => request,
        Err(message) => return json!({ "ok": false, "error": message }).to_string(),
    };
    let settings = settings_of(&request);
    let overrides = overrides_of(&request);
    let source = apply_overrides(source, request.overrides.as_deref().unwrap_or_default());
    let tables = function_table_defs_of(&request.function_tables);
    let opened = PreparedDocument::new(&source, &settings, &overrides, &tables)
        .and_then(|mut doc| doc.open_live(block as usize));
    let (solution, session) = match opened {
        Ok(opened) => opened,
        Err(failure) => {
            return json!({ "ok": false, "error": failure.error.to_string() }).to_string()
        }
    };
    let vars = session.columns().to_vec();
    // The batch envelope's `odeTables[].units`: the checker's unit per column,
    // the time column in seconds when the checker left it open.
    let units: Vec<&str> = vars
        .iter()
        .enumerate()
        .map(|(i, v)| match solution.inferred_units.get(v.as_str()) {
            Some(unit) => unit.as_str(),
            None if i == 0 => "s",
            None => "",
        })
        .collect();
    let table = session.table(Vec::new(), Vec::new());
    let id = NEXT_ID.with(|n| {
        let id = n.get();
        n.set(id.wrapping_add(1).max(1));
        id
    });
    let header = json!({
        "ok": true,
        "session": id,
        "table": {
            "name": table.name,
            "vars": vars,
            "units": units,
            "method": table.method,
        },
    });
    LIVE.with(|slot| *slot.borrow_mut() = Some((id, session)));
    header.to_string()
}

/// Run `f` on session `id`, or answer `gone` when it is not the open one.
fn with_session(id: u32, f: impl FnOnce(&mut LiveSession) -> Chunk) -> (String, Vec<f64>) {
    LIVE.with(|slot| {
        let mut slot = slot.borrow_mut();
        match slot.as_mut() {
            Some((open, session)) if *open == id => {
                let chunk = f(session);
                chunk_reply(session, chunk)
            }
            _ => (json!({ "gone": true }).to_string(), Vec::new()),
        }
    })
}

/// A chunk as a JSON header plus its rows flattened row-major (`numRows ×
/// numCols`), the batch `odeBuffers` layout.
fn chunk_reply(session: &LiveSession, chunk: Chunk) -> (String, Vec<f64>) {
    let cols = session.columns().len();
    let mut flat = Vec::with_capacity(chunk.rows.len() * cols);
    for row in &chunk.rows {
        flat.extend_from_slice(row);
    }
    let clock = session.clock().map(|(t, h)| json!({ "t": t, "h": h }));
    let header = json!({
        "numRows": chunk.rows.len(),
        "numCols": cols,
        "events": chunk
            .events
            .iter()
            .map(|hit| json!({ "name": hit.name, "time": hit.time }))
            .collect::<Vec<Value>>(),
        "stopped": chunk.stopped,
        "finished": session.finished(),
        "state": chunk.state,
        "clock": clock,
        "error": chunk.error.map(|e| e.to_string()),
    });
    (header.to_string(), flat)
}

/// Integrate session `id` toward `t_target`, for at most `budget_ms` of wall
/// clock (capped at [`MAX_BUDGET_MS`]) once the first row is out.
pub fn live_advance_json(id: u32, t_target: f64, budget_ms: f64) -> (String, Vec<f64>) {
    let budget = if budget_ms.is_finite() {
        budget_ms.clamp(0.0, MAX_BUDGET_MS)
    } else {
        MAX_BUDGET_MS
    };
    let deadline = now_ms() + budget;
    with_session(id, |s| s.advance(t_target, &mut |_| now_ms() < deadline))
}

/// One step of session `id`: `sample` (the next row), `event` (to the next
/// crossing, at most `max_rows` rows) or `accepted` (one internal step).
pub fn live_step_json(id: u32, kind: &str, max_rows: u32) -> (String, Vec<f64>) {
    match kind {
        "sample" => with_session(id, |s| s.step_sample()),
        "event" => with_session(id, |s| s.step_event(max_rows.max(1) as usize)),
        "accepted" => with_session(id, |s| s.step_accepted()),
        other => (
            json!({ "error": format!("unknown live step '{other}': use sample, event or accepted") })
                .to_string(),
            Vec::new(),
        ),
    }
}

/// Back to `t0`; answers the empty chunk, or `gone`.
pub fn live_reset_json(id: u32) -> String {
    with_session(id, |s| {
        s.reset();
        Chunk::default()
    })
    .0
}

/// Drop session `id` if it is the open one.
#[wasm_bindgen]
pub fn live_dispose(id: u32) {
    LIVE.with(|slot| {
        let mut slot = slot.borrow_mut();
        if matches!(slot.as_ref(), Some((open, _)) if *open == id) {
            *slot = None;
        }
    });
}

#[wasm_bindgen]
pub fn live_open(source: &str, request_json: &str, block: u32) -> String {
    live_open_json(source, request_json, block)
}

/// `{header: string, rows: Float64Array}`.
fn typed(reply: (String, Vec<f64>)) -> Result<JsValue, JsValue> {
    let (header, flat) = reply;
    let obj = js_sys::Object::new();
    js_sys::Reflect::set(
        &obj,
        &JsValue::from_str("header"),
        &JsValue::from_str(&header),
    )?;
    let rows = js_sys::Float64Array::new_with_length(flat.len() as u32);
    rows.copy_from(&flat);
    js_sys::Reflect::set(&obj, &JsValue::from_str("rows"), &rows)?;
    Ok(obj.into())
}

#[wasm_bindgen]
pub fn live_advance(id: u32, t_target: f64, budget_ms: f64) -> Result<JsValue, JsValue> {
    typed(live_advance_json(id, t_target, budget_ms))
}

#[wasm_bindgen]
pub fn live_step(id: u32, kind: &str, max_rows: u32) -> Result<JsValue, JsValue> {
    typed(live_step_json(id, kind, max_rows))
}

#[wasm_bindgen]
pub fn live_reset(id: u32) -> String {
    live_reset_json(id)
}
