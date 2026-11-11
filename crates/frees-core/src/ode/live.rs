//! Phase K1: a transient that can be advanced a chunk at a time.
//!
//! [`IdaRun`] is the IDA output loop of a `DYNAMIC` block, holding as owned
//! state everything the loop used to keep in locals: the integrator's BDF
//! history, step size, Jacobian and root state ([`IdaDaeSolver::parked`]), the
//! grid position and whether a stop event has ended the run. The batch solve is
//! one call that runs the whole grid (`DynamicSolver::solve_with_ida`); a live
//! session makes the same calls in pieces. Both go through
//! [`IdaRun::advance`], so the rows a chunked run produces are the batch rows,
//! bit for bit.
//!
//! The run borrows nothing between calls. Its residual borrows the document
//! definitions, so each chunk rebuilds it from the owned [`AssemblySpec`] and
//! rebinds the parked solver to it. The residual is a pure function of the
//! spec, so the rebuilt one is the same function. That is also where a live
//! pin change will enter (Phase L): through the spec's analytic values, at a
//! chunk boundary.
//!
//! [`LiveSession`] owns the definitions and one run, and is what the boundary
//! keeps between requests.

use crate::dae::assembly::{assemble, dae_values, AssemblySpec, DaeAssembly};
use crate::dae::solver::{IdaDaeSolver, Step, IDA_YA_YDP_INIT};
use crate::diag::{FreesError, Result};
use crate::engine::{pinned_solver, VarSpec};
use crate::eval::Scope;
use crate::eval::{eval_with, EvalContext};
use crate::ode::dynamic::{DynamicSolver, DynamicSystem, ParkedDynamic};
use crate::ode::events::EventBinding;
use crate::ode::integrator::{ExplicitStepper, Knots};
use crate::ode::problem::DEFAULT_SAMPLE_COUNT;
use crate::ode::problem::{OdeTableResult, TableEventHit};
use crate::parser::defs::Definitions;
use crate::solver::newton::SolverSettings;
use std::collections::BTreeMap;

/// Row `i` of `linspace(t0, tf, points)`, continued past `tf` with the same
/// formula, so every row a batch run has sits at the identical time.
pub(crate) fn grid_time((t0, tf, points): (f64, f64, usize), i: usize) -> f64 {
    t0 + (tf - t0) * i as f64 / (points - 1) as f64
}

// ponytail: a live run is capped at 2³¹ rows (25 days of 1 ms rows, 68 years
// of 1 s ones): a 32-bit wasm index, with room to step.
const ROW_CAP: usize = 1 << 31;

/// The last grid row at or before `t`: the row [`grid_time`] puts there,
/// found from the spacing and then corrected for rounding.
fn grid_last_row(t0: f64, tf: f64, points: usize, t: f64) -> usize {
    let per = (points - 1) as f64 / (tf - t0);
    let guess = ((t - t0) * per).floor();
    if guess.is_nan() || guess < 0.0 {
        return 0;
    }
    let mut k = (guess as usize).min(ROW_CAP);
    while k > 0 && grid_time((t0, tf, points), k) > t {
        k -= 1;
    }
    while k < ROW_CAP && grid_time((t0, tf, points), k + 1) <= t {
        k += 1;
    }
    k
}

/// What one call to [`IdaRun::advance`] produced.
#[derive(Debug, Default)]
pub struct Chunk {
    /// Accepted output rows `[t, y…]`, in time order.
    pub rows: Vec<Vec<f64>>,
    /// Event crossings recorded in this chunk.
    pub events: Vec<TableEventHit>,
    /// A stop event ended the run; no later chunk has rows.
    pub stopped: bool,
    /// `[t, y…]` at the end of an accepted step ([`IdaRun::step_accepted`]),
    /// which is generally between grid rows; `None` for every other call.
    pub state: Option<Vec<f64>>,
    /// The integration failed after [`Self::rows`]; the run is over. The rows
    /// before it are accepted output and stay valid.
    pub error: Option<FreesError>,
    /// Phase L4: the watch that crossed in this chunk and ended it, as written.
    pub paused: Option<String>,
}

/// Phase L4: a condition that pauses a live run where it crosses — a column of
/// the block's table against a value, `body.port.T > 60 [C]`. It is located
/// by root finding, not by reading rows: IDA's own root search (the watch is a
/// session-only `record` event of the block), and on an explicit method a
/// bisection on the accepted step's interpolant, outside the stepper. Neither
/// changes a step, so the run's rows are the batch rows; the watch only ends
/// the chunk it crosses in.
#[derive(Debug, Clone, PartialEq)]
pub struct Watch {
    /// As written; the pause and its event carry it.
    pub name: String,
    /// The column of the block's table (0 is time).
    pub column: usize,
    /// In SI, as the table's values are.
    pub threshold: f64,
    /// `+1` for `>` (crossing upward), `−1` for `<` (downward). A run that
    /// starts beyond the value has not crossed it.
    pub direction: i32,
}

