//! Powell's BOBYQA — bound-constrained optimisation by quadratic
//! approximation, without derivatives.
//!
//! A faithful port of Commons Math 3.6.1
//! `org.apache.commons.math3.optim.nonlinear.scalar.noderiv.BOBYQAOptimizer`,
//! which the Java engine runs for the optimizer's `"bobyqa"` method and for
//! multi-parameter dynamic calibration. Names follow Powell's Fortran
//! (`xpt`, `bmat`, `zmat`, …); each is annotated with the Commons field it
//! mirrors. Arithmetic is transcribed in the same order so the evaluation
//! sequence — and therefore `evaluations` and the returned iterate — matches
//! the Java.
//!
//! # Control flow
//!
//! `bobyqb` and `trsbox` are Fortran `GOTO` state machines that Commons writes
//! as a `switch` with fall-through. Here each is a `loop` over a label; a case
//! that falls through sets the next label explicitly.
//!
//! Two of the Java's `break`s sit inside a `for` loop, where they leave the
//! loop rather than the `switch`, so the statement after the loop overrides the
//! label they set. Powell's Fortran jumps instead. The Java behaviour is what
//! the reference engine produced, so it is reproduced (and marked) here:
//!
//! * `bobyqb` label 60: the bound test that would "`GOTO 650`" always ends at
//!   label 680.
//! * `trsbox` label 120: fixing a newly active bound ends at label 210, not 100.

// Index loops stay as transcribed so each line maps to Commons/Powell for
// parity review.
#![allow(clippy::needless_range_loop)]

use super::optimizer::{jmax, jmin};

/// Commons `DEFAULT_INITIAL_RADIUS`.
pub const DEFAULT_INITIAL_RADIUS: f64 = 10.0;
/// Commons `DEFAULT_STOPPING_RADIUS`.
pub const DEFAULT_STOPPING_RADIUS: f64 = 1e-8;
/// Commons `MINIMUM_PROBLEM_DIMENSION`.
pub const MINIMUM_PROBLEM_DIMENSION: usize = 2;

/// Why a run stopped without an answer.
#[derive(Debug, Clone, PartialEq)]
pub enum BobyqaError<E> {
    /// The objective itself failed (budget exhausted, fatal solve error, …).
    Objective(E),
    /// Commons `NumberIsTooSmallException`: BOBYQA needs two or more variables.
    DimensionTooSmall(usize),
    /// Commons `OutOfRangeException(NUMBER_OF_INTERPOLATION_POINTS, …)`.
    InterpolationPointsOutOfRange { npt: usize, min: usize, max: usize },
    /// Commons `MathIllegalStateException(TRUST_REGION_STEP_FAILED, vquad)`.
    TrustRegionStepFailed(f64),
}

/// The optimum and how many objective evaluations reached it.
#[derive(Debug, Clone, PartialEq)]
pub struct BobyqaOutcome {
    pub point: Vec<f64>,
    /// The objective at `point`, with the caller's sign (not negated for
    /// maximisation) — Commons `PointValuePair.getValue()`.
    pub value: f64,
    pub evaluations: usize,
}

/// The problem a run optimises.
pub struct BobyqaProblem<'s> {
    pub start: &'s [f64],
    pub lower: &'s [f64],
    pub upper: &'s [f64],
    pub minimize: bool,
    /// Commons `numberOfInterpolationPoints`, in `[n + 2, (n + 1)(n + 2)/2]`.
    pub interpolation_points: usize,
    pub initial_radius: f64,
    pub stopping_radius: f64,
}

/// Run BOBYQA. `objective` is called once per evaluation, exactly where
/// Commons calls `computeObjectiveValue`; an `Err` aborts the run with
/// [`BobyqaError::Objective`].
///
/// The start point must lie inside `[lower, upper]` (Commons checks this in
/// `BaseMultivariateOptimizer`); callers clamp it first.
pub fn bobyqa<E, F>(
    problem: &BobyqaProblem<'_>,
    objective: F,
) -> Result<BobyqaOutcome, BobyqaError<E>>
where
    F: FnMut(&[f64]) -> Result<f64, E>,
{
    let mut state = State::setup(problem, objective)?;
    let value = state.bobyqa(problem.lower, problem.upper)?;
    Ok(BobyqaOutcome {
        point: state.x,
        value: if state.minimize { value } else { -value },
        evaluations: state.evaluations,
    })
}

struct State<F> {
    objective: F,
    evaluations: usize,
    n: usize,
    npt: usize,
    minimize: bool,
    initial_radius: f64,
    stopping_radius: f64,
    /// `currentBest`.
    x: Vec<f64>,
    /// `boundDifference`.
    bound_difference: Vec<f64>,
    /// `trustRegionCenterInterpolationPointIndex`.
    kopt: usize,
    /// `bMatrix`, `(npt + n) × n`.
    bmat: Vec<Vec<f64>>,
    /// `zMatrix`, `npt × (npt − n − 1)`.
    zmat: Vec<Vec<f64>>,
    /// `interpolationPoints`, `npt × n`.
    xpt: Vec<Vec<f64>>,
    /// `originShift`.
    xbase: Vec<f64>,
    /// `fAtInterpolationPoints`.
    fval: Vec<f64>,
    /// `trustRegionCenterOffset`.
    xopt: Vec<f64>,
    /// `gradientAtTrustRegionCenter`.
    gopt: Vec<f64>,
    /// `lowerDifference`.
    sl: Vec<f64>,
    /// `upperDifference`.
    su: Vec<f64>,
    /// `modelSecondDerivativesParameters`.
    pq: Vec<f64>,
    /// `newPoint`.
    xnew: Vec<f64>,
    /// `alternativeNewPoint`.
    xalt: Vec<f64>,
    /// `trialStepPoint`.
    d: Vec<f64>,
    /// `lagrangeValuesAtNewPoint`, `npt + n`.
    vlag: Vec<f64>,
    /// `modelSecondDerivativesValues`, `n(n + 1)/2`.
    hq: Vec<f64>,
}

