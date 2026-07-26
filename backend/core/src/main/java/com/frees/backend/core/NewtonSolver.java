package com.frees.backend.core;

import com.frees.backend.ast.Differentiator;
import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Evaluator;
import com.frees.backend.ast.Expr;
import com.frees.backend.ast.ProcDef;
import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.ArrayRealVector;
import org.apache.commons.math3.linear.DecompositionSolver;
import org.apache.commons.math3.linear.LUDecomposition;
import org.apache.commons.math3.linear.RealVector;
import org.apache.commons.math3.linear.SingularMatrixException;
import org.apache.commons.math3.linear.SingularValueDecomposition;

import java.util.List;
import java.util.Map;

/**
 * Newton's method with a numerical Jacobian and step-halving, applied to one
 * block of simultaneous equations. Values of variables solved by earlier
 * blocks are passed in and held fixed. When neither the full nor any halved
 * Newton step descends, a damped (Levenberg-Marquardt) rescue takes over
 * before the block is declared stalled.
 *
 * Stopping follows the Stop Criteria: iterations stop successfully when
 * every relative residual (|lhs-rhs| / |lhs|) is below the tolerance or when
 * the largest change in a variable falls below the threshold; they abort on
 * the iteration limit or the elapsed-time budget.
 */
public class NewtonSolver {

    private static final int MAX_HALVINGS = 25;
    private static final double JACOBIAN_EPS = Math.sqrt(Math.ulp(1.0));
    /** First damping tried when the undamped Newton step cannot descend. */
    private static final double LM_LAMBDA_MIN = 1.0e-3;
    /** Damping ceiling: beyond this the damped step is a vanishing nudge. */
    private static final double LM_LAMBDA_MAX = 1.0e12;
    /** Consecutive near-flat damped iterations before the mode gives up. */
    private static final int CREEP_WINDOW = 10;
    /** An iteration is "creeping" when it reduces the norm by less than this. */
    private static final double CREEP_REDUCTION = 1.0e-3;

    private final SolverSettings settings;
    private final Map<String, ProcDef> defs;

    /** Last property failure seen while evaluating residuals; appended to
     * failure reports so a NaN stall still names its physical cause. */
    private String lastPropertyError;

    public NewtonSolver(SolverSettings settings) {
        this(settings, Map.of());
    }

    public NewtonSolver(SolverSettings settings, Map<String, ProcDef> defs) {
        this.settings = settings;
        this.defs = defs;
    }