impl Watch {
    /// Parse `column > value` or `column < value` against the block's columns.
    /// The column is written as a variable (`body.port.T`) and matched without
    /// case; the value is a literal, its unit converted to SI as in a document.
    pub fn parse(text: &str, columns: &[String]) -> Result<Watch> {
        let text = text.trim();
        let fail = |why: String| {
            FreesError::solver(format!("Live mode: the pause condition `{text}` {why}"))
        };
        let at = text
            .find(['>', '<'])
            .ok_or_else(|| fail("needs `>` or `<`, as in `T > 60 [C]`.".into()))?;
        let direction = if text[at..].starts_with('>') { 1 } else { -1 };
        let left = text[..at].trim();
        let right = text[at + 1..]
            .strip_prefix('=')
            .unwrap_or(&text[at + 1..])
            .trim();
        let key = |s: &str| s.to_lowercase().replace('$', ".");
        let column = columns
            .iter()
            .position(|c| key(c) == key(left))
            .ok_or_else(|| {
                fail(format!(
                    "names `{left}`, which is not a column of the block's table."
                ))
            })?;
        let threshold = literal(right).ok_or_else(|| {
            fail(format!("compares with `{right}`; the right side must be a number, with a known unit if it has one."))
        })?;
        Ok(Watch {
            name: text.to_string(),
            column,
            threshold,
            direction,
        })
    }

    /// Whether `g = value − threshold` went from `before` to `after` across
    /// the value in the watch's direction.
    pub(crate) fn crossed(&self, before: f64, after: f64) -> bool {
        if self.direction > 0 {
            before < 0.0 && after >= 0.0
        } else {
            before > 0.0 && after <= 0.0
        }
    }
}

/// A number literal, its unit converted to SI; `None` for anything else, an
/// unknown unit included.
fn literal(src: &str) -> Option<f64> {
    use crate::ast::Expr;
    let tokens = crate::lexer::tokenize(src).ok()?;
    let mut cursor = crate::parser::Cursor::new(&tokens, src);
    let expr = crate::parser::parse_expr(&mut cursor).ok()?;
    cursor.skip_newlines();
    if !cursor.is_eof() {
        return None;
    }
    let (negate, expr) = match expr {
        Expr::Neg(inner) => (true, *inner),
        e => (false, e),
    };
    // The parser keeps an unknown unit's raw value (a document only warns),
    // which a pause threshold must not do.
    let unit_known = match (src.find('['), src.rfind(']')) {
        (Some(a), Some(b)) if a < b => {
            crate::units::UnitRegistry::parse_with_offset(src[a + 1..b].trim()).is_ok()
        }
        (None, None) => true,
        _ => false,
    };
    match expr {
        Expr::Num {
            value,
            is_imaginary: false,
            ..
        } if unit_known => Some(if negate { -value } else { value }),
        _ => None,
    }
}

/// The resumable IDA output loop of one `DYNAMIC` block.
pub struct IdaRun {
    spec: AssemblySpec<'static>,
    bindings: Vec<EventBinding>,
    name: String,
    method: String,
    columns: Vec<String>,
    rtol: f64,
    atol: f64,
    t0: f64,
    tf: f64,
    points: usize,
    /// `None` until the first chunk initializes it.
    solver: Option<IdaDaeSolver<'static>>,
    /// Grid index of the last row produced.
    index: usize,
    /// Where the run ended: a stop event's time, or the failure.
    end: Option<f64>,
    failed: bool,
    /// A live session's step cap ([`Self::cap_step`]); `None` in a batch run.
    hmax: Option<f64>,
    /// The analytic values the run opened with, which a reset restores.
    original: Scope,
    /// A live input change waiting for the next chunk (Phase L1): the time
    /// it applies at and the interpolated state there, to reinitialize from.
    pending: Option<(f64, Vec<f64>, Vec<f64>)>,
    /// The last restart applied, while the solver has not stepped since: a
    /// further change there restarts from the same state, so a replay that
    /// reaches the row in between reproduces the run.
    applied: Option<(f64, Vec<f64>, Vec<f64>)>,
}

impl IdaRun {
    #[allow(clippy::too_many_arguments)]
    pub(crate) fn new(
        spec: AssemblySpec<'_>,
        bindings: Vec<EventBinding>,
        method: String,
        columns: Vec<String>,
        rtol: f64,
        atol: f64,
        (t0, tf, points): (f64, f64, usize),
    ) -> IdaRun {
        IdaRun {
            name: spec.block_name.clone(),
            original: spec.analytic_values.clone(),
            pending: None,
            applied: None,
            spec: spec.detached(),
            bindings,
            method,
            columns,
            rtol,
            atol,
            t0,
            tf,
            points,
            solver: None,
            index: 0,
            end: None,
            failed: false,
            hmax: None,
        }
    }

    /// Run on under new analytic values from the last row on (Phase L1). The
    /// state there is interpolated now and the integrator reinitialized from it
    /// at the next chunk, against the residual rebuilt from the new values, so
    /// the states are kept and the algebraic variables made consistent again.
    /// Answers the time the change applies at.
    pub(crate) fn retarget(&mut self, base: Scope) -> Result<f64> {
        let t = match &self.solver {
            None => self.t0,
            Some(s) => {
                let t = self.time_of(self.index);
                let unstepped = self
                    .applied
                    .take()
                    .filter(|a| a.0 == t && s.last_step() == 0.0);
                let state = self.pending.take().or(unstepped).unwrap_or_else(|| {
                    let (y, yp) = s.interpolate(t);
                    (t, y, yp)
                });
                self.pending = Some(state);
                t
            }
        };
        self.spec.analytic_values = base;
        Ok(t)
    }