impl<E, F> State<F>
where
    F: FnMut(&[f64]) -> Result<f64, E>,
{
    /// Commons `setup` plus the field initialisation of `doOptimize`.
    fn setup(problem: &BobyqaProblem<'_>, objective: F) -> Result<Self, BobyqaError<E>> {
        let n = problem.start.len();
        if n < MINIMUM_PROBLEM_DIMENSION {
            return Err(BobyqaError::DimensionTooSmall(n));
        }
        let npt = problem.interpolation_points;
        let (min, max) = (n + 2, (n + 2) * (n + 1) / 2);
        if npt < min || npt > max {
            return Err(BobyqaError::InterpolationPointsOutOfRange { npt, min, max });
        }
        let mut initial_radius = problem.initial_radius;
        let bound_difference: Vec<f64> = (0..n)
            .map(|i| problem.upper[i] - problem.lower[i])
            .collect();
        let required_min_diff = 2.0 * initial_radius;
        let mut min_diff = f64::INFINITY;
        for &diff in &bound_difference {
            min_diff = jmin(min_diff, diff);
        }
        if min_diff < required_min_diff {
            initial_radius = min_diff / 3.0;
        }
        Ok(State {
            objective,
            evaluations: 0,
            n,
            npt,
            minimize: problem.minimize,
            initial_radius,
            stopping_radius: problem.stopping_radius,
            x: problem.start.to_vec(),
            bound_difference,
            kopt: 0,
            bmat: vec![vec![0.0; n]; n + npt],
            zmat: vec![vec![0.0; npt - n - 1]; npt],
            xpt: vec![vec![0.0; n]; npt],
            xbase: vec![0.0; n],
            fval: vec![0.0; npt],
            xopt: vec![0.0; n],
            gopt: vec![0.0; n],
            sl: vec![0.0; n],
            su: vec![0.0; n],
            pq: vec![0.0; npt],
            xnew: vec![0.0; n],
            xalt: vec![0.0; n],
            d: vec![0.0; n],
            vlag: vec![0.0; n + npt],
            hq: vec![0.0; n * (n + 1) / 2],
        })
    }

    /// Commons `computeObjectiveValue` at `currentBest`, in the minimisation
    /// sign the algorithm works in.
    fn evaluate(&mut self) -> Result<f64, BobyqaError<E>> {
        self.evaluations += 1;
        let value = (self.objective)(&self.x).map_err(BobyqaError::Objective)?;
        Ok(if self.minimize { value } else { -value })
    }

    /// Commons `bobyqa`: move the start point away from bounds that are
    /// closer than the initial radius, then run `bobyqb`.
    fn bobyqa(&mut self, lower: &[f64], upper: &[f64]) -> Result<f64, BobyqaError<E>> {
        let rhobeg = self.initial_radius;
        for j in 0..self.n {
            let bound_diff = self.bound_difference[j];
            self.sl[j] = lower[j] - self.x[j];
            self.su[j] = upper[j] - self.x[j];
            if self.sl[j] >= -rhobeg {
                if self.sl[j] >= 0.0 {
                    self.x[j] = lower[j];
                    self.sl[j] = 0.0;
                    self.su[j] = bound_diff;
                } else {
                    self.x[j] = lower[j] + rhobeg;
                    self.sl[j] = -rhobeg;
                    let delta_one = upper[j] - self.x[j];
                    self.su[j] = jmax(delta_one, rhobeg);
                }
            } else if self.su[j] <= rhobeg {
                if self.su[j] <= 0.0 {
                    self.x[j] = upper[j];
                    self.sl[j] = -bound_diff;
                    self.su[j] = 0.0;
                } else {
                    self.x[j] = upper[j] - rhobeg;
                    let delta_one = lower[j] - self.x[j];
                    let delta_two = -rhobeg;
                    self.sl[j] = jmin(delta_one, delta_two);
                    self.su[j] = rhobeg;
                }
            }
        }
        self.bobyqb(lower, upper)
    }

    /// Clamp `xbase + offset` into the box, snapping coordinates that sit on a
    /// bound of the shifted box exactly onto the original bound.
    fn set_x_from(&mut self, offset: &[f64], lower: &[f64], upper: &[f64]) {
        for i in 0..self.n {
            let d1 = jmax(lower[i], self.xbase[i] + offset[i]);
            self.x[i] = jmin(d1, upper[i]);
            if offset[i] == self.sl[i] {
                self.x[i] = lower[i];
            }
            if offset[i] == self.su[i] {
                self.x[i] = upper[i];
            }
        }
    }

    /// Commons `bobyqb`, the main iteration.
    fn bobyqb(&mut self, lower: &[f64], upper: &[f64]) -> Result<f64, BobyqaError<E>> {
        let n = self.n;
        let npt = self.npt;
        let np = n + 1;
        let nptm = npt - np;
        let nh = n * np / 2;
        let mut work1 = vec![0.0f64; n];
        let mut work2 = vec![0.0f64; npt];
        let mut work3 = vec![0.0f64; npt];

        let mut cauchy = f64::NAN;
        let mut alpha = f64::NAN;
        let mut dsq = f64::NAN;

        self.kopt = 0;
        self.prelim(lower, upper)?;
        let mut xoptsq = 0.0;
        for i in 0..n {
            self.xopt[i] = self.xpt[self.kopt][i];
            let delta_one = self.xopt[i];
            xoptsq += delta_one * delta_one;
        }
        let mut fsave = self.fval[0];
        let kbase = 0usize;

        let mut ntrits: i64 = 0;
        let mut itest = 0;
        let mut knew: usize = 0;
        let mut nfsav = self.evaluations;
        let mut rho = self.initial_radius;
        let mut delta = rho;
        let mut diffa = 0.0;
        let mut diffb = 0.0;
        let mut diffc = 0.0;
        let mut f = 0.0;
        let mut beta = 0.0;
        let mut adelt = 0.0;
        let mut denom = 0.0;
        let mut ratio = 0.0;
        let mut dnorm = 0.0;
        let mut distsq = 0.0;

        let mut label = 20;
        loop {
            match label {
                20 => {
                    if self.kopt != kbase {
                        let mut ih = 0;
                        for j in 0..n {
                            for i in 0..=j {
                                if i < j {
                                    self.gopt[j] += self.hq[ih] * self.xopt[i];
                                }
                                self.gopt[i] += self.hq[ih] * self.xopt[j];
                                ih += 1;
                            }
                        }
                        if self.evaluations > npt {
                            for k in 0..npt {
                                let mut temp = 0.0;
                                for j in 0..n {
                                    temp += self.xpt[k][j] * self.xopt[j];
                                }
                                temp *= self.pq[k];
                                for i in 0..n {
                                    self.gopt[i] += temp * self.xpt[k][i];
                                }
                            }
                        }
                    }
                    label = 60;
                }
                60 => {
                    let mut gnew = vec![0.0f64; n];
                    let mut xbdi = vec![0.0f64; n];
                    let mut s = vec![0.0f64; n];
                    let mut hs = vec![0.0f64; n];
                    let mut hred = vec![0.0f64; n];
                    let (dsq_out, crvmin_out) =
                        self.trsbox(delta, &mut gnew, &mut xbdi, &mut s, &mut hs, &mut hred);
                    dsq = dsq_out;
                    let crvmin = crvmin_out;
                    let mut delta_one = delta;
                    let delta_two = dsq.sqrt();
                    dnorm = jmin(delta_one, delta_two);
                    if dnorm < 0.5 * rho {
                        ntrits = -1;
                        delta_one = 10.0 * rho;
                        distsq = delta_one * delta_one;
                        if self.evaluations <= nfsav + 2 {
                            label = 650;
                            continue;
                        }
                        delta_one = jmax(diffa, diffb);
                        let errbig = jmax(delta_one, diffc);
                        let frhosq = rho * (1.0 / 8.0) * rho;
                        if crvmin > 0.0 && errbig > frhosq * crvmin {
                            label = 650;
                            continue;
                        }
                        // The Java follows with a per-coordinate bound test whose
                        // `state = 650; break;` only leaves the `for`, after which
                        // `state = 680` always wins. The test has no side effects,
                        // so it is omitted (see the module docs).
                        label = 680;
                        continue;
                    }
                    ntrits += 1;
                    label = 90;
                }
                90 => {
                    if dsq <= xoptsq * (1.0 / 1000.0) {
                        let fracsq = xoptsq * (1.0 / 4.0);
                        let mut sumpq = 0.0;
                        for k in 0..npt {
                            sumpq += self.pq[k];
                            let mut sum = -0.5 * xoptsq;
                            for i in 0..n {
                                sum += self.xpt[k][i] * self.xopt[i];
                            }
                            work2[k] = sum;
                            let temp = fracsq - 0.5 * sum;
                            for i in 0..n {
                                work1[i] = self.bmat[k][i];
                                self.vlag[i] = sum * self.xpt[k][i] + temp * self.xopt[i];
                                let ip = npt + i;
                                for j in 0..=i {
                                    self.bmat[ip][j] = self.bmat[ip][j]
                                        + work1[i] * self.vlag[j]
                                        + self.vlag[i] * work1[j];
                                }
                            }
                        }
                        for m in 0..nptm {
                            let mut sumz = 0.0;
                            let mut sumw = 0.0;
                            for k in 0..npt {
                                sumz += self.zmat[k][m];
                                self.vlag[k] = work2[k] * self.zmat[k][m];
                                sumw += self.vlag[k];
                            }
                            for j in 0..n {
                                let mut sum = (fracsq * sumz - 0.5 * sumw) * self.xopt[j];
                                for k in 0..npt {
                                    sum += self.vlag[k] * self.xpt[k][j];
                                }
                                work1[j] = sum;
                                for k in 0..npt {
                                    self.bmat[k][j] += sum * self.zmat[k][m];
                                }
                            }
                            for i in 0..n {
                                let ip = i + npt;
                                let temp = work1[i];
                                for j in 0..=i {
                                    self.bmat[ip][j] += temp * work1[j];
                                }
                            }
                        }
                        let mut ih = 0;
                        for j in 0..n {
                            work1[j] = -0.5 * sumpq * self.xopt[j];
                            for k in 0..npt {
                                work1[j] += self.pq[k] * self.xpt[k][j];
                                self.xpt[k][j] -= self.xopt[j];
                            }
                            for i in 0..=j {
                                self.hq[ih] =
                                    self.hq[ih] + work1[i] * self.xopt[j] + self.xopt[i] * work1[j];
                                self.bmat[npt + i][j] = self.bmat[npt + j][i];
                                ih += 1;
                            }
                        }
                        for i in 0..n {
                            self.xbase[i] += self.xopt[i];
                            self.xnew[i] -= self.xopt[i];
                            self.sl[i] -= self.xopt[i];
                            self.su[i] -= self.xopt[i];
                            self.xopt[i] = 0.0;
                        }
                        xoptsq = 0.0;
                    }
                    label = if ntrits == 0 { 210 } else { 230 };
                }
                210 => {
                    let (alpha_out, cauchy_out) = self.altmov(knew, adelt);
                    alpha = alpha_out;
                    cauchy = cauchy_out;
                    for i in 0..n {
                        self.d[i] = self.xnew[i] - self.xopt[i];
                    }
                    label = 230;
                }
                230 => {
                    for k in 0..npt {
                        let mut suma = 0.0;
                        let mut sumb = 0.0;
                        let mut sum = 0.0;
                        for j in 0..n {
                            suma += self.xpt[k][j] * self.d[j];
                            sumb += self.xpt[k][j] * self.xopt[j];
                            sum += self.bmat[k][j] * self.d[j];
                        }
                        work3[k] = suma * (0.5 * suma + sumb);
                        self.vlag[k] = sum;
                        work2[k] = suma;
                    }
                    beta = 0.0;
                    for m in 0..nptm {
                        let mut sum = 0.0;
                        for k in 0..npt {
                            sum += self.zmat[k][m] * work3[k];
                        }
                        beta -= sum * sum;
                        for k in 0..npt {
                            self.vlag[k] += sum * self.zmat[k][m];
                        }
                    }
                    dsq = 0.0;
                    let mut bsum = 0.0;
                    let mut dx = 0.0;
                    for j in 0..n {
                        let d1 = self.d[j];
                        dsq += d1 * d1;
                        let mut sum = 0.0;
                        for k in 0..npt {
                            sum += work3[k] * self.bmat[k][j];
                        }
                        bsum += sum * self.d[j];
                        let jp = npt + j;
                        for i in 0..n {
                            sum += self.bmat[jp][i] * self.d[i];
                        }
                        self.vlag[jp] = sum;
                        bsum += sum * self.d[j];
                        dx += self.d[j] * self.xopt[j];
                    }
                    beta = dx * dx + dsq * (xoptsq + dx + dx + 0.5 * dsq) + beta - bsum;
                    self.vlag[self.kopt] += 1.0;
                    if ntrits == 0 {
                        let d1 = self.vlag[knew];
                        denom = d1 * d1 + alpha * beta;
                        if denom < cauchy && cauchy > 0.0 {
                            for i in 0..n {
                                self.xnew[i] = self.xalt[i];
                                self.d[i] = self.xnew[i] - self.xopt[i];
                            }
                            cauchy = 0.0;
                            label = 230;
                            continue;
                        }
                    } else {
                        let delsq = delta * delta;
                        let mut scaden = 0.0;
                        knew = 0;
                        for k in 0..npt {
                            if k == self.kopt {
                                continue;
                            }
                            let mut hdiag = 0.0;
                            for m in 0..nptm {
                                let d1 = self.zmat[k][m];
                                hdiag += d1 * d1;
                            }
                            let d2 = self.vlag[k];
                            let den = beta * hdiag + d2 * d2;
                            distsq = 0.0;
                            for j in 0..n {
                                let d3 = self.xpt[k][j] - self.xopt[j];
                                distsq += d3 * d3;
                            }
                            let d4 = distsq / delsq;
                            let temp = jmax(1.0, d4 * d4);
                            if temp * den > scaden {
                                scaden = temp * den;
                                knew = k;
                                denom = den;
                            }
                        }
                    }
                    label = 360;
                }
                360 => {
                    let xnew = self.xnew.clone();
                    self.set_x_from(&xnew, lower, upper);
                    f = self.evaluate()?;
                    if ntrits == -1 {
                        fsave = f;
                        label = 720;
                        continue;
                    }
                    let fopt = self.fval[self.kopt];
                    let mut vquad = 0.0;
                    let mut ih = 0;
                    for j in 0..n {
                        vquad += self.d[j] * self.gopt[j];
                        for i in 0..=j {
                            let mut temp = self.d[i] * self.d[j];
                            if i == j {
                                temp *= 0.5;
                            }
                            vquad += self.hq[ih] * temp;
                            ih += 1;
                        }
                    }
                    for k in 0..npt {
                        let d1 = work2[k];
                        let d2 = d1 * d1;
                        vquad += 0.5 * self.pq[k] * d2;
                    }
                    let diff = f - fopt - vquad;
                    diffc = diffb;
                    diffb = diffa;
                    diffa = diff.abs();
                    if dnorm > rho {
                        nfsav = self.evaluations;
                    }
                    if ntrits > 0 {
                        if vquad >= 0.0 {
                            return Err(BobyqaError::TrustRegionStepFailed(vquad));
                        }
                        ratio = (f - fopt) / vquad;
                        let h_delta = 0.5 * delta;
                        if ratio <= 0.1 {
                            delta = jmin(h_delta, dnorm);
                        } else if ratio <= 0.7 {
                            delta = jmax(h_delta, dnorm);
                        } else {
                            delta = jmax(h_delta, 2.0 * dnorm);
                        }
                        if delta <= rho * 1.5 {
                            delta = rho;
                        }
                        if f < fopt {
                            let ksav = knew;
                            let densav = denom;
                            let delsq = delta * delta;
                            let mut scaden = 0.0;
                            let mut biglsq = 0.0;
                            knew = 0;
                            for k in 0..npt {
                                let mut hdiag = 0.0;
                                for m in 0..nptm {
                                    let d1 = self.zmat[k][m];
                                    hdiag += d1 * d1;
                                }
                                let d1 = self.vlag[k];
                                let den = beta * hdiag + d1 * d1;
                                distsq = 0.0;
                                for j in 0..n {
                                    let d2 = self.xpt[k][j] - self.xnew[j];
                                    distsq += d2 * d2;
                                }
                                let d3 = distsq / delsq;
                                let temp = jmax(1.0, d3 * d3);
                                if temp * den > scaden {
                                    scaden = temp * den;
                                    knew = k;
                                    denom = den;
                                }
                                let d4 = self.vlag[k];
                                let d5 = temp * (d4 * d4);
                                biglsq = jmax(biglsq, d5);
                            }
                            if scaden <= 0.5 * biglsq {
                                knew = ksav;
                                denom = densav;
                            }
                        }
                    }

                    self.update(beta, denom, knew);

                    ih = 0;
                    let pqold = self.pq[knew];
                    self.pq[knew] = 0.0;
                    for i in 0..n {
                        let temp = pqold * self.xpt[knew][i];
                        for j in 0..=i {
                            self.hq[ih] += temp * self.xpt[knew][j];
                            ih += 1;
                        }
                    }
                    for m in 0..nptm {
                        let temp = diff * self.zmat[knew][m];
                        for k in 0..npt {
                            self.pq[k] += temp * self.zmat[k][m];
                        }
                    }

                    self.fval[knew] = f;
                    for i in 0..n {
                        self.xpt[knew][i] = self.xnew[i];
                        work1[i] = self.bmat[knew][i];
                    }
                    for k in 0..npt {
                        let mut suma = 0.0;
                        for m in 0..nptm {
                            suma += self.zmat[knew][m] * self.zmat[k][m];
                        }
                        let mut sumb = 0.0;
                        for j in 0..n {
                            sumb += self.xpt[k][j] * self.xopt[j];
                        }
                        let temp = suma * sumb;
                        for i in 0..n {
                            work1[i] += temp * self.xpt[k][i];
                        }
                    }
                    for i in 0..n {
                        self.gopt[i] += diff * work1[i];
                    }

                    if f < fopt {
                        self.kopt = knew;
                        xoptsq = 0.0;
                        ih = 0;
                        for j in 0..n {
                            self.xopt[j] = self.xnew[j];
                            let d1 = self.xopt[j];
                            xoptsq += d1 * d1;
                            for i in 0..=j {
                                if i < j {
                                    self.gopt[j] += self.hq[ih] * self.d[i];
                                }
                                self.gopt[i] += self.hq[ih] * self.d[j];
                                ih += 1;
                            }
                        }
                        for k in 0..npt {
                            let mut temp = 0.0;
                            for j in 0..n {
                                temp += self.xpt[k][j] * self.d[j];
                            }
                            temp *= self.pq[k];
                            for i in 0..n {
                                self.gopt[i] += temp * self.xpt[k][i];
                            }
                        }
                    }

                    if ntrits > 0 {
                        for k in 0..npt {
                            self.vlag[k] = self.fval[k] - self.fval[self.kopt];
                            work3[k] = 0.0;
                        }
                        for j in 0..nptm {
                            let mut sum = 0.0;
                            for k in 0..npt {
                                sum += self.zmat[k][j] * self.vlag[k];
                            }
                            for k in 0..npt {
                                work3[k] += sum * self.zmat[k][j];
                            }
                        }
                        for k in 0..npt {
                            let mut sum = 0.0;
                            for j in 0..n {
                                sum += self.xpt[k][j] * self.xopt[j];
                            }
                            work2[k] = work3[k];
                            work3[k] *= sum;
                        }
                        let mut gqsq = 0.0;
                        let mut gisq = 0.0;
                        for i in 0..n {
                            let mut sum = 0.0;
                            for k in 0..npt {
                                sum += self.bmat[k][i] * self.vlag[k] + self.xpt[k][i] * work3[k];
                            }
                            if self.xopt[i] == self.sl[i] {
                                let d1 = jmin(0.0, self.gopt[i]);
                                gqsq += d1 * d1;
                                let d2 = jmin(0.0, sum);
                                gisq += d2 * d2;
                            } else if self.xopt[i] == self.su[i] {
                                let d1 = jmax(0.0, self.gopt[i]);
                                gqsq += d1 * d1;
                                let d2 = jmax(0.0, sum);
                                gisq += d2 * d2;
                            } else {
                                let d1 = self.gopt[i];
                                gqsq += d1 * d1;
                                gisq += sum * sum;
                            }
                            self.vlag[npt + i] = sum;
                        }
                        itest += 1;
                        if gqsq < 10.0 * gisq {
                            itest = 0;
                        }
                        if itest >= 3 {
                            for i in 0..npt.max(nh) {
                                if i < n {
                                    self.gopt[i] = self.vlag[npt + i];
                                }
                                if i < npt {
                                    self.pq[i] = work2[i];
                                }
                                if i < nh {
                                    self.hq[i] = 0.0;
                                }
                                itest = 0;
                            }
                        }
                    }

                    if ntrits == 0 || f <= fopt + 0.1 * vquad {
                        label = 60;
                        continue;
                    }
                    let d1 = 2.0 * delta;
                    let d2 = 10.0 * rho;
                    distsq = jmax(d1 * d1, d2 * d2);
                    label = 650;
                }
                650 => {
                    let mut knew_found: Option<usize> = None;
                    for k in 0..npt {
                        let mut sum = 0.0;
                        for j in 0..n {
                            let d1 = self.xpt[k][j] - self.xopt[j];
                            sum += d1 * d1;
                        }
                        if sum > distsq {
                            knew_found = Some(k);
                            distsq = sum;
                        }
                    }
                    if let Some(k) = knew_found {
                        knew = k;
                        let dist = distsq.sqrt();
                        if ntrits == -1 {
                            delta = jmin(0.1 * delta, 0.5 * dist);
                            if delta <= rho * 1.5 {
                                delta = rho;
                            }
                        }
                        ntrits = 0;
                        let d1 = jmin(0.1 * dist, delta);
                        adelt = jmax(d1, rho);
                        dsq = adelt * adelt;
                        label = 90;
                        continue;
                    }
                    if ntrits == -1 {
                        label = 680;
                        continue;
                    }
                    if ratio > 0.0 || jmax(delta, dnorm) > rho {
                        label = 60;
                        continue;
                    }
                    label = 680;
                }
                680 => {
                    if rho > self.stopping_radius {
                        delta = 0.5 * rho;
                        ratio = rho / self.stopping_radius;
                        if ratio <= 16.0 {
                            rho = self.stopping_radius;
                        } else if ratio <= 250.0 {
                            rho = ratio.sqrt() * self.stopping_radius;
                        } else {
                            rho *= 0.1;
                        }
                        delta = jmax(delta, rho);
                        ntrits = 0;
                        nfsav = self.evaluations;
                        label = 60;
                        continue;
                    }
                    if ntrits == -1 {
                        label = 360;
                        continue;
                    }
                    label = 720;
                }
                720 => {
                    if self.fval[self.kopt] <= fsave {
                        let xopt = self.xopt.clone();
                        self.set_x_from(&xopt, lower, upper);
                        f = self.fval[self.kopt];
                    }
                    return Ok(f);
                }
                _ => unreachable!("bobyqb label {label}"),
            }
        }
    }

    /// Commons `altmov`: a step that keeps the interpolation well-posed when a
    /// point is replaced; returns `(alpha, cauchy)`.
    fn altmov(&mut self, knew: usize, adelt: f64) -> (f64, f64) {
        let n = self.n;
        let npt = self.npt;
        let mut glag = vec![0.0f64; n];
        let mut hcol = vec![0.0f64; npt];
        let mut work1 = vec![0.0f64; n];
        let mut work2 = vec![0.0f64; n];

        for j in 0..npt - n - 1 {
            let tmp = self.zmat[knew][j];
            for k in 0..npt {
                hcol[k] += tmp * self.zmat[k][j];
            }
        }
        let alpha = hcol[knew];
        let ha = 0.5 * alpha;

        glag.copy_from_slice(&self.bmat[knew][..n]);
        for k in 0..npt {
            let mut tmp = 0.0;
            for j in 0..n {
                tmp += self.xpt[k][j] * self.xopt[j];
            }
            tmp *= hcol[k];
            for i in 0..n {
                glag[i] += tmp * self.xpt[k][i];
            }
        }

        let mut presav = 0.0;
        let mut step = f64::NAN;
        let mut ksav = 0usize;
        let mut ibdsav: i64 = 0;
        let mut stpsav = 0.0;
        for k in 0..npt {
            if k == self.kopt {
                continue;
            }
            let mut dderiv = 0.0;
            let mut distsq = 0.0;
            for i in 0..n {
                let tmp = self.xpt[k][i] - self.xopt[i];
                dderiv += glag[i] * tmp;
                distsq += tmp * tmp;
            }
            let mut subd = adelt / distsq.sqrt();
            let mut slbd = -subd;
            let mut ilbd: i64 = 0;
            let mut iubd: i64 = 0;
            let sumin = jmin(1.0, subd);
            for i in 0..n {
                let tmp = self.xpt[k][i] - self.xopt[i];
                let ii = i as i64;
                if tmp > 0.0 {
                    if slbd * tmp < self.sl[i] - self.xopt[i] {
                        slbd = (self.sl[i] - self.xopt[i]) / tmp;
                        ilbd = -ii - 1;
                    }
                    if subd * tmp > self.su[i] - self.xopt[i] {
                        subd = jmax(sumin, (self.su[i] - self.xopt[i]) / tmp);
                        iubd = ii + 1;
                    }
                } else if tmp < 0.0 {
                    if slbd * tmp > self.su[i] - self.xopt[i] {
                        slbd = (self.su[i] - self.xopt[i]) / tmp;
                        ilbd = ii + 1;
                    }
                    if subd * tmp < self.sl[i] - self.xopt[i] {
                        subd = jmax(sumin, (self.sl[i] - self.xopt[i]) / tmp);
                        iubd = -ii - 1;
                    }
                }
            }
            step = slbd;
            let mut isbd = ilbd;
            let mut vlag;
            if k == knew {
                let diff = dderiv - 1.0;
                vlag = slbd * (dderiv - slbd * diff);
                let d1 = subd * (dderiv - subd * diff);
                if d1.abs() > vlag.abs() {
                    step = subd;
                    vlag = d1;
                    isbd = iubd;
                }
                let d2 = 0.5 * dderiv;
                let d3 = d2 - diff * slbd;
                let d4 = d2 - diff * subd;
                if d3 * d4 < 0.0 {
                    let d5 = d2 * d2 / diff;
                    if d5.abs() > vlag.abs() {
                        step = d2 / diff;
                        vlag = d5;
                        isbd = 0;
                    }
                }
            } else {
                vlag = slbd * (1.0 - slbd);
                let tmp = subd * (1.0 - subd);
                if tmp.abs() > vlag.abs() {
                    step = subd;
                    vlag = tmp;
                    isbd = iubd;
                }
                if subd > 0.5 && vlag.abs() < 0.25 {
                    step = 0.5;
                    vlag = 0.25;
                    isbd = 0;
                }
                vlag *= dderiv;
            }
            let tmp = step * (1.0 - step) * distsq;
            let predsq = vlag * vlag * (vlag * vlag + ha * tmp * tmp);
            if predsq > presav {
                presav = predsq;
                ksav = k;
                stpsav = step;
                ibdsav = isbd;
            }
        }

        for i in 0..n {
            let tmp = self.xopt[i] + stpsav * (self.xpt[ksav][i] - self.xopt[i]);
            self.xnew[i] = jmax(self.sl[i], jmin(self.su[i], tmp));
        }
        if ibdsav < 0 {
            let i = (-ibdsav - 1) as usize;
            self.xnew[i] = self.sl[i];
        }
        if ibdsav > 0 {
            let i = (ibdsav - 1) as usize;
            self.xnew[i] = self.su[i];
        }

        let bigstp = adelt + adelt;
        let mut iflag = 0;
        let mut cauchy;
        let mut csave = 0.0;
        loop {
            let wfixsq = 0.0;
            let mut ggfree = 0.0;
            for i in 0..n {
                let glag_value = glag[i];
                work1[i] = 0.0;
                if jmin(self.xopt[i] - self.sl[i], glag_value) > 0.0
                    || jmax(self.xopt[i] - self.su[i], glag_value) < 0.0
                {
                    work1[i] = bigstp;
                    ggfree += glag_value * glag_value;
                }
            }
            if ggfree == 0.0 {
                return (alpha, 0.0);
            }

            // Powell loops back here while `wfixsq` grows; Commons runs the pass
            // once, so its `wfixsq`/`ggfree` updates are never read and are
            // dropped — only the bound-fixed `work1` entries matter.
            let tmp1 = adelt * adelt - wfixsq;
            if tmp1 > 0.0 {
                step = (tmp1 / ggfree).sqrt();
                for i in 0..n {
                    if work1[i] == bigstp {
                        let tmp2 = self.xopt[i] - step * glag[i];
                        if tmp2 <= self.sl[i] {
                            work1[i] = self.sl[i] - self.xopt[i];
                        } else if tmp2 >= self.su[i] {
                            work1[i] = self.su[i] - self.xopt[i];
                        }
                    }
                }
            }

            let mut gw = 0.0;
            for i in 0..n {
                let glag_value = glag[i];
                if work1[i] == bigstp {
                    work1[i] = -step * glag_value;
                    let min = jmin(self.su[i], self.xopt[i] + work1[i]);
                    self.xalt[i] = jmax(self.sl[i], min);
                } else if work1[i] == 0.0 {
                    self.xalt[i] = self.xopt[i];
                } else if glag_value > 0.0 {
                    self.xalt[i] = self.sl[i];
                } else {
                    self.xalt[i] = self.su[i];
                }
                gw += glag_value * work1[i];
            }

            let mut curv = 0.0;
            for k in 0..npt {
                let mut tmp = 0.0;
                for j in 0..n {
                    tmp += self.xpt[k][j] * work1[j];
                }
                curv += hcol[k] * tmp * tmp;
            }
            if iflag == 1 {
                curv = -curv;
            }
            if curv > -gw && curv < -gw * (1.0 + 2f64.sqrt()) {
                let scale = -gw / curv;
                for i in 0..n {
                    let tmp = self.xopt[i] + scale * work1[i];
                    self.xalt[i] = jmax(self.sl[i], jmin(self.su[i], tmp));
                }
                let d1 = 0.5 * gw * scale;
                cauchy = d1 * d1;
            } else {
                let d1 = gw + 0.5 * curv;
                cauchy = d1 * d1;
            }

            if iflag == 0 {
                for i in 0..n {
                    glag[i] = -glag[i];
                    work2[i] = self.xalt[i];
                }
                csave = cauchy;
                iflag = 1;
            } else {
                break;
            }
        }
        if csave > cauchy {
            self.xalt.copy_from_slice(&work2);
            cauchy = csave;
        }
        (alpha, cauchy)
    }

    /// Commons `prelim`: the initial `2n + 1` (or more) interpolation points
    /// and the first quadratic model.
    fn prelim(&mut self, lower: &[f64], upper: &[f64]) -> Result<(), BobyqaError<E>> {
        let n = self.n;
        let npt = self.npt;
        let ndim = self.bmat.len();
        let rhobeg = self.initial_radius;
        let rhosq = rhobeg * rhobeg;
        let recip = 1.0 / rhosq;
        let np = n + 1;

        for j in 0..n {
            self.xbase[j] = self.x[j];
            for k in 0..npt {
                self.xpt[k][j] = 0.0;
            }
            for i in 0..ndim {
                self.bmat[i][j] = 0.0;
            }
        }
        for i in 0..n * np / 2 {
            self.hq[i] = 0.0;
        }
        for k in 0..npt {
            self.pq[k] = 0.0;
            for j in 0..npt - np {
                self.zmat[k][j] = 0.0;
            }
        }

        let mut ipt: usize = 0;
        let mut jpt: usize = 0;
        let mut fbeg = f64::NAN;
        loop {
            let nfm = self.evaluations;
            let nfx = nfm as i64 - n as i64;
            let nfmm = nfm as i64 - 1;
            let nfxm = nfx - 1;
            let mut stepa = 0.0;
            let mut stepb = 0.0;
            if nfm <= 2 * n {
                if nfm >= 1 && nfm <= n {
                    stepa = rhobeg;
                    if self.su[nfmm as usize] == 0.0 {
                        stepa = -stepa;
                    }
                    self.xpt[nfm][nfmm as usize] = stepa;
                } else if nfm > n {
                    let (nfx, nfxm) = (nfx as usize, nfxm as usize);
                    stepa = self.xpt[nfx][nfxm];
                    stepb = -rhobeg;
                    if self.sl[nfxm] == 0.0 {
                        stepb = jmin(2.0 * rhobeg, self.su[nfxm]);
                    }
                    if self.su[nfxm] == 0.0 {
                        stepb = jmax(-2.0 * rhobeg, self.sl[nfxm]);
                    }
                    self.xpt[nfm][nfxm] = stepb;
                }
            } else {
                let tmp1 = (nfm - np) / n;
                jpt = nfm - tmp1 * n - n;
                ipt = jpt + tmp1;
                if ipt > n {
                    let tmp2 = jpt;
                    jpt = ipt - n;
                    ipt = tmp2;
                }
                let ipt_minus_1 = ipt - 1;
                let jpt_minus_1 = jpt - 1;
                self.xpt[nfm][ipt_minus_1] = self.xpt[ipt][ipt_minus_1];
                self.xpt[nfm][jpt_minus_1] = self.xpt[jpt][jpt_minus_1];
            }

            for j in 0..n {
                self.x[j] = jmin(jmax(lower[j], self.xbase[j] + self.xpt[nfm][j]), upper[j]);
                if self.xpt[nfm][j] == self.sl[j] {
                    self.x[j] = lower[j];
                }
                if self.xpt[nfm][j] == self.su[j] {
                    self.x[j] = upper[j];
                }
            }

            let f = self.evaluate()?;
            let num_eval = self.evaluations;
            self.fval[nfm] = f;

            if num_eval == 1 {
                fbeg = f;
                self.kopt = 0;
            } else if f < self.fval[self.kopt] {
                self.kopt = nfm;
            }

            if num_eval <= 2 * n + 1 {
                if num_eval >= 2 && num_eval <= n + 1 {
                    let nfmm = nfmm as usize;
                    self.gopt[nfmm] = (f - fbeg) / stepa;
                    if npt < num_eval + n {
                        let one_over_step_a = 1.0 / stepa;
                        self.bmat[0][nfmm] = -one_over_step_a;
                        self.bmat[nfm][nfmm] = one_over_step_a;
                        self.bmat[npt + nfmm][nfmm] = -0.5 * rhosq;
                    }
                } else if num_eval >= n + 2 {
                    let (nfx, nfxm) = (nfx as usize, nfxm as usize);
                    let ih = nfx * (nfx + 1) / 2 - 1;
                    let tmp = (f - fbeg) / stepb;
                    let diff = stepb - stepa;
                    self.hq[ih] = 2.0 * (tmp - self.gopt[nfxm]) / diff;
                    self.gopt[nfxm] = (self.gopt[nfxm] * stepb - tmp * stepa) / diff;
                    if stepa * stepb < 0.0 && f < self.fval[nfm - n] {
                        self.fval[nfm] = self.fval[nfm - n];
                        self.fval[nfm - n] = f;
                        if self.kopt == nfm {
                            self.kopt = nfm - n;
                        }
                        self.xpt[nfm - n][nfxm] = stepb;
                        self.xpt[nfm][nfxm] = stepa;
                    }
                    self.bmat[0][nfxm] = -(stepa + stepb) / (stepa * stepb);
                    self.bmat[nfm][nfxm] = -0.5 / self.xpt[nfm - n][nfxm];
                    self.bmat[nfm - n][nfxm] = -self.bmat[0][nfxm] - self.bmat[nfm][nfxm];
                    self.zmat[0][nfxm] = 2f64.sqrt() / (stepa * stepb);
                    self.zmat[nfm][nfxm] = 0.5f64.sqrt() / rhosq;
                    self.zmat[nfm - n][nfxm] = -self.zmat[0][nfxm] - self.zmat[nfm][nfxm];
                }
            } else {
                let nfxm = nfxm as usize;
                self.zmat[0][nfxm] = recip;
                self.zmat[nfm][nfxm] = recip;
                self.zmat[ipt][nfxm] = -recip;
                self.zmat[jpt][nfxm] = -recip;
                let ih = ipt * (ipt - 1) / 2 + jpt - 1;
                let tmp = self.xpt[nfm][ipt - 1] * self.xpt[nfm][jpt - 1];
                self.hq[ih] = (fbeg - self.fval[ipt] - self.fval[jpt] + f) / tmp;
            }
            if self.evaluations >= npt {
                return Ok(());
            }
        }
    }

    /// Commons `trsbox`: the truncated conjugate-gradient trust-region step
    /// inside the box; returns `(dsq, crvmin)`.
    fn trsbox(
        &mut self,
        delta: f64,
        gnew: &mut [f64],
        xbdi: &mut [f64],
        s: &mut [f64],
        hs: &mut [f64],
        hred: &mut [f64],
    ) -> (f64, f64) {
        let n = self.n;
        let npt = self.npt;

        let mut ds;
        let mut iu;
        let (mut dhd, mut dhs, mut cth, mut shs, mut sth, mut ssq);
        let mut beta = 0.0;
        let mut sdec;
        let mut blen;
        let mut iact: i64 = -1;
        let mut nact: usize = 0;
        let mut angt = 0.0;
        let mut qred;
        let mut isav: i64;
        let mut temp;
        let mut xsav = 0.0;
        let mut xsum;
        let mut angbd = 0.0;
        let mut dredg = 0.0;
        let mut sredg = 0.0;
        let mut iterc: usize = 0;
        let mut resid;
        let mut delsq;
        let mut ggsav = 0.0;
        let (mut tempa, mut tempb);
        let mut redmax;
        let mut dredsq = 0.0;
        let mut redsav;
        let mut gredsq = 0.0;
        let mut rednew;
        let mut itcsav: usize = 0;
        let mut rdprev = 0.0;
        let mut rdnext = 0.0;
        let mut stplen;
        let mut stepsq = 0.0;
        let mut itermax: usize = 0;
        let mut crvmin;

        for i in 0..n {
            xbdi[i] = 0.0;
            if self.xopt[i] <= self.sl[i] {
                if self.gopt[i] >= 0.0 {
                    xbdi[i] = -1.0;
                }
            } else if self.xopt[i] >= self.su[i] && self.gopt[i] <= 0.0 {
                xbdi[i] = 1.0;
            }
            if xbdi[i] != 0.0 {
                nact += 1;
            }
            self.d[i] = 0.0;
            gnew[i] = self.gopt[i];
        }
        delsq = delta * delta;
        qred = 0.0;
        crvmin = -1.0;

        let mut label = 20;
        loop {
            match label {
                20 => {
                    beta = 0.0;
                    label = 30;
                }
                30 => {
                    stepsq = 0.0;
                    for i in 0..n {
                        if xbdi[i] != 0.0 {
                            s[i] = 0.0;
                        } else if beta == 0.0 {
                            s[i] = -gnew[i];
                        } else {
                            s[i] = beta * s[i] - gnew[i];
                        }
                        let d1 = s[i];
                        stepsq += d1 * d1;
                    }
                    if stepsq == 0.0 {
                        label = 190;
                        continue;
                    }
                    if beta == 0.0 {
                        gredsq = stepsq;
                        itermax = iterc + n - nact;
                    }
                    if gredsq * delsq <= qred * 1e-4 * qred {
                        label = 190;
                        continue;
                    }
                    label = 210;
                }
                50 => {
                    resid = delsq;
                    ds = 0.0;
                    shs = 0.0;
                    for i in 0..n {
                        if xbdi[i] == 0.0 {
                            let d1 = self.d[i];
                            resid -= d1 * d1;
                            ds += s[i] * self.d[i];
                            shs += s[i] * hs[i];
                        }
                    }
                    if resid <= 0.0 {
                        label = 90;
                        continue;
                    }
                    temp = (stepsq * resid + ds * ds).sqrt();
                    if ds < 0.0 {
                        blen = (temp - ds) / stepsq;
                    } else {
                        blen = resid / (temp + ds);
                    }
                    stplen = blen;
                    if shs > 0.0 {
                        stplen = jmin(blen, gredsq / shs);
                    }

                    iact = -1;
                    for i in 0..n {
                        if s[i] != 0.0 {
                            xsum = self.xopt[i] + self.d[i];
                            if s[i] > 0.0 {
                                temp = (self.su[i] - xsum) / s[i];
                            } else {
                                temp = (self.sl[i] - xsum) / s[i];
                            }
                            if temp < stplen {
                                stplen = temp;
                                iact = i as i64;
                            }
                        }
                    }

                    sdec = 0.0;
                    if stplen > 0.0 {
                        iterc += 1;
                        temp = shs / stepsq;
                        if iact == -1 && temp > 0.0 {
                            crvmin = jmin(crvmin, temp);
                            if crvmin == -1.0 {
                                crvmin = temp;
                            }
                        }
                        ggsav = gredsq;
                        gredsq = 0.0;
                        for i in 0..n {
                            gnew[i] += stplen * hs[i];
                            if xbdi[i] == 0.0 {
                                let d1 = gnew[i];
                                gredsq += d1 * d1;
                            }
                            self.d[i] += stplen * s[i];
                        }
                        let d1 = stplen * (ggsav - 0.5 * stplen * shs);
                        sdec = jmax(d1, 0.0);
                        qred += sdec;
                    }

                    if iact >= 0 {
                        let ia = iact as usize;
                        nact += 1;
                        xbdi[ia] = 1.0;
                        if s[ia] < 0.0 {
                            xbdi[ia] = -1.0;
                        }
                        let d1 = self.d[ia];
                        delsq -= d1 * d1;
                        if delsq <= 0.0 {
                            label = 190;
                            continue;
                        }
                        label = 20;
                        continue;
                    }

                    if stplen < blen {
                        if iterc == itermax || sdec <= qred * 0.01 {
                            label = 190;
                            continue;
                        }
                        beta = gredsq / ggsav;
                        label = 30;
                        continue;
                    }
                    label = 90;
                }
                90 => {
                    crvmin = 0.0;
                    label = 100;
                }
                100 => {
                    if nact >= n - 1 {
                        label = 190;
                        continue;
                    }
                    dredsq = 0.0;
                    dredg = 0.0;
                    gredsq = 0.0;
                    for i in 0..n {
                        if xbdi[i] == 0.0 {
                            let mut d1 = self.d[i];
                            dredsq += d1 * d1;
                            dredg += self.d[i] * gnew[i];
                            d1 = gnew[i];
                            gredsq += d1 * d1;
                            s[i] = self.d[i];
                        } else {
                            s[i] = 0.0;
                        }
                    }
                    itcsav = iterc;
                    label = 210;
                }
                120 => {
                    iterc += 1;
                    temp = gredsq * dredsq - dredg * dredg;
                    if temp <= qred * 1e-4 * qred {
                        label = 190;
                        continue;
                    }
                    temp = temp.sqrt();
                    for i in 0..n {
                        if xbdi[i] == 0.0 {
                            s[i] = (dredg * self.d[i] - dredsq * gnew[i]) / temp;
                        } else {
                            s[i] = 0.0;
                        }
                    }
                    sredg = -temp;

                    angbd = 1.0;
                    iact = -1;
                    for i in 0..n {
                        if xbdi[i] == 0.0 {
                            tempa = self.xopt[i] + self.d[i] - self.sl[i];
                            tempb = self.su[i] - self.xopt[i] - self.d[i];
                            // Java `state = 100; break;` inside this `for` only
                            // leaves the loop; label 210 below wins (module docs).
                            if tempa <= 0.0 {
                                nact += 1;
                                xbdi[i] = -1.0;
                                break;
                            } else if tempb <= 0.0 {
                                nact += 1;
                                xbdi[i] = 1.0;
                                break;
                            }
                            let mut d1 = self.d[i];
                            let d2 = s[i];
                            ssq = d1 * d1 + d2 * d2;
                            d1 = self.xopt[i] - self.sl[i];
                            temp = ssq - d1 * d1;
                            if temp > 0.0 {
                                temp = temp.sqrt() - s[i];
                                if angbd * temp > tempa {
                                    angbd = tempa / temp;
                                    iact = i as i64;
                                    xsav = -1.0;
                                }
                            }
                            d1 = self.su[i] - self.xopt[i];
                            temp = ssq - d1 * d1;
                            if temp > 0.0 {
                                temp = temp.sqrt() + s[i];
                                if angbd * temp > tempb {
                                    angbd = tempb / temp;
                                    iact = i as i64;
                                    xsav = 1.0;
                                }
                            }
                        }
                    }
                    label = 210;
                }
                150 => {
                    shs = 0.0;
                    dhs = 0.0;
                    dhd = 0.0;
                    for i in 0..n {
                        if xbdi[i] == 0.0 {
                            shs += s[i] * hs[i];
                            dhs += self.d[i] * hs[i];
                            dhd += self.d[i] * hred[i];
                        }
                    }

                    redmax = 0.0;
                    isav = -1;
                    redsav = 0.0;
                    iu = (angbd * 17.0 + 3.1) as i64;
                    for i in 0..iu {
                        angt = angbd * i as f64 / iu as f64;
                        sth = (angt + angt) / (1.0 + angt * angt);
                        temp = shs + angt * (angt * dhd - dhs - dhs);
                        rednew = sth * (angt * dredg - sredg - 0.5 * sth * temp);
                        if rednew > redmax {
                            redmax = rednew;
                            isav = i;
                            rdprev = redsav;
                        } else if i == isav + 1 {
                            rdnext = rednew;
                        }
                        redsav = rednew;
                    }

                    if isav < 0 {
                        label = 190;
                        continue;
                    }
                    if isav < iu {
                        temp = (rdnext - rdprev) / (redmax + redmax - rdprev - rdnext);
                        angt = angbd * (isav as f64 + 0.5 * temp) / iu as f64;
                    }
                    cth = (1.0 - angt * angt) / (1.0 + angt * angt);
                    sth = (angt + angt) / (1.0 + angt * angt);
                    temp = shs + angt * (angt * dhd - dhs - dhs);
                    sdec = sth * (angt * dredg - sredg - 0.5 * sth * temp);
                    if sdec <= 0.0 {
                        label = 190;
                        continue;
                    }

                    dredg = 0.0;
                    gredsq = 0.0;
                    for i in 0..n {
                        gnew[i] = gnew[i] + (cth - 1.0) * hred[i] + sth * hs[i];
                        if xbdi[i] == 0.0 {
                            self.d[i] = cth * self.d[i] + sth * s[i];
                            dredg += self.d[i] * gnew[i];
                            let d1 = gnew[i];
                            gredsq += d1 * d1;
                        }
                        hred[i] = cth * hred[i] + sth * hs[i];
                    }
                    qred += sdec;
                    if iact >= 0 && isav == iu {
                        nact += 1;
                        xbdi[iact as usize] = xsav;
                        label = 100;
                        continue;
                    }
                    if sdec > qred * 0.01 {
                        label = 120;
                        continue;
                    }
                    label = 190;
                }
                190 => {
                    let mut dsq = 0.0;
                    for i in 0..n {
                        let min = jmin(self.xopt[i] + self.d[i], self.su[i]);
                        self.xnew[i] = jmax(min, self.sl[i]);
                        if xbdi[i] == -1.0 {
                            self.xnew[i] = self.sl[i];
                        }
                        if xbdi[i] == 1.0 {
                            self.xnew[i] = self.su[i];
                        }
                        self.d[i] = self.xnew[i] - self.xopt[i];
                        let d1 = self.d[i];
                        dsq += d1 * d1;
                    }
                    return (dsq, crvmin);
                }
                210 => {
                    let mut ih = 0;
                    for j in 0..n {
                        hs[j] = 0.0;
                        for i in 0..=j {
                            if i < j {
                                hs[j] += self.hq[ih] * s[i];
                            }
                            hs[i] += self.hq[ih] * s[j];
                            ih += 1;
                        }
                    }
                    // `interpolationPoints.operate(s).ebeMultiply(pq)`.
                    let tmp: Vec<f64> = (0..npt)
                        .map(|k| {
                            let mut dot = 0.0;
                            for j in 0..n {
                                dot += self.xpt[k][j] * s[j];
                            }
                            dot * self.pq[k]
                        })
                        .collect();
                    for k in 0..npt {
                        if self.pq[k] != 0.0 {
                            for i in 0..n {
                                hs[i] += tmp[k] * self.xpt[k][i];
                            }
                        }
                    }
                    if crvmin != 0.0 {
                        label = 50;
                        continue;
                    }
                    if iterc > itcsav {
                        label = 150;
                        continue;
                    }
                    hred.copy_from_slice(hs);
                    label = 120;
                }
                _ => unreachable!("trsbox label {label}"),
            }
        }
    }

    /// Commons `update`: refresh `bmat` and `zmat` after `knew` is replaced.
    fn update(&mut self, beta: f64, denom: f64, knew: usize) {
        let n = self.n;
        let npt = self.npt;
        let nptm = npt - n - 1;
        let mut work = vec![0.0f64; npt + n];

        let mut ztest = 0.0;
        for k in 0..npt {
            for j in 0..nptm {
                ztest = jmax(ztest, self.zmat[k][j].abs());
            }
        }
        ztest *= 1e-20;

        for j in 1..nptm {
            let d1 = self.zmat[knew][j];
            if d1.abs() > ztest {
                let d2 = self.zmat[knew][0];
                let d3 = self.zmat[knew][j];
                let d4 = (d2 * d2 + d3 * d3).sqrt();
                let d5 = self.zmat[knew][0] / d4;
                let d6 = self.zmat[knew][j] / d4;
                for i in 0..npt {
                    let d7 = d5 * self.zmat[i][0] + d6 * self.zmat[i][j];
                    self.zmat[i][j] = d5 * self.zmat[i][j] - d6 * self.zmat[i][0];
                    self.zmat[i][0] = d7;
                }
            }
            self.zmat[knew][j] = 0.0;
        }

        for i in 0..npt {
            work[i] = self.zmat[knew][0] * self.zmat[i][0];
        }
        let alpha = work[knew];
        let tau = self.vlag[knew];
        self.vlag[knew] -= 1.0;

        let sqrt_denom = denom.sqrt();
        let d1 = tau / sqrt_denom;
        let d2 = self.zmat[knew][0] / sqrt_denom;
        for i in 0..npt {
            self.zmat[i][0] = d1 * self.zmat[i][0] - d2 * self.vlag[i];
        }

        for j in 0..n {
            let jp = npt + j;
            work[jp] = self.bmat[knew][j];
            let d3 = (alpha * self.vlag[jp] - tau * work[jp]) / denom;
            let d4 = (-beta * work[jp] - tau * self.vlag[jp]) / denom;
            for i in 0..=jp {
                self.bmat[i][j] = self.bmat[i][j] + d3 * self.vlag[i] + d4 * work[i];
                if i >= npt {
                    self.bmat[jp][i - npt] = self.bmat[i][j];
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run(
        f: impl FnMut(&[f64]) -> Result<f64, ()>,
        start: &[f64],
        lower: &[f64],
        upper: &[f64],
        minimize: bool,
    ) -> BobyqaOutcome {
        let problem = BobyqaProblem {
            start,
            lower,
            upper,
            minimize,
            interpolation_points: 2 * start.len() + 1,
            initial_radius: DEFAULT_INITIAL_RADIUS,
            stopping_radius: DEFAULT_STOPPING_RADIUS,
        };
        bobyqa(&problem, f).unwrap()
    }

    #[test]
    fn finds_an_unconstrained_quadratic_minimum() {
        let out = run(
            |x| Ok((x[0] - 1.0).powi(2) + 4.0 * (x[1] + 2.0).powi(2)),
            &[0.0, 0.0],
            &[-10.0, -10.0],
            &[10.0, 10.0],
            true,
        );
        assert!((out.point[0] - 1.0).abs() < 1e-6, "{:?}", out.point);
        assert!((out.point[1] + 2.0).abs() < 1e-6, "{:?}", out.point);
        assert!(out.value < 1e-10);
    }

    #[test]
    fn stops_on_the_bound_when_the_optimum_is_outside_the_box() {
        let out = run(
            |x| Ok((x[0] - 3.0).powi(2) + (x[1] - 3.0).powi(2)),
            &[0.0, 0.0],
            &[0.0, 0.0],
            &[1.0, 1.0],
            true,
        );
        assert_eq!(out.point, vec![1.0, 1.0]);
        assert_eq!(out.value, 8.0);
    }

    #[test]
    fn maximises_by_negating_and_reports_the_callers_sign() {
        let out = run(
            |x| Ok(5.0 - (x[0] - 0.5).powi(2) - (x[1] - 0.25).powi(2)),
            &[0.0, 0.0],
            &[-2.0, -2.0],
            &[2.0, 2.0],
            false,
        );
        assert!((out.value - 5.0).abs() < 1e-10, "{}", out.value);
        assert!((out.point[0] - 0.5).abs() < 1e-5 && (out.point[1] - 0.25).abs() < 1e-5);
    }

    #[test]
    fn refuses_one_dimension_and_a_bad_point_count() {
        let p = BobyqaProblem {
            start: &[0.0],
            lower: &[-1.0],
            upper: &[1.0],
            minimize: true,
            interpolation_points: 3,
            initial_radius: 1.0,
            stopping_radius: 1e-8,
        };
        assert_eq!(
            bobyqa(&p, |_| Ok::<f64, ()>(0.0)),
            Err(BobyqaError::DimensionTooSmall(1))
        );
        let p = BobyqaProblem {
            start: &[0.0, 0.0],
            lower: &[-1.0, -1.0],
            upper: &[1.0, 1.0],
            interpolation_points: 3,
            ..p
        };
        assert_eq!(
            bobyqa(&p, |_| Ok::<f64, ()>(0.0)),
            Err(BobyqaError::InterpolationPointsOutOfRange {
                npt: 3,
                min: 4,
                max: 6
            })
        );
    }

    #[test]
    fn an_objective_error_aborts_the_run() {
        let mut calls = 0;
        let p = BobyqaProblem {
            start: &[0.0, 0.0],
            lower: &[-1.0, -1.0],
            upper: &[1.0, 1.0],
            minimize: true,
            interpolation_points: 5,
            initial_radius: 0.5,
            stopping_radius: 1e-8,
        };
        let result = bobyqa(&p, |x: &[f64]| {
            calls += 1;
            if calls > 7 {
                Err("budget")
            } else {
                Ok(x[0] * x[0] + x[1] * x[1])
            }
        });
        assert_eq!(result, Err(BobyqaError::Objective("budget")));
        assert_eq!(calls, 8);
    }
}