    /** Solves one block in place; returns the number of Newton iterations used. */
    public int solveBlock(Block block, Map<String, Double> values, long deadlineNanos,
                          Map<String, VariableSpec> specs) {
        IterationContext ctx = new IterationContext(block, values, specs);
        double[] x = new double[ctx.vars.size()];
        for (int i = 0; i < ctx.vars.size(); i++) {
            x[i] = values.get(ctx.vars.get(i));
        }

        double[] residual = residuals(ctx.equations, ctx.vars, x, values);
        double norm = norm(residual);
        double lambda = 0.0; // damping carried between iterations; 0 = pure Newton
        int creep = 0;       // consecutive damped iterations with near-flat progress

        for (int iteration = 0; iteration < settings.maxIterations(); iteration++) {
            if (withinResidualTolerance(ctx.equations, ctx.vars, x, residual, values)) {
                writeBack(ctx.vars, x, values);
                return iteration;
            }
            if (System.nanoTime() > deadlineNanos) {
                throw new SolverException(String.format(
                        "Stop criteria: elapsed time exceeded %.0f s in block %d.",
                        settings.elapsedTimeSeconds(), block.index()));
            }

            double[][] jacobian = computeJacobian(ctx, x, residual);

            boolean damped = false;
            double[] candidate;
            double[] candidateResidual;
            double candidateNorm;
            if (lambda > 0.0) {
                // Damped mode: keep taking damped steps, relaxing the damping
                // while they descend (the rescue escalates it again on its own
                // when the relaxed value fails). Once the damping bottoms out,
                // hand the iteration back to pure Newton. Grinding out only
                // micro-descents means the iterate sits at a local minimum of
                // the residual norm — no damping escapes that, so stop early
                // and let the retry ladder restart from different guesses.
                if (creep >= CREEP_WINDOW) {
                    return acceptStalledOrThrow(ctx, x, residual, values, block, iteration, norm);
                }
                DampedStep rescue = dampedRescue(ctx, jacobian, x, residual, norm, lambda / 3.0, 1.0);
                if (rescue == null) {
                    return acceptStalledOrThrow(ctx, x, residual, values, block, iteration, norm);
                }
                candidate = rescue.candidate;
                candidateResidual = rescue.candidateResidual;
                candidateNorm = rescue.candidateNorm;
                lambda = rescue.lambda <= LM_LAMBDA_MIN ? 0.0 : rescue.lambda;
                creep = candidateNorm > norm * (1.0 - CREEP_REDUCTION) ? creep + 1 : 0;
                damped = true;
            } else {
                double[] step = solveLinear(jacobian, residual);
                LineSearchResult searchResult = backtrackLineSearch(ctx, x, step, norm);
                candidate = searchResult.candidate;
                candidateResidual = searchResult.candidateResidual;
                candidateNorm = searchResult.candidateNorm;

                if (!Double.isFinite(candidateNorm) || candidateNorm >= norm) {
                    // The full and every halved Newton step fail to descend —
                    // the point where this solver used to give up. Everything
                    // the damped mode does from here on can only improve on
                    // the stall the undamped iteration already reached; a
                    // descending undamped iteration is never interfered with.
                    DampedStep rescue = dampedRescue(ctx, jacobian, x, residual, norm, 0.0, 1.0);
                    if (rescue == null) {
                        return acceptStalledOrThrow(ctx, x, residual, values, block, iteration, norm);
                    }
                    candidate = rescue.candidate;
                    candidateResidual = rescue.candidateResidual;
                    candidateNorm = rescue.candidateNorm;
                    lambda = rescue.lambda;
                    creep = 0;
                    damped = true;
                }
            }

            double maxChange = 0.0;
            for (int i = 0; i < x.length; i++) {
                maxChange = Math.max(maxChange, Math.abs(x[i] - candidate[i]));
                x[i] = candidate[i];
            }
            residual = candidateResidual;
            norm = candidateNorm;

            // stop criterion: change in variables below threshold. A damped
            // step is deliberately short, so its size says nothing about
            // convergence — only an undamped step may trigger this stop.
            if (!damped && maxChange < settings.changeInVariables()) {
                return handleConvergenceOrPinning(ctx, x, residual, iteration);
            }
        }

        if (withinResidualTolerance(ctx.equations, ctx.vars, x, residual, values)) {
            writeBack(ctx.vars, x, values);
            return settings.maxIterations();
        }
        throw new SolverException(String.format(
                "Block %d did not converge within %d iterations (residual norm %g). "
                        + "Increase the iteration limit in Preferences or adjust guess values.",
                block.index(), settings.maxIterations(), norm) + propertyErrorSuffix());
    }

    /**
     * The line search can make no further progress. If the residual is already
     * within tolerance this is a converged solution sitting at its numerical
     * floor (common when a residual depends on a finite-difference/ODE-coupled
     * term) — accept it rather than fail.
     */
    private int acceptStalledOrThrow(IterationContext ctx, double[] x, double[] residual,
                                     Map<String, Double> values, Block block, int iteration, double norm) {
        if (withinResidualTolerance(ctx.equations, ctx.vars, x, residual, values)) {
            writeBack(ctx.vars, x, values);
            return iteration + 1;
        }
        throw new SolverException(
                "Newton iteration stalled in block " + block.index()
                        + " (residual " + norm + "). Try different guess values."
                        + propertyErrorSuffix());
    }