    /// Cap the integrator's step size from the next initialization on.
    pub(crate) fn cap_step(&mut self, hmax: f64) {
        self.hmax = Some(hmax);
    }

    /// The time of grid row `i`. The batch grid is `linspace(t0, tf, points)`;
    /// a live run continues the same spacing past `tf`, with the same formula,
    /// so every row a batch run has sits at the identical time.
    pub fn time_of(&self, i: usize) -> f64 {
        grid_time((self.t0, self.tf, self.points), i)
    }

    /// The `[time, states…, aux…]` column names of every row.
    pub fn columns(&self) -> &[String] {
        &self.columns
    }

    fn last_row_at(&self, t: f64) -> usize {
        grid_last_row(self.t0, self.tf, self.points, t)
    }

    /// Grid index of the last row produced (0 once initialized).
    pub fn index(&self) -> usize {
        self.index
    }

    /// The current integrator time and step size, once initialized.
    pub fn clock(&self) -> Option<(f64, f64)> {
        self.solver
            .as_ref()
            .map(|s| (s.current_time(), s.last_step()))
    }

    /// The run has ended: a stop event or a failure.
    pub fn finished(&self) -> bool {
        self.end.is_some() || self.failed
    }

    /// Back to `t0`, with nothing integrated.
    pub fn restart(&mut self) {
        self.spec.analytic_values = self.original.clone();
        self.pending = None;
        self.applied = None;
        self.solver = None;
        self.index = 0;
        self.end = None;
        self.failed = false;
    }

    /// Integrate up to grid row `last`, producing the rows on the way. The
    /// first chunk also produces the `t0` row. Between rows `more` is shown the
    /// chunk so far and asked whether to go on; once at least one row is out,
    /// a `false` ends the chunk there, and the next call resumes from the same
    /// state.
    pub fn advance(
        &mut self,
        defs: &Definitions,
        last: usize,
        more: &mut dyn FnMut(&Chunk) -> bool,
        progress: Option<&crate::progress::Claim>,
    ) -> Chunk {
        self.with_solver(defs, |run, s, chunk| {
            run.run_rows(s, defs, last, more, progress, chunk)
        })
    }

    /// Take one internal integrator step (IDA's one-step mode). The chunk
    /// carries the grid rows the step passed, any event it crossed, and the
    /// state at its end in [`Chunk::state`]. A run that mixes this with
    /// [`Self::advance`] stays within the integrator's tolerance of the batch
    /// run, not bit for bit: the root search ends at the step instead of at the
    /// next row.
    pub fn step_accepted(&mut self, defs: &Definitions) -> Chunk {
        self.with_solver(defs, |run, s, chunk| run.one_step(s, defs, chunk))
    }

