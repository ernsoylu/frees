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
use crate::eval::{eval_with, EvalContext};
use crate::ode::events::EventBinding;
use crate::ode::problem::{OdeTableResult, TableEventHit};
use crate::parser::defs::Definitions;

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
        }
    }

    /// The time of grid row `i`. The batch grid is `linspace(t0, tf, points)`;
    /// a live run continues the same spacing past `tf`, with the same formula,
    /// so every row a batch run has sits at the identical time.
    pub fn time_of(&self, i: usize) -> f64 {
        self.t0 + (self.tf - self.t0) * i as f64 / (self.points - 1) as f64
    }

    /// The `[time, states…, aux…]` column names of every row.
    pub fn columns(&self) -> &[String] {
        &self.columns
    }

    /// The last grid row at or before `t`: the row [`Self::time_of`] puts
    /// there, found from the spacing and then corrected for rounding.
    fn last_row_at(&self, t: f64) -> usize {
        // ponytail: a live run is capped at 2³¹ rows (25 days of 1 ms rows,
        // 68 years of 1 s ones): a 32-bit wasm index, with room to step.
        const CAP: usize = 1 << 31;
        let per = (self.points - 1) as f64 / (self.tf - self.t0);
        let guess = ((t - self.t0) * per).floor();
        if guess.is_nan() || guess < 0.0 {
            return 0;
        }
        let mut k = (guess as usize).min(CAP);
        while k > 0 && self.time_of(k) > t {
            k -= 1;
        }
        while k < CAP && self.time_of(k + 1) <= t {
            k += 1;
        }
        k
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
            Some(parked) => parked.rebind(dae.residual.as_ref(), dae.root_fn.as_deref()),
            None => {
                let mut s = match IdaDaeSolver::for_assembly(&dae, self.rtol, self.atol) {
                    Ok(s) => s,
                    Err(e) => return self.fail(chunk, e, false),
                };
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

/// One `DYNAMIC` block's transient, kept open between requests.
///
/// It owns the document definitions and the run, so it borrows nothing; the
/// boundary holds it and calls [`Self::advance`] once per frame. Pausing is
/// the boundary not calling; disposing is dropping it.
pub struct LiveSession {
    defs: Definitions,
    run: IdaRun,
}

impl LiveSession {
    pub(crate) fn new(defs: Definitions, run: IdaRun) -> LiveSession {
        LiveSession { defs, run }
    }

    /// Integrate to `t_target`, producing every grid row at or before it.
    /// `more` is the work budget: shown the chunk so far between rows, a
    /// `false` ends the chunk early (after at least one row), and the next call
    /// resumes there. The tolerances are the document's; a frame budget never
    /// relaxes them.
    pub fn advance(&mut self, t_target: f64, more: &mut dyn FnMut(&Chunk) -> bool) -> Chunk {
        let last = self.run.last_row_at(t_target).max(self.run.index());
        self.run.advance(&self.defs, last, more, None)
    }

    /// Step to the next output row.
    pub fn step_sample(&mut self) -> Chunk {
        let last = self.run.index() + 1;
        self.run.advance(&self.defs, last, &mut |_| true, None)
    }

    /// Step to the next event crossing, or `max_rows` rows, whichever comes
    /// first.
    pub fn step_event(&mut self, max_rows: usize) -> Chunk {
        let last = self.run.index().saturating_add(max_rows);
        self.run
            .advance(&self.defs, last, &mut |c| c.events.is_empty(), None)
    }

    /// Take one internal integrator step; see [`IdaRun::step_accepted`].
    pub fn step_accepted(&mut self) -> Chunk {
        self.run.step_accepted(&self.defs)
    }

    /// Back to `t0`, with nothing integrated.
    pub fn reset(&mut self) {
        self.run.restart();
    }

    /// The `[time, states…, aux…]` column names of every row.
    pub fn columns(&self) -> &[String] {
        self.run.columns()
    }

    /// The integrator's current time and last step size, once started.
    pub fn clock(&self) -> Option<(f64, f64)> {
        self.run.clock()
    }

    /// The run has ended: a stop event or a failure.
    pub fn finished(&self) -> bool {
        self.run.finished()
    }

    /// The accepted rows and events as an ODE Table, ended where the run is.
    pub fn table(&self, rows: Vec<Vec<f64>>, events: Vec<TableEventHit>) -> OdeTableResult {
        self.run.table(rows, events)
    }
}