    private int handleConvergenceOrPinning(IterationContext ctx, double[] x, double[] residual, int iteration) {
        if (withinResidualTolerance(ctx.equations, ctx.vars, x, residual, ctx.values)) {
            writeBack(ctx.vars, x, ctx.values);
            return iteration + 1;
        }
        if (atBound(x, ctx.lo, ctx.hi)) {
            throw new SolverException(
                    "Constrained solution in block " + ctx.blockIndex
                            + ": a variable is pinned at its lower or upper bound "
                            + "and the residuals cannot be reduced further. "
                            + "Relax the bounds in the Variable Information window.");
        }
        throw new SolverException(
                "Iteration stalled in block " + ctx.blockIndex
                        + " before reaching the residual tolerance. "
                        + "Try different guess values.");
    }

    private String propertyErrorSuffix() {
        return lastPropertyError == null ? "" : " Last property error: " + lastPropertyError;
    }

    /** Relative residual: |lhs - rhs| / |lhs|, guarding against |lhs| ~ 0. */
    private boolean withinResidualTolerance(List<Equation> equations, List<String> vars,
                                             double[] x, double[] residual,
                                             Map<String, Double> values) {
        writeBack(vars, x, values);
        for (int i = 0; i < equations.size(); i++) {
            double lhsMagnitude;
            try {
                lhsMagnitude = Math.abs(Evaluator.eval(equations.get(i).lhs(), values, defs));
            } catch (com.frees.backend.props.PropertyEvaluationException e) {
                lastPropertyError = e.getMessage();
                return false;
            }
            double scale = Math.max(lhsMagnitude, 1.0);
            // A non-finite residual (a property call at an invalid state point)
            // is NOT within tolerance — guard explicitly, because `NaN > tol` is
            // false and would otherwise be mistaken for convergence, letting an
            // invalid guess be accepted as a solution.
            if (!Double.isFinite(residual[i]) || Math.abs(residual[i]) / scale > settings.relativeResiduals()) {
                return false;
            }
        }
        return true;
    }

    private double[] residuals(List<Equation> equations, List<String> vars,
                               double[] x, Map<String, Double> values) {
        writeBack(vars, x, values);
        double[] result = new double[equations.size()];
        for (int i = 0; i < equations.size(); i++) {
            Equation eq = equations.get(i);
            try {
                result[i] = Evaluator.eval(eq.lhs(), values, defs)
                        - Evaluator.eval(eq.rhs(), values, defs);
            } catch (com.frees.backend.props.PropertyEvaluationException e) {
                // An invalid state point (pressure below the triple point at
                // a poor guess) is a bad region, not a fatal error: NaN sends
                // the line search and the retry ladder elsewhere.
                lastPropertyError = e.getMessage();
                result[i] = Double.NaN;
            }
        }
        return result;
    }

    /**
     * Chooses between analytical and numerical Jacobian computation.
     * If every equation in the block can be symbolically differentiated w.r.t.
     * every variable, the analytical path is used; otherwise falls back to
     * the numerical finite-difference approach.
     */
    private double[][] computeJacobian(IterationContext ctx, double[] x, double[] baseResidual) {
        double[][] analytical = analyticalJacobian(ctx, x);
        if (analytical != null) {
            return analytical;
        }
        return numericalJacobian(ctx, x, baseResidual);
    }

