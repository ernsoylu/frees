package com.frees.backend.ast;

import java.util.List;

/**
 * A transient / ODE system declared by a {@code DYNAMIC … END} block. Parallel
 * to {@link ParametricTable} / {@link StateTableDef} / {@link PlotDef}: it is
 * routed out of the analytic equation stream by {@code MarkdownEquationExtractor}
 * so the analytic solver never sees a {@code der()} operator.
 *
 * <p>The body is carried structurally and only fully classified at solve time
 * (after the analytic solve resolves constants like {@code N}): {@link #forBlocks}
 * are method-of-lines loops expanded against those constants, then every body
 * equation whose left side is {@code der(X)} is a <em>state-derivative</em>
 * equation and the rest are algebraic auxiliaries (output columns). Each state
 * needs exactly one {@code der(X)=…} and one {@link InitialCondition}.
 *
 * @param name          block name (graphing surface / ODE-table name)
 * @param options       solver configuration from the header
 * @param bodyEquations top-level {@code der(X)=…} and algebraic {@code aux=…} equations
 * @param forBlocks     method-of-lines FOR loops (bodies are equations), expanded at solve
 * @param initials      initial conditions {@code X(t0)=expr}
 * @param events        zero-crossing events
 * @param sourceText    original block text for diagnostics
 */
public record DynamicSystem(
        String name,
        Options options,
        List<Equation> bodyEquations,
        List<Statement.For> forBlocks,
        List<InitialCondition> initials,
        List<Event> events,
        String sourceText) {

    /**
     * Solver configuration parsed from the header
     * {@code DYNAMIC name (method = ode45, t = t0 .. tf [s], points = …, …)}.
     * Numeric bounds are stored in SI. {@code points} (sample count) and
     * {@code step} (fixed step) are nullable — null {@code step} means adaptive.
     */
    public record Options(
            String method,
            String timeVar,
            double t0, double tf,
            Integer points,
            Double step,
            double rtol, double atol,
            Double maxStep) {
        public static final String DEFAULT_METHOD = "ode45";
        public static final double DEFAULT_RTOL = 1e-6;
        public static final double DEFAULT_ATOL = 1e-9;
        public static final int DEFAULT_POINTS = 200;
    }

    /**
     * An initial condition {@code X(t0) = value} (or {@code X[idx](t0) = value}
     * for an array state). {@code indices} is empty for a scalar state. The
     * value expression is already unit-converted to SI.
     */
    public record InitialCondition(String state, List<Expr> indices, Expr value) {}

    /**
     * A zero-crossing event {@code EVENT name: lhs = rhs [| direction] -> action}.
     * The crossing variable is {@code lhs - rhs}; {@code direction} is one of
     * {@code rising|falling|any} and {@code action} one of {@code stop|record}.
     */
    public record Event(String name, Expr lhs, Expr rhs, String direction, String action) {}
}