    /// Rebuild the residual, lease the parked solver to `body` (initializing
    /// it on the first call, which also produces the `t0` row), and park it
    /// again whatever `body` returns.
    fn with_solver(
        &mut self,
        defs: &Definitions,
        body: impl FnOnce(&mut Self, &mut IdaDaeSolver<'_>, &mut Chunk) -> Result<()>,
    ) -> Chunk {
        let mut chunk = Chunk::default();
        if self.finished() {
            chunk.stopped = self.end.is_some();
            return chunk;
        }
        let mut spec = self.spec.clone();
        spec.ctx = EvalContext::with_defs(defs);
        // As in the batch path before it was resumable: an assembly or
        // configuration error is reported as it stands, and an integration
        // error is wrapped in the block's diagnosis.
        let dae = match assemble(spec) {
            Ok(dae) => dae,
            Err(e) => return self.fail(chunk, e, false),
        };
        let mut s = match self.solver.take() {
            Some(parked) => {
                let mut s = parked.rebind(dae.residual.as_ref(), dae.root_fn.as_deref());
                if let Some((t, y, yp)) = self.pending.take() {
                    if let Err(e) = s.reinit(t, &y, &yp) {
                        return self.fail(chunk, e, true);
                    }
                    // As after a set event: the hint must lie beyond `t`, and a
                    // failure is absorbed by the first BDF step.
                    let hint = t + f64::max(1e-9, 1e-6 * t.abs());
                    let _ = s.calc_consistent_ic(IDA_YA_YDP_INIT, hint);
                    self.applied = Some((t, y, yp));
                }
                s
            }
            None => {
                let mut s = match IdaDaeSolver::for_assembly(&dae, self.rtol, self.atol) {
                    Ok(s) => s,
                    Err(e) => return self.fail(chunk, e, false),
                };
                if let Some(h) = self.hmax {
                    s.set_max_step(h);
                }
                if let Err(e) = self.initialize(&mut s, &dae) {
                    return self.fail(chunk, e, true);
                }
                chunk.rows.push(row_of(self.t0, &s.current_state()));
                s
            }
        };
        let outcome = body(self, &mut s, &mut chunk);
        self.solver = Some(s.parked());
        match outcome {
            Ok(()) => chunk,
            Err(e) => self.fail(chunk, e, true),
        }
    }

    fn one_step(
        &mut self,
        s: &mut IdaDaeSolver<'_>,
        defs: &Definitions,
        chunk: &mut Chunk,
    ) -> Result<()> {
        // The next row's time sizes the first step exactly as the batch run's
        // first `step(tout)` does; later steps ignore it.
        let step = s.step_once(self.time_of(self.index + 1))?;
        let root = step.root_return();
        // The rows the step passed, from its own interpolant, before a root's
        // action can reset the history; a row on the root itself waits for it.
        while self.time_of(self.index + 1) < step.t
            || (!root && self.time_of(self.index + 1) == step.t)
        {
            let t = self.time_of(self.index + 1);
            chunk.rows.push(row_of(t, &s.interpolate(t).0));
            self.index += 1;
        }
        if !root {
            chunk.state = Some(row_of(step.t, &step.y));
            return Ok(());
        }
        let t_root = step.t;
        match self.handle_roots(s, defs, step, t_root, &mut chunk.events)? {
            RootOutcome::Stop => {
                chunk.rows.push(row_of(t_root, &s.current_state()));
                chunk.stopped = true;
                self.end = Some(t_root);
            }
            RootOutcome::Report(step) => {
                if self.time_of(self.index + 1) == step.t {
                    chunk.rows.push(row_of(step.t, &step.y));
                    self.index += 1;
                }
                chunk.state = Some(row_of(step.t, &step.y));
            }
            RootOutcome::Resume => {
                chunk.state = Some(row_of(t_root, &s.current_state()));
            }
        }
        Ok(())
    }

    fn fail(&mut self, mut chunk: Chunk, e: FreesError, wrap: bool) -> Chunk {
        self.failed = true;
        chunk.error = Some(if wrap { self.ida_failure(&e) } else { e });
        chunk
    }

    fn initialize(&self, s: &mut IdaDaeSolver<'_>, dae: &DaeAssembly<'_>) -> Result<()> {
        s.init(self.t0, &dae.y0, &dae.yp0)?;
        let span = self.tf - self.t0;
        // IDACalcIC refines the initial (y, y') to satisfy the algebraic
        // constraints. Its line search can fail (-12) on a stiff coupled DAE
        // even when the assembled initial state — already seeded from the
        // inner algebraic solve at t0 — is itself near-consistent. Fall back
        // to integrating from the seeded state rather than aborting; IDA's
        // first BDF step will absorb any small residual.
        if s.calc_consistent_ic(IDA_YA_YDP_INIT, self.t0 + span * 1e-3)
            .is_err()
        {
            s.reinit(self.t0, &dae.y0, &dae.yp0)?;
        }
        Ok(())
    }

    fn run_rows(
        &mut self,
        s: &mut IdaDaeSolver<'_>,
        defs: &Definitions,
        last: usize,
        more: &mut dyn FnMut(&Chunk) -> bool,
        progress: Option<&crate::progress::Claim>,
        chunk: &mut Chunk,
    ) -> Result<()> {
        while self.index < last {
            if !chunk.rows.is_empty() && !more(chunk) {
                return Ok(());
            }
            let tout = self.time_of(self.index + 1);
            // The output grid is uniform in time, so the row index is the
            // integration fraction — no separate signal needed.
            if let Some(p) = progress {
                p.report(self.index as f64 / (self.points - 1) as f64);
            }
            match self.advance_to(s, defs, tout, &mut chunk.events)? {
                // A stop event fired.
                None => {
                    let t_stop = chunk.events.last().expect("a stop records its hit").time;
                    chunk.rows.push(row_of(t_stop, &s.current_state()));
                    chunk.stopped = true;
                    self.end = Some(t_stop);
                    return Ok(());
                }
                Some(step) => chunk.rows.push(row_of(tout, &step.y)),
            }
            self.index += 1;
        }
        Ok(())
    }

    /// Port of `DynamicSolver.advanceTo`: integrate to `tout`, recording any
    /// non-stop root crossings and continuing; `Ok(None)` means a stop event
    /// fired.
    fn advance_to(
        &self,
        s: &mut IdaDaeSolver<'_>,
        defs: &Definitions,
        tout: f64,
        hits: &mut Vec<TableEventHit>,
    ) -> Result<Option<Step>> {
        loop {
            let step = s.step(tout)?;
            if !step.root_return() {
                return Ok(Some(step));
            }
            match self.handle_roots(s, defs, step, tout, hits)? {
                RootOutcome::Resume => {}
                RootOutcome::Stop => return Ok(None),
                RootOutcome::Report(step) => return Ok(Some(step)),
            }
        }
    }

    /// Port of `DynamicSolver.handleRoots`. SUNDIALS reports the crossing
    /// direction as the sign of `roots_found[r]`; the event's declared
    /// rising/falling filter is honoured exactly as on the explicit path. The
    /// event order is the assembly's, which is the bindings' own order — both
    /// sides are built from the same iteration.
    fn handle_roots(
        &self,
        s: &mut IdaDaeSolver<'_>,
        defs: &Definitions,
        step: Step,
        tout: f64,
        hits: &mut Vec<TableEventHit>,
    ) -> Result<RootOutcome> {
        let mut set_event: Option<usize> = None;
        for (r, &found) in step.roots_found.iter().enumerate() {
            let binding = &self.bindings[r];
            let matches = found != 0 && (binding.direction == 0 || binding.direction * found > 0);
            if matches {
                hits.push(TableEventHit {
                    name: binding.name.clone(),
                    time: step.t,
                });
                if binding.stop {
                    return Ok(RootOutcome::Stop);
                }
                if binding.set_index.is_some() && set_event.is_none() {
                    set_event = Some(r);
                }
            }
        }
        if let Some(r) = set_event {
            return self.apply_set_event(s, defs, step, tout, r);
        }
        Ok(if step.t >= tout {
            RootOutcome::Report(step)
        } else {
            RootOutcome::Resume
        })
    }

    /// Port of `DynamicSolver.applySetEvent`: overwrite the state at the
    /// crossing, re-initialize IDA there, and let IDACalcIC re-derive the
    /// algebraic variables consistent with the modified state.
    fn apply_set_event(
        &self,
        s: &mut IdaDaeSolver<'_>,
        defs: &Definitions,
        step: Step,
        tout: f64,
        r: usize,
    ) -> Result<RootOutcome> {
        let binding = &self.bindings[r];
        let mut y = step.y.clone();
        let yp = step.yp.clone();
        let scope = dae_values(
            &self.spec.analytic_values,
            &self.spec.time_var,
            &self.spec.states,
            &self.spec.aux,
            step.t,
            &y,
            &yp,
        );
        let idx = binding.set_index.expect("a set event carries its index");
        let expr = binding
            .set_expr
            .as_ref()
            .expect("a set event carries its expression");
        y[idx] = eval_with(expr, &scope, EvalContext::with_defs(defs))?;
        s.reinit(step.t, &y, &yp)?;
        // IDACalcIC's tout1 is a direction hint and must lie strictly beyond
        // the reinit time (the root can land exactly on tout). A failure here
        // is absorbed by the first BDF step — the same fallback as at t0.
        let hint = step.t + f64::max(1e-9, 1e-6 * step.t.abs());
        let _ = s.calc_consistent_ic(IDA_YA_YDP_INIT, f64::max(tout, hint));
        if step.t >= tout {
            // The crossing coincided with the requested sample: report the
            // post-set state rather than asking IDA for tout == t.
            return Ok(RootOutcome::Report(Step {
                t: step.t,
                y,
                yp,
                flag: 0,
                roots_found: step.roots_found,
            }));
        }
        Ok(RootOutcome::Resume)
    }

    /// The `solveWithIda` catch block: keep the integrator's own message, add
    /// the diagnosable causes, and return the solver's exception type.
    fn ida_failure(&self, e: &FreesError) -> FreesError {
        FreesError::solver(format!(
            "DYNAMIC {}: transient integration failed ({}). The usual causes: \
             initial values that violate the algebraic constraints, a step \
             across a property-surface boundary, or an algebraic coupling the \
             structural checks cannot see. Adjust the initials, or run a \
             built-in method (ode23s) to surface the per-step algebraic \
             diagnosis.",
            self.name,
            e.to_string_message()
        ))
    }

    /// The whole run as an ODE Table: the rows given, ended where the run
    /// ended (a stop event's time, or `tf`).
    pub fn table(&self, rows: Vec<Vec<f64>>, events: Vec<TableEventHit>) -> OdeTableResult {
        OdeTableResult {
            name: self.name.clone(),
            columns: self.columns.clone(),
            rows,
            events,
            method: self.method.clone(),
            stopped: self.end.is_some(),
            end_time: self.end.unwrap_or(self.tf),
        }
    }

    /// The grid row count of the batch run.
    pub fn points(&self) -> usize {
        self.points
    }
}

/// What a batch of root crossings means for the IDA integration. Port of the
/// Java `RootOutcome(boolean terminal, Step step)` record: `Stop` is terminal
/// with a null step, `Report` terminal with one, `Resume` not terminal.
enum RootOutcome {
    Resume,
    Stop,
    Report(Step),
}

/// Port of `DynamicSolver.rowOf`: `[t, y…]`.
fn row_of(t: f64, y: &[f64]) -> Vec<f64> {
    let mut row = Vec::with_capacity(1 + y.len());
    row.push(t);
    row.extend_from_slice(y);
    row
}

/// The stepping state of a live explicit run, which
/// [`DynamicSolver::explicit_rows`] reads and advances.
#[derive(Default)]
pub(crate) struct ExplicitLive {
    pub(crate) stepper: Option<ExplicitStepper>,
    pub(crate) knots: Knots,
    /// Where the current lap ends: the document's `tf`, then one span later
    /// each time it is reached.
    pub(crate) horizon: f64,
    /// Grid index of the next row to produce.
    pub(crate) next: usize,
    /// How many of the stepper's recorded events are already in a chunk.
    pub(crate) events_sent: usize,
    pub(crate) end: Option<f64>,
    /// Phase L4: the watches, and `(t, value − threshold)` for each at the
    /// end of the last accepted step.
    pub(crate) watches: Vec<Watch>,
    pub(crate) watch_prev: Option<(f64, Vec<f64>)>,
    t0: f64,
    tf: f64,
    points: usize,
}

impl ExplicitLive {
    /// `(t0, tf, points)` of the batch grid, which the live one continues.
    pub(crate) fn grid(&self) -> (f64, f64, usize) {
        (self.t0, self.tf, self.points)
    }
}

/// The resumable explicit (`ode45`, `ode23s`, …) loop of one `DYNAMIC` block
/// (Phase K1b). It owns what a [`DynamicSolver`] borrows — the block, the
/// solved base values, the inner solve's settings and specs — and rebuilds
/// two solvers on them per chunk: one steps, one samples the output rows
/// (see [`DynamicSolver::explicit_rows`] for why there are two). Their
/// classification and warm chains are parked between chunks.
pub struct ExplicitRun {
    block: OwnedBlock,
    columns: Vec<String>,
    /// `None` before the first chunk and after a reset: the next chunk
    /// prepares both solvers afresh, as a batch solve does.
    parked: Option<(ParkedDynamic, ParkedDynamic)>,
    live: ExplicitLive,
    failed: bool,
    /// The base values the run opened with, which a reset restores.
    original: Scope,
    /// Phase L4: kept here, as a reset starts the live state afresh.
    watches: Vec<Watch>,
}

impl ExplicitRun {
    /// Prepare the block once, so a structural error is the open's to report,
    /// and park the result for the first chunk.
    pub(crate) fn new(
        system: &DynamicSystem,
        base: &Scope,
        inner: SolverSettings,
        specs: &BTreeMap<String, VarSpec>,
        defs: &Definitions,
    ) -> Result<ExplicitRun> {
        let mut run = ExplicitRun {
            block: OwnedBlock {
                system: system.clone(),
                base: base.clone(),
                inner,
                specs: specs.clone(),
            },
            columns: Vec::new(),
            parked: None,
            live: ExplicitLive::default(),
            failed: false,
            original: base.clone(),
            watches: Vec::new(),
        };
        let (stepping, sampling) = run.block.prepared(defs)?;
        run.columns = stepping.columns();
        run.parked = Some((stepping.park(), sampling.park()));
        run.restart_grid();
        Ok(run)
    }