    /**
     * Attempts to build the Jacobian entirely from symbolic derivatives.
     * Returns {@code null} if any equation cannot be differentiated w.r.t.
     * any variable, signalling fallback to numerical.
     */
    private double[][] analyticalJacobian(IterationContext ctx, double[] x) {
        int n = ctx.vars.size();
        // Pre-compute all derivative expressions: derivs[i][j] = d(residual_i)/d(var_j)
        // Only compute for equations that actually depend on the variable!
        Expr[][] derivExprs = new Expr[n][n];
        for (int j = 0; j < n; j++) {
            List<Integer> deps = ctx.varToEquations.get(j);
            for (int i : deps) {
                Equation eq = ctx.equations.get(i);
                // residual = lhs − rhs
                Expr residualExpr = new Expr.BinOp('-', eq.lhs(), eq.rhs());
                Expr d = Differentiator.differentiate(residualExpr, ctx.vars.get(j));
                if (d == null) {
                    return null; // fallback to numerical
                }
                derivExprs[i][j] = d;
            }
        }
        // Evaluate all derivative expressions at the current point.
        writeBack(ctx.vars, x, ctx.values);
        double[][] jacobian = new double[n][n];
        for (int j = 0; j < n; j++) {
            for (int i : ctx.varToEquations.get(j)) {
                try {
                    jacobian[i][j] = Evaluator.eval(derivExprs[i][j], ctx.values, defs);
                } catch (Exception e) {
                    // Evaluation failure (e.g. domain error in derivative) → fall back.
                    return null;
                }
            }
        }
        return jacobian;
    }

    private double[][] numericalJacobian(IterationContext ctx, double[] x, double[] baseResidual) {
        int n = ctx.vars.size();
        double[][] jacobian = new double[n][n];
        double[] perturbed = x.clone();
        for (int j = 0; j < n; j++) {
            computeJacobianColumn(ctx, x, baseResidual, jacobian, perturbed, j);
        }
        // Restore the unperturbed values.
        writeBack(ctx.vars, x, ctx.values);
        return jacobian;
    }

    /**
     * Builds one finite-difference column of the Jacobian with <em>range-aware</em>
     * perturbation (§8.5). A naive forward step {@code x[j]+h} can push a
     * property-table argument (CoolProp P, h, …) past the variable's valid box —
     * the property call then returns NaN, the column is poisoned, and the Newton
     * step becomes {@code clamp(NaN)=NaN}. To stay robust we:
     * <ol>
     *   <li>never probe outside the variable's {@code [lo, hi]} bounds (clamp the
     *       probe, and divide by the <em>actual</em> step taken);</li>
     *   <li>fall back to a backward step when a forward probe lands in an invalid
     *       (non-finite) region, and vice-versa;</li>
     *   <li>cap the cancellation-escape growth so it never marches a probe into an
     *       invalid region (a near-flat derivative — e.g. {@code dT/dh≈0} inside a
     *       two-phase dome — is reported honestly as ~0, not grown into NaN);</li>
     *   <li>guarantee the committed column is finite — if no informative,
     *       in-range derivative exists, the entry is left 0 (no local
     *       sensitivity) so the linear solve still produces a finite step.</li>
     * </ol>
     */
    private void computeJacobianColumn(IterationContext ctx, double[] x, double[] baseResidual,
                                       double[][] jacobian, double[] perturbed, int j) {
        List<Integer> deps = ctx.varToEquations.get(j);
        if (deps.isEmpty()) {
            return; // Variable does not appear in any equation; its entire column is 0.
        }

        String varName = ctx.vars.get(j);
        double base = x[j];
        double lo = ctx.lo[j];
        double hi = ctx.hi[j];
        double magnitude = JACOBIAN_EPS * Math.max(Math.abs(base), 1.0);

        // Probe forward first, then backward; within a direction, widen a few
        // times to escape catastrophic cancellation — but only while the probe
        // stays both in-bounds and in a finite (valid) region.
        for (int dir = 0; dir < 2; dir++) {
            double sign = (dir == 0) ? 1.0 : -1.0;
            if (sign > 0.0 && base >= hi) continue; // pinned at upper bound
            if (sign < 0.0 && base <= lo) continue;  // pinned at lower bound

            double h = magnitude;
            for (int attempt = 0; attempt < 5; attempt++) {
                double probe = Math.clamp(base + sign * h, lo, hi);
                double actualStep = probe - base;
                if (actualStep == 0.0) {
                    break; // clamped onto the bound — this direction is exhausted
                }

                double[] column = new double[deps.size()];
                boolean finite = true;
                boolean anyChange = false;
                boolean cancellation = false;

                double originalVal = ctx.values.get(varName);
                ctx.values.put(varName, probe);
                try {
                    int k = 0;
                    for (int i : deps) {
                        Equation eq = ctx.equations.get(i);
                        double rPerturbed;
                        try {
                            rPerturbed = Evaluator.eval(eq.lhs(), ctx.values, defs)
                                    - Evaluator.eval(eq.rhs(), ctx.values, defs);
                        } catch (com.frees.backend.props.PropertyEvaluationException e) {
                            rPerturbed = Double.NaN;
                        }
                        if (!Double.isFinite(rPerturbed)) {
                            finite = false;
                            break; // invalid region — abandon this direction/step
                        }
                        column[k++] = (rPerturbed - baseResidual[i]) / actualStep;
                        double change = Math.abs(rPerturbed - baseResidual[i]);
                        if (change > 0.0) {
                            anyChange = true;
                            double ulpScale = Math.ulp(Math.max(Math.abs(rPerturbed), Math.abs(baseResidual[i])));
                            if (change < 1.0e5 * ulpScale) {
                                cancellation = true;
                            }
                        }
                    }
                } finally {
                    ctx.values.put(varName, originalVal);
                }

                if (!finite) {
                    break; // growing the step only marches further into the bad region
                }
                // Commit this finite estimate; a later, cleaner attempt overwrites it.
                int k = 0;
                for (int i : deps) {
                    jacobian[i][j] = column[k++];
                }
                if (anyChange && !cancellation) {
                    return; // clean, informative column
                }
                h *= 1.0e4; // finite but noisy/cancelling — widen (still clamped next pass)
            }
        }

        // No informative in-range derivative in either direction. Guarantee a
        // finite column so the linear solve still yields a finite step.
        for (int i : deps) {
            if (!Double.isFinite(jacobian[i][j])) {
                jacobian[i][j] = 0.0;
            }
        }
    }