    fn restart_grid(&mut self) {
        let options = &self.block.system.options;
        let points = match options.points {
            Some(p) if p >= 2 => p,
            _ => DEFAULT_SAMPLE_COUNT,
        };
        self.live = ExplicitLive {
            horizon: options.tf,
            t0: options.t0,
            tf: options.tf,
            points,
            watches: self.watches.clone(),
            ..ExplicitLive::default()
        };
        self.failed = false;
    }

    /// The block's table columns, which a watch names.
    pub(crate) fn columns(&self) -> &[String] {
        &self.columns
    }

    /// Phase L4: pause where these cross, from the open on.
    pub(crate) fn watch(&mut self, watches: Vec<Watch>) {
        self.watches = watches.clone();
        self.live.watches = watches;
    }

    fn run(
        &mut self,
        defs: &Definitions,
        last: usize,
        more: &mut dyn FnMut(&Chunk) -> bool,
        one_step: bool,
    ) -> Chunk {
        let mut chunk = Chunk::default();
        if self.finished() {
            chunk.stopped = self.live.end.is_some();
            return chunk;
        }
        let parked = self.parked.take();
        let outcome = (|| {
            let (stepping, sampling) = match parked {
                Some((a, b)) => {
                    let (mut s, mut t) = (self.block.solver(defs), self.block.solver(defs));
                    s.resume(a);
                    t.resume(b);
                    (s, t)
                }
                None => self.block.prepared(defs)?,
            };
            let mut live = std::mem::take(&mut self.live);
            let out =
                stepping.explicit_rows(&sampling, &mut live, last, more, &mut chunk, one_step);
            let parked = (stepping.park(), sampling.park());
            Ok::<_, FreesError>((out, live, parked))
        })();
        match outcome {
            Ok((out, live, parked)) => {
                self.live = live;
                self.parked = Some(parked);
                if let Err(e) = out {
                    self.failed = true;
                    chunk.error = Some(e);
                }
            }
            Err(e) => {
                self.failed = true;
                chunk.error = Some(e);
            }
        }
        chunk
    }

    fn index(&self) -> usize {
        self.live.next.saturating_sub(1)
    }

    fn last_row_at(&self, t: f64) -> usize {
        grid_last_row(self.live.t0, self.live.tf, self.live.points, t)
    }

    fn clock(&self) -> Option<(f64, f64)> {
        self.live.stepper.as_ref().map(ExplicitStepper::clock)
    }

    fn finished(&self) -> bool {
        self.live.end.is_some() || self.failed
    }

    fn restart(&mut self) {
        self.block.base = self.original.clone();
        self.parked = None;
        self.restart_grid();
    }

    /// Run on under new base values from the stepper's current time (Phase
    /// L1): the derivative is evaluated afresh there. If that fails the old
    /// values stand and the run is as it was.
    fn retarget(&mut self, defs: &Definitions, base: Scope) -> Result<f64> {
        let old = std::mem::replace(&mut self.block.base, base);
        let t = self
            .live
            .stepper
            .as_ref()
            .map_or(self.live.t0, |s| s.clock().0);
        let Some((a, b)) = self.parked.take() else {
            // Reset and not yet run: the next chunk prepares on the new values.
            return Ok(t);
        };
        let (mut stepping, mut sampling) = (self.block.solver(defs), self.block.solver(defs));
        stepping.resume(a);
        sampling.resume(b);
        stepping.forget_pins();
        sampling.forget_pins();
        let out = stepping.restart_explicit(&mut self.live);
        let parked = (stepping.park(), sampling.park());
        self.parked = Some(parked);
        match out {
            Ok(()) => Ok(t),
            Err(e) => {
                // `restart_here` changes nothing until it has succeeded, and the
                // forgotten pins rebuild from the old values on the next step.
                self.block.base = old;
                Err(e)
            }
        }
    }