    private double[] solveLinear(double[][] jacobian, double[] residual) {
        int rows = jacobian.length;
        int cols = rows > 0 ? jacobian[0].length : 0;

        // Column equilibration (§8.5 automatic scaling): scale each unknown's
        // Jacobian column to unit norm so a multidomain system mixing wildly
        // different magnitudes (P~10⁵, ṁ~1, I~10⁻³, T~300) stays well-conditioned.
        // This is the similarity scaling J·D with D = diag(1/‖col‖); the step is
        // unscaled back (Δx = D·y), so it is a no-op at the root but keeps the LU
        // factorization accurate where the raw Jacobian would be ill-conditioned.
        double[] d = new double[cols];
        for (int j = 0; j < cols; j++) {
            double c = 0.0;
            for (int i = 0; i < rows; i++) {
                double val = jacobian[i][j];
                c += val * val;
            }
            c = Math.sqrt(c);
            d[j] = (c > 0.0 && Double.isFinite(c)) ? 1.0 / c : 1.0;
        }
        double[][] scaled = new double[rows][cols];
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                scaled[i][j] = jacobian[i][j] * d[j];
            }
        }

        Array2DRowRealMatrix jMat = new Array2DRowRealMatrix(scaled, false);
        ArrayRealVector rVec = new ArrayRealVector(residual, false);
        double[] y;
        try {
            DecompositionSolver solver = new LUDecomposition(jMat).getSolver();
            y = solver.solve(rVec).toArray();
        } catch (SingularMatrixException e) {
            // Fall back to SVD pseudoinverse for rank-deficient Jacobians.
            // This arises when complex expansion produces equations whose
            // imaginary part is structurally non-trivial but numerically
            // always zero (e.g., abs(V)^2 / abs(Z)).  Combined with block
            // merging, this handles underdetermined sub-systems.
            SingularValueDecomposition svd = new SingularValueDecomposition(jMat);
            y = svd.getSolver().solve(rVec).toArray();
        }
        // Unscale the step back into the original variable space.
        double[] step = new double[cols];
        for (int j = 0; j < cols; j++) {
            step[j] = d[j] * y[j];
        }
        return step;
    }

    private static boolean atBound(double[] x, double[] lo, double[] hi) {
        for (int i = 0; i < x.length; i++) {
            if (x[i] == lo[i] || x[i] == hi[i]) {
                return true;
            }
        }
        return false;
    }

    private static void writeBack(List<String> vars, double[] x, Map<String, Double> values) {
        for (int i = 0; i < vars.size(); i++) {
            values.put(vars.get(i), x[i]);
        }
    }

    private static double norm(double[] v) {
        double sum = 0.0;
        for (double value : v) {
            sum += value * value;
        }
        return Math.sqrt(sum);
    }

    private class IterationContext {
        final int blockIndex;
        final List<Equation> equations;
        final List<String> vars;
        final Map<String, Double> values;
        final double[] lo;
        final double[] hi;
        final List<List<Integer>> varToEquations;

        IterationContext(Block block, Map<String, Double> values, Map<String, VariableSpec> specs) {
            this.blockIndex = block.index();
            this.equations = block.equations();
            this.vars = block.variables();
            this.values = values;
            int n = vars.size();
            this.lo = new double[n];
            this.hi = new double[n];
            for (int i = 0; i < n; i++) {
                VariableSpec spec = specs.get(vars.get(i));
                lo[i] = spec != null ? spec.lower() : Double.NEGATIVE_INFINITY;
                hi[i] = spec != null ? spec.upper() : Double.POSITIVE_INFINITY;
            }

            // Precompute sparse dependency matrix to avoid O(N^2) evaluations
            varToEquations = new java.util.ArrayList<>(n);
            List<java.util.Set<String>> eqVars = new java.util.ArrayList<>(equations.size());
            for (Equation eq : equations) {
                eqVars.add(eq.variables());
            }
            for (int j = 0; j < n; j++) {
                String varName = vars.get(j);
                List<Integer> deps = new java.util.ArrayList<>();
                for (int i = 0; i < equations.size(); i++) {
                    if (eqVars.get(i).contains(varName)) {
                        deps.add(i);
                    }
                }
                varToEquations.add(deps);
            }
        }
    }

    private static class LineSearchResult {
        final double[] candidate;
        final double[] candidateResidual;
        final double candidateNorm;

        LineSearchResult(double[] candidate, double[] candidateResidual, double candidateNorm) {
            this.candidate = candidate;
            this.candidateResidual = candidateResidual;
            this.candidateNorm = candidateNorm;
        }
    }

    /** An accepted damped step and the damping value that produced it. */
    private static final class DampedStep {
        final double[] candidate;
        final double[] candidateResidual;
        final double candidateNorm;
        final double lambda;

        DampedStep(double[] candidate, double[] candidateResidual, double candidateNorm, double lambda) {
            this.candidate = candidate;
            this.candidateResidual = candidateResidual;
            this.candidateNorm = candidateNorm;
            this.lambda = lambda;
        }
    }

    /**
     * Damped-step rescue (Levenberg-Marquardt): when the pure Newton direction
     * cannot descend — a near-singular or badly scaled Jacobian, or a step that
     * overshoots past the property surface's valid region — solve the damped
     * normal equations (JᵀJ + λ·diag(JᵀJ))·δ = Jᵀr instead, escalating λ until
     * a norm-reducing candidate appears. Small λ recovers the Newton step;
     * large λ yields a short, per-variable-scaled descent step that stays
     * inside the valid region. Diagonal scaling makes the damping invariant to
     * variable units, the same job the column equilibration does for the
     * undamped path. A candidate is accepted when its norm drops below
     * {@code acceptFactor * norm} (1.0 = any descent, for stalls; smaller
     * demands a decisive improvement, for creep escapes). Returns {@code null}
     * when no damping achieves that — the caller then reports the stall
     * exactly as before this rescue existed.
     */
    private DampedStep dampedRescue(IterationContext ctx, double[][] jacobian,
                                    double[] x, double[] residual, double norm,
                                    double previousLambda, double acceptFactor) {
        int n = x.length;
        double[][] jtj = new double[n][n];
        double[] jtr = new double[n];
        boolean anyRow = false;
        for (int i = 0; i < n; i++) {
            // Rows stuck in an invalid region (NaN residual or derivative)
            // carry no direction — leave them out of the normal equations.
            if (!Double.isFinite(residual[i]) || !finiteRow(jacobian[i])) {
                continue;
            }
            anyRow = true;
            double[] row = jacobian[i];
            for (int j = 0; j < n; j++) {
                jtr[j] += row[j] * residual[i];
                for (int k = 0; k < n; k++) {
                    jtj[j][k] += row[j] * row[k];
                }
            }
        }
        double maxDiag = 0.0;
        for (int j = 0; j < n; j++) {
            maxDiag = Math.max(maxDiag, jtj[j][j]);
        }
        if (!anyRow || maxDiag <= 0.0 || !Double.isFinite(maxDiag)) {
            return null; // no usable curvature information at this point
        }
        double diagFloor = 1.0e-12 * maxDiag; // keeps zero columns damped too

        for (double lam = Math.max(LM_LAMBDA_MIN, previousLambda); lam <= LM_LAMBDA_MAX; lam *= 10.0) {
            double[][] damped = new double[n][n];
            for (int j = 0; j < n; j++) {
                System.arraycopy(jtj[j], 0, damped[j], 0, n);
                damped[j][j] += lam * Math.max(jtj[j][j], diagFloor);
            }
            double[] delta;
            try {
                delta = new LUDecomposition(new Array2DRowRealMatrix(damped, false))
                        .getSolver().solve(new ArrayRealVector(jtr, false)).toArray();
            } catch (SingularMatrixException e) {
                continue; // more damping regularizes further
            }
            double[] candidate = new double[n];
            boolean moved = false;
            for (int i = 0; i < n; i++) {
                candidate[i] = Math.clamp(x[i] - delta[i], ctx.lo[i], ctx.hi[i]);
                moved |= candidate[i] != x[i];
            }
            if (!moved) {
                return null; // pinned at bounds: shorter steps cannot unpin
            }
            double[] candidateResidual = residuals(ctx.equations, ctx.vars, candidate, ctx.values);
            double candidateNorm = norm(candidateResidual);
            // A finite norm beats a non-finite one: a damped step that walks
            // the iterate back onto the valid property surface is progress.
            if (Double.isFinite(candidateNorm)
                    && (!Double.isFinite(norm) || candidateNorm < norm * acceptFactor)) {
                return new DampedStep(candidate, candidateResidual, candidateNorm, lam);
            }
        }
        return null;
    }

    private static boolean finiteRow(double[] row) {
        for (double v : row) {
            if (!Double.isFinite(v)) {
                return false;
            }
        }
        return true;
    }

    private LineSearchResult backtrackLineSearch(IterationContext ctx, double[] x, double[] step, double norm) {
        int n = x.length;
        double lambda = 1.0;
        double[] candidate = new double[n];
        double[] candidateResidual = null;
        double candidateNorm = Double.POSITIVE_INFINITY;
        for (int halving = 0; halving < MAX_HALVINGS; halving++) {
            for (int i = 0; i < n; i++) {
                candidate[i] = Math.clamp(x[i] - lambda * step[i], ctx.lo[i], ctx.hi[i]);
            }
            candidateResidual = residuals(ctx.equations, ctx.vars, candidate, ctx.values);
            candidateNorm = norm(candidateResidual);
            if (Double.isFinite(candidateNorm) && candidateNorm < norm) {
                break;
            }
            lambda /= 2.0;
        }
        return new LineSearchResult(candidate, candidateResidual, candidateNorm);
    }
}