    fn table(&self, rows: Vec<Vec<f64>>, events: Vec<TableEventHit>) -> OdeTableResult {
        OdeTableResult {
            name: self.block.system.name.clone(),
            columns: self.columns.clone(),
            rows,
            events,
            method: self.block.system.options.method.clone(),
            stopped: self.live.end.is_some(),
            end_time: self.live.end.unwrap_or(self.live.tf),
        }
    }
}

/// What a [`DynamicSolver`] borrows, owned.
struct OwnedBlock {
    system: DynamicSystem,
    base: Scope,
    inner: SolverSettings,
    specs: BTreeMap<String, VarSpec>,
}

impl OwnedBlock {
    fn solver<'s>(&'s self, defs: &'s Definitions) -> DynamicSolver<'s> {
        DynamicSolver::new(
            &self.system,
            &self.base,
            defs,
            pinned_solver(&self.inner, &self.specs, EvalContext::with_defs(defs)),
        )
    }

    /// Two freshly prepared solvers, as a batch solve prepares its one.
    fn prepared<'s>(
        &'s self,
        defs: &'s Definitions,
    ) -> Result<(DynamicSolver<'s>, DynamicSolver<'s>)> {
        let (mut stepping, mut sampling) = (self.solver(defs), self.solver(defs));
        stepping.prepare_explicit()?;
        sampling.prepare_explicit()?;
        Ok((stepping, sampling))
    }
}

/// A live block's run: the implicit DAE loop or the explicit one.
enum Run {
    Ida(Box<IdaRun>),
    Explicit(Box<ExplicitRun>),
}

/// One `DYNAMIC` block's transient, kept open between requests.
///
/// It owns the document definitions and the run, so it borrows nothing; the
/// boundary holds it and calls [`Self::advance`] once per frame. Pausing is
/// the boundary not calling; disposing is dropping it.
pub struct LiveSession {
    defs: Definitions,
    run: Run,
    /// The prepared document the session was opened from, which re-solves the
    /// steady part when an input changes (Phase L1); `None` only while
    /// [`PreparedDocument::open_live`](crate::engine::prepared::PreparedDocument::open_live)
    /// is still building it.
    doc: Option<Box<crate::engine::prepared::PreparedDocument>>,
    /// `doc` with the current inputs' assignments struck, and their names.
    struck: Option<(Vec<String>, Box<crate::engine::prepared::PreparedDocument>)>,
    block: usize,
    /// The inputs changed since the open, newest value per name.
    pins: Vec<(String, f64)>,
    log: Vec<InputChange>,
    /// Phase L4: the names of the session's watches, whose crossing ends a chunk.
    watches: Vec<String>,
}

fn pins_names(pins: &[(String, f64)]) -> Vec<String> {
    pins.iter().map(|(n, _)| n.clone()).collect()
}

/// One applied live input change (Phase L1): the run's time it took effect
/// at, after the row or step there, and the new value.
#[derive(Debug, Clone, PartialEq)]
pub struct InputChange {
    pub time: f64,
    pub name: String,
    pub value: f64,
}

impl LiveSession {
    pub(crate) fn new(defs: Definitions, run: IdaRun) -> LiveSession {
        LiveSession::of(defs, Run::Ida(Box::new(run)))
    }

    pub(crate) fn explicit(defs: Definitions, run: ExplicitRun) -> LiveSession {
        LiveSession::of(defs, Run::Explicit(Box::new(run)))
    }

    fn of(defs: Definitions, run: Run) -> LiveSession {
        LiveSession {
            defs,
            run,
            doc: None,
            struck: None,
            block: 0,
            pins: Vec::new(),
            log: Vec::new(),
            watches: Vec::new(),
        }
    }

    /// Phase L4: pause at these watches' crossings (their names, as the run's
    /// events carry them).
    pub(crate) fn watch(&mut self, names: Vec<String>) {
        self.watches = names;
    }

    /// Name the watch a chunk crossed, if any.
    fn mark(&self, mut chunk: Chunk) -> Chunk {
        chunk.paused = chunk
            .events
            .iter()
            .find(|e| self.watches.contains(&e.name))
            .map(|e| e.name.clone());
        chunk
    }

    pub(crate) fn attach(&mut self, doc: crate::engine::prepared::PreparedDocument, block: usize) {
        self.doc = Some(Box::new(doc));
        self.block = block;
    }

    /// Change inputs live (Phase L1): document values the steady solve reads,
    /// such as a heater power or a boundary temperature. The steady part is
    /// solved again with them, and the run carries on from where it stands:
    /// an IDA run from its last row, its algebraic variables made consistent
    /// again; an explicit run from its current step. The states are kept. A
    /// change the steady solve or the new derivative refuses leaves the run
    /// as it was. Answers the time the change applies at; each change is
    /// logged, and replaying the log at those times reproduces the run.
    pub fn set_inputs(&mut self, changes: &[(String, f64)]) -> Result<f64> {
        if self.finished() {
            return Err(FreesError::solver(
                "Live mode: the run has ended, so an input cannot change it. Reset to run again.",
            ));
        }
        let mut pins = self.pins.clone();
        for (name, value) in changes {
            let name = name.to_ascii_lowercase();
            match pins.iter_mut().find(|(n, _)| *n == name) {
                Some(pin) => pin.1 = *value,
                None => pins.push((name, *value)),
            }
        }
        let names: Vec<String> = pins.iter().map(|(n, _)| n.clone()).collect();
        if self.struck.as_ref().is_none_or(|(n, _)| *n != names) {
            let doc = self.doc.as_ref().ok_or_else(|| {
                FreesError::solver("Live mode: this session cannot change inputs.")
            })?;
            self.struck = Some((names, Box::new(doc.struck(&pins_names(&pins))?)));
        }
        let (_, doc) = self.struck.as_mut().expect("struck above");
        let base = doc.live_base(self.block, &pins)?;
        let time = match &mut self.run {
            Run::Ida(run) => run.retarget(base)?,
            Run::Explicit(run) => run.retarget(&self.defs, base)?,
        };
        self.pins = pins;
        self.log
            .extend(changes.iter().map(|(name, value)| InputChange {
                time,
                name: name.clone(),
                value: *value,
            }));
        Ok(time)
    }

    /// The input changes applied since the open (or the last reset), in order.
    pub fn input_log(&self) -> &[InputChange] {
        &self.log
    }

    /// Rows up to `last`, ending the chunk early where a watch crosses.
    fn rows(&mut self, last: usize, more: &mut dyn FnMut(&Chunk) -> bool) -> Chunk {
        let watches = &self.watches;
        let mut more = |c: &Chunk| !c.events.iter().any(|e| watches.contains(&e.name)) && more(c);
        let chunk = match &mut self.run {
            Run::Ida(run) => run.advance(&self.defs, last, &mut more, None),
            Run::Explicit(run) => run.run(&self.defs, last, &mut more, false),
        };
        self.mark(chunk)
    }

    fn index(&self) -> usize {
        match &self.run {
            Run::Ida(run) => run.index(),
            Run::Explicit(run) => run.index(),
        }
    }

    /// Integrate to `t_target`, producing every grid row at or before it.
    /// `more` is the work budget: shown the chunk so far, a `false` ends the
    /// chunk early and the next call resumes there. An IDA run asks between
    /// rows, after at least one (ending between its internal steps would move
    /// its root search off the batch run's); an explicit run asks between
    /// internal steps, after at least one, so its chunk may hold no rows. The tolerances are the document's; a frame budget never
    /// relaxes them.
    pub fn advance(&mut self, t_target: f64, more: &mut dyn FnMut(&Chunk) -> bool) -> Chunk {
        let at = match &self.run {
            Run::Ida(run) => run.last_row_at(t_target),
            Run::Explicit(run) => run.last_row_at(t_target),
        };
        self.rows(at.max(self.index()), more)
    }

    /// Step to the next output row.
    pub fn step_sample(&mut self) -> Chunk {
        self.rows(self.index() + 1, &mut |_| true)
    }

    /// Step to the next event crossing, or `max_rows` rows, whichever comes
    /// first.
    pub fn step_event(&mut self, max_rows: usize) -> Chunk {
        let last = self.index().saturating_add(max_rows);
        self.rows(last, &mut |c| c.events.is_empty())
    }

    /// Take one internal integrator step; see [`IdaRun::step_accepted`].
    pub fn step_accepted(&mut self) -> Chunk {
        let chunk = match &mut self.run {
            Run::Ida(run) => run.step_accepted(&self.defs),
            Run::Explicit(run) => run.run(&self.defs, ROW_CAP, &mut |_| true, true),
        };
        self.mark(chunk)
    }

    /// Back to `t0`, with nothing integrated and the inputs the run opened
    /// with; the input log starts again.
    pub fn reset(&mut self) {
        self.pins.clear();
        self.log.clear();
        match &mut self.run {
            Run::Ida(run) => run.restart(),
            Run::Explicit(run) => run.restart(),
        }
    }

    /// The `[time, states…, aux…]` column names of every row.
    pub fn columns(&self) -> &[String] {
        match &self.run {
            Run::Ida(run) => run.columns(),
            Run::Explicit(run) => &run.columns,
        }
    }

    /// The integrator's current time and step size, once started.
    pub fn clock(&self) -> Option<(f64, f64)> {
        match &self.run {
            Run::Ida(run) => run.clock(),
            Run::Explicit(run) => run.clock(),
        }
    }

    /// The run has ended: a stop event or a failure.
    pub fn finished(&self) -> bool {
        match &self.run {
            Run::Ida(run) => run.finished(),
            Run::Explicit(run) => run.finished(),
        }
    }

    /// The accepted rows and events as an ODE Table, ended where the run is.
    pub fn table(&self, rows: Vec<Vec<f64>>, events: Vec<TableEventHit>) -> OdeTableResult {
        match &self.run {
            Run::Ida(run) => run.table(rows, events),
            Run::Explicit(run) => run.table(rows, events),
        }
    }
}
