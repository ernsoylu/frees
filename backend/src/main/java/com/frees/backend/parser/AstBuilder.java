package com.frees.backend.parser;

import com.frees.backend.ast.Expr;
import com.frees.backend.ast.ProcDef;
import com.frees.backend.ast.ProcStatement;
import com.frees.backend.ast.Statement;
import com.frees.backend.units.UnitRegistry;

import java.util.ArrayList;
import java.util.List;

/** Converts the ANTLR parse tree into the solver's AST. */
public class AstBuilder extends FreesBaseVisitor<Expr> {

    /**
     * Variable case is unified to match their first appearance;
     * maps canonical (lowercase) name -> first-seen spelling.
     */
    private final java.util.Map<String, String> displayNames = new java.util.LinkedHashMap<>();

    public java.util.Map<String, String> displayNames() {
        return displayNames;
    }

    // ── Top-level program ────────────────────────────────────────────────────

    public record ProgramResult(
            List<Statement> statements,
            java.util.Map<String, ProcDef> defs,
            List<com.frees.backend.ast.ParametricTable> parametricTables,
            List<com.frees.backend.ast.PlotDef> plots,
            List<com.frees.backend.ast.StateTableDef> stateTables,
            List<com.frees.backend.ast.DynamicSystem> dynamicSystems) {}

    public ProgramResult buildProgram(FreesParser.ProgramContext ctx) {
        List<Statement> statements = new ArrayList<>();
        java.util.Map<String, ProcDef> defs = new java.util.LinkedHashMap<>();
        List<com.frees.backend.ast.ParametricTable> parametricTables = new ArrayList<>();
        List<com.frees.backend.ast.PlotDef> plots = new ArrayList<>();
        List<com.frees.backend.ast.StateTableDef> stateTables = new ArrayList<>();
        List<com.frees.backend.ast.DynamicSystem> dynamicSystems = new ArrayList<>();

        if (ctx.topLevel() != null) {
            for (FreesParser.TopLevelContext tl : ctx.topLevel()) {
                if (tl.functionDef() != null) {
                    ProcDef fd = buildFunctionDef(tl.functionDef());
                    defs.put(fd.name().toLowerCase(), fd);
                } else if (tl.procedureDef() != null) {
                    ProcDef.ProcedureDef pd = buildProcedureDef(tl.procedureDef());
                    defs.put(pd.name().toLowerCase(), pd);
                } else if (tl.moduleDef() != null) {
                    ProcDef.ModuleDef md = buildModuleDef(tl.moduleDef());
                    defs.put(md.name().toLowerCase(), md);
                } else if (tl.tableDef() != null) {
                    ProcDef.FunctionTableDef td = buildTableDef(tl.tableDef());
                    defs.put(td.name().toLowerCase(), td);
                } else if (tl.parametricDef() != null) {
                    parametricTables.add(buildParametricDef(tl.parametricDef()));
                } else if (tl.stateTableDef() != null) {
                    stateTables.add(buildStateTableDef(tl.stateTableDef()));
                } else if (tl.plotDef() != null) {
                    plots.add(buildPlotDef(tl.plotDef()));
                } else if (tl.dynamicDef() != null) {
                    dynamicSystems.add(buildDynamicDef(tl.dynamicDef()));
                } else if (tl.statement() != null) {
                    statements.add(buildStatement(tl.statement()));
                }
            }
        }
        return new ProgramResult(statements, defs, parametricTables, plots, stateTables,
                dynamicSystems);
    }

    // ── Transient / ODE system (DYNAMIC) ─────────────────────────────────────

    /**
     * Builds a {@code DYNAMIC … END} block into a {@link com.frees.backend.ast.DynamicSystem}.
     * The header is parsed into solver {@link com.frees.backend.ast.DynamicSystem.Options};
     * body items are sorted into equations (der/aux), method-of-lines FOR loops,
     * initial conditions and events. Full state/derivative classification is
     * deferred to solve time (after FOR loops expand against solved constants).
     */
    private com.frees.backend.ast.DynamicSystem buildDynamicDef(FreesParser.DynamicDefContext ctx) {
        String name = ctx.IDENT().getText();
        com.frees.backend.ast.DynamicSystem.Options options = buildDynamicOptions(name, ctx.dynamicHeader());

        List<com.frees.backend.ast.Equation> bodyEquations = new ArrayList<>();
        List<Statement.For> forBlocks = new ArrayList<>();
        List<com.frees.backend.ast.DynamicSystem.InitialCondition> initials = new ArrayList<>();
        List<com.frees.backend.ast.DynamicSystem.Event> events = new ArrayList<>();

        for (FreesParser.DynamicItemContext item : ctx.dynamicItem()) {
            if (item instanceof FreesParser.DynItemEventContext ev) {
                events.add(buildDynamicEvent(ev.dynamicEvent()));
            } else if (item instanceof FreesParser.DynItemInitContext init) {
                initials.add(buildDynamicInit(init));
            } else if (item instanceof FreesParser.DynItemForContext forItem) {
                forBlocks.add(buildForBlock(forItem.forBlock()));
            } else if (item instanceof FreesParser.DynItemEqContext eqItem) {
                FreesParser.EquationContext eq = eqItem.equation();
                bodyEquations.add(new com.frees.backend.ast.Equation(
                        visit(eq.expr(0)), visit(eq.expr(1)), eq.getText()));
            }
        }
        return new com.frees.backend.ast.DynamicSystem(name, options, bodyEquations,
                forBlocks, initials, events, ctx.getText());
    }

    private com.frees.backend.ast.DynamicSystem.Options buildDynamicOptions(
            String blockName, FreesParser.DynamicHeaderContext header) {
        String method = com.frees.backend.ast.DynamicSystem.Options.DEFAULT_METHOD;
        String timeVar = "t";
        Double t0 = null;
        Double tf = null;
        Integer points = null;
        Double step = null;
        double rtol = com.frees.backend.ast.DynamicSystem.Options.DEFAULT_RTOL;
        double atol = com.frees.backend.ast.DynamicSystem.Options.DEFAULT_ATOL;
        Double maxStep = null;

        if (header != null) {
            for (FreesParser.DynamicOptContext opt : header.dynamicOpt()) {
                String key = opt.IDENT().getText().toLowerCase();
                FreesParser.DynamicOptValContext val = opt.dynamicOptVal();
                switch (key) {
                    case "t", "time", "tspan" -> {
                        if (!(val instanceof FreesParser.DynOptRangeContext range)) {
                            throw new EquationParser.ParseException("DYNAMIC " + blockName
                                    + ": '" + key + "' must be a range, e.g. t = 0 .. 600 [s].");
                        }
                        double factor = unitFactor(range.unit());
                        double offset = unitOffset(range.unit());
                        timeVar = key.equals("tspan") ? "t" : key;
                        t0 = signedNumberValue(range.signedNumber(0)) * factor + offset;
                        tf = signedNumberValue(range.signedNumber(1)) * factor + offset;
                    }
                    case "method", "solver" -> method = optIdent(blockName, key, val).toLowerCase();
                    case "points", "n" -> points = (int) Math.round(optNumber(blockName, key, val));
                    case "step", "dt", "fixedstep" -> step = optNumber(blockName, key, val);
                    case "rtol", "reltol" -> rtol = optNumber(blockName, key, val);
                    case "atol", "abstol" -> atol = optNumber(blockName, key, val);
                    case "maxstep" -> maxStep = optNumber(blockName, key, val);
                    default -> throw new EquationParser.ParseException("DYNAMIC " + blockName
                            + ": unknown option '" + key + "'. Supported: method, t, points, "
                            + "step, rtol, atol, maxstep.");
                }
            }
        }
        if (t0 == null) {
            throw new EquationParser.ParseException("DYNAMIC " + blockName
                    + ": missing required time span 't = t0 .. tf'.");
        }
        return new com.frees.backend.ast.DynamicSystem.Options(
                method, timeVar, t0, tf, points, step, rtol, atol, maxStep);
    }

    private double optNumber(String blockName, String key, FreesParser.DynamicOptValContext val) {
        if (val instanceof FreesParser.DynOptNumContext num) {
            return signedNumberValue(num.signedNumber())
                    * unitFactor(num.unit()) + unitOffset(num.unit());
        }
        throw new EquationParser.ParseException("DYNAMIC " + blockName
                + ": option '" + key + "' must be a number.");
    }

    private String optIdent(String blockName, String key, FreesParser.DynamicOptValContext val) {
        if (val instanceof FreesParser.DynOptIdentContext id) {
            return id.IDENT().getText();
        }
        throw new EquationParser.ParseException("DYNAMIC " + blockName
                + ": option '" + key + "' must be a name (e.g. " + key + " = ode45).");
    }

    private double unitFactor(FreesParser.UnitContext unitCtx) {
        if (unitCtx == null) {
            return 1.0;
        }
        try {
            return UnitRegistry.parseWithOffset(extractUnit(unitCtx)).factor();
        } catch (UnitRegistry.UnknownUnitException ignored) {
            return 1.0;
        }
    }

    private double unitOffset(FreesParser.UnitContext unitCtx) {
        if (unitCtx == null) {
            return 0.0;
        }
        try {
            return UnitRegistry.parseWithOffset(extractUnit(unitCtx)).offset();
        } catch (UnitRegistry.UnknownUnitException ignored) {
            return 0.0;
        }
    }

    private com.frees.backend.ast.DynamicSystem.InitialCondition buildDynamicInit(
            FreesParser.DynItemInitContext ctx) {
        String state = ctx.IDENT().getText().toLowerCase();
        List<Expr> indices = new ArrayList<>();
        if (ctx.arrayIndexList() != null) {
            for (FreesParser.ArrayIndexContext idx : ctx.arrayIndexList().arrayIndex()) {
                indices.add(buildArrayIndex(idx));
            }
        }
        Expr value = visit(ctx.expr());
        return new com.frees.backend.ast.DynamicSystem.InitialCondition(state, indices, value);
    }

    private Expr buildArrayIndex(FreesParser.ArrayIndexContext idx) {
        if (idx.COLON() != null) {
            return new Expr.Range(visit(idx.expr(0)), visit(idx.expr(1)));
        }
        return visit(idx.expr(0));
    }

    private com.frees.backend.ast.DynamicSystem.Event buildDynamicEvent(
            FreesParser.DynamicEventContext ctx) {
        String name = ctx.IDENT(0).getText();
        String action = ctx.IDENT(ctx.IDENT().size() - 1).getText().toLowerCase();
        String direction = ctx.PIPE() != null
                ? ctx.IDENT(1).getText().toLowerCase()
                : "any";
        FreesParser.EquationContext eq = ctx.equation();
        return new com.frees.backend.ast.DynamicSystem.Event(
                name, visit(eq.expr(0)), visit(eq.expr(1)), direction, action);
    }

    /** Builds a fluid state table: the declared state-point variables plus the
     * fluid declared with a {@code FLUID = <name>} attribute line (if any). */
    // A state-table member must carry a state number (T1, P_2, h[3]); thermodynamic
    // states are always numbered. A bare, numberless name (e.g. xrefg) is rejected.
    private static final java.util.regex.Pattern STATE_INDEX_PATTERN =
            java.util.regex.Pattern.compile("^[a-z][a-z_]*?(?:_?\\d+|\\[\\d+\\])$",
                    java.util.regex.Pattern.CASE_INSENSITIVE);

    private com.frees.backend.ast.StateTableDef buildStateTableDef(FreesParser.StateTableDefContext ctx) {
        String name = ctx.IDENT().getText();
        List<String> vars = buildParamList(ctx.paramList());
        for (String var : vars) {
            if (!STATE_INDEX_PATTERN.matcher(var).matches()) {
                throw new EquationParser.ParseException(String.format(
                        "STATE TABLE '%s': variable '%s' has no state number. "
                                + "State variables must be numbered (e.g. %s1 or %s[1]).",
                        name, var, var, var));
            }
        }
        String fluid = null;
        for (FreesParser.StateTableAttrContext attr : ctx.stateTableAttr()) {
            if (!"fluid".equals(attr.IDENT().getText().toLowerCase())) {
                continue;
            }
            FreesParser.StateAttrValueContext v = attr.stateAttrValue();
            fluid = v.STRING_LITERAL() != null
                    ? unquote(v.STRING_LITERAL().getText())
                    : v.IDENT().getText();
        }
        return new com.frees.backend.ast.StateTableDef(name, vars, fluid);
    }

    /** Builds a code-defined plot: a name and a raw {@code key -> values} map of
     * attributes the frontend maps onto its PlotSpec. Values are normalized to
     * their string form (string content, number text, or variable base name). */
    private com.frees.backend.ast.PlotDef buildPlotDef(FreesParser.PlotDefContext ctx) {
        String name = unquote(ctx.STRING_LITERAL().getText());
        java.util.Map<String, List<String>> attributes = new java.util.LinkedHashMap<>();
        for (FreesParser.PlotAttrContext attr : ctx.plotAttr()) {
            String key = attr.IDENT().getText().toLowerCase();
            List<String> values = new ArrayList<>();
            for (FreesParser.PlotValueContext value : attr.plotValue()) {
                values.add(plotValueText(value));
            }
            attributes.put(key, values);
        }
        return new com.frees.backend.ast.PlotDef(name, attributes);
    }

    private String plotValueText(FreesParser.PlotValueContext value) {
        if (value instanceof FreesParser.PlotValStrContext str) {
            return unquote(str.STRING_LITERAL().getText());
        }
        if (value instanceof FreesParser.PlotValRefContext ref) {
            return ref.IDENT().getText();
        }
        // PlotValNum (and any fallback): the literal source text.
        return value.getText();
    }

    /** Builds a parametric run-table: each column is a declared variable filled
     * by a range or an explicit list; columns are aligned into row-major rows. */
    private com.frees.backend.ast.ParametricTable buildParametricDef(FreesParser.ParametricDefContext ctx) {
        String name = ctx.IDENT().getText();
        List<String> vars = buildParamList(ctx.paramList());

        java.util.Map<String, List<Double>> columns = new java.util.LinkedHashMap<>();
        for (FreesParser.ParamColumnContext colCtx : ctx.paramColumn()) {
            if (colCtx instanceof FreesParser.ParamColRangeContext range) {
                String col = range.IDENT(0).getText().toLowerCase();
                List<FreesParser.SignedNumberContext> nums = range.signedNumber();
                boolean threeForm = nums.size() == 3;
                double start = signedNumberValue(nums.get(0));
                double stop = signedNumberValue(nums.get(threeForm ? 2 : 1));
                double middle = threeForm ? signedNumberValue(nums.get(1)) : 1.0;
                String fill = range.PIPE() != null ? range.IDENT(1).getText().toLowerCase() : "linear";
                columns.put(col, switch (fill) {
                    case "linear" -> linearRange(col, start, middle, stop);
                    case "log" -> logRange(col, start, middle, stop, threeForm);
                    default -> throw new EquationParser.ParseException(
                            "Unknown range spacing '" + range.IDENT(1).getText() + "' in PARAMETRIC "
                                    + name + ". Supported: Linear, Log.");
                });
            } else if (colCtx instanceof FreesParser.ParamColListContext list) {
                String col = list.IDENT().getText().toLowerCase();
                List<Double> vals = new ArrayList<>();
                for (FreesParser.SignedNumberContext sn : list.numberList().signedNumber()) {
                    vals.add(signedNumberValue(sn));
                }
                columns.put(col, vals);
            }
        }

        int numRows = columns.values().stream().mapToInt(List::size).max().orElse(0);
        List<List<Double>> rows = new ArrayList<>();
        for (int i = 0; i < numRows; i++) {
            List<Double> row = new ArrayList<>();
            for (String var : vars) {
                List<Double> col = columns.get(var);
                row.add(col != null && i < col.size() ? col.get(i) : null);
            }
            rows.add(row);
        }
        return new com.frees.backend.ast.ParametricTable(name, vars, rows);
    }

    // ── FUNCTION / PROCEDURE / MODULE definitions ────────────────────────────

    /**
     * Builds a FUNCTION block. The single-output form
     * {@code FUNCTION f(x) ... f := ... END} becomes a {@link ProcDef.FunctionDef}
     * (callable inline in expressions). The MATLAB-style multi-output form
     * {@code FUNCTION [a, b] = f(x) ... END} is lowered to a
     * {@link ProcDef.ProcedureDef} — its outputs are the bracketed names assigned
     * in the body — so it reuses the procedure call/flatten machinery and is
     * consumed with {@code [p, q] = f(x)} (see {@link #buildMultiAssign}).
     */
    private ProcDef buildFunctionDef(FreesParser.FunctionDefContext ctx) {
        String name = ctx.IDENT().getText().toLowerCase();
        List<String> params = buildParamList(ctx.paramList());
        List<ProcStatement> body = buildProcBody(ctx.procBody());
        if (ctx.funcOutputs() != null) {
            List<String> outputs = new ArrayList<>();
            for (org.antlr.v4.runtime.tree.TerminalNode id : ctx.funcOutputs().IDENT()) {
                outputs.add(id.getText().toLowerCase());
            }
            return new ProcDef.ProcedureDef(name, params, outputs, body);
        }
        return new ProcDef.FunctionDef(name, params, body,
                siUnitOf(ctx.unit()), paramUnits(ctx.paramList()));
    }

    /**
     * SI units for each parameter's optional [unit] annotation, aligned to the
     * parameter list (null where a parameter carries no unit). Lets a call like
     * {@code fanCurve(Vair/f_rpm)} ground the argument's variable.
     */
    private List<String> paramUnits(FreesParser.ParamListContext ctx) {
        List<String> units = new ArrayList<>();
        if (ctx == null) {
            return units;
        }
        for (int i = 0; i < ctx.getChildCount(); i++) {
            var child = ctx.getChild(i);
            if (child instanceof FreesParser.UnitContext uc) {
                units.set(units.size() - 1, siUnitOf(uc));
            } else if (child instanceof org.antlr.v4.runtime.tree.TerminalNode tn
                    && !",".equals(tn.getText())) {
                units.add(null); // a parameter IDENT; unit (if any) follows
            }
        }
        return units;
    }

    /**
     * SI unit string for an optional [unit] annotation on a TABLE/FUNCTION
     * output (e.g. {@code TABLE fanCurve(Vair) [Pa]}). Returns null when absent
     * or unparseable; lets derived variables inherit the declared dimensions.
     */
    private String siUnitOf(FreesParser.UnitContext unitCtx) {
        if (unitCtx == null) {
            return null;
        }
        int startIdx = unitCtx.start.getStartIndex();
        int stopIdx = unitCtx.stop.getStopIndex();
        String bracketed = unitCtx.start.getInputStream()
                .getText(new org.antlr.v4.runtime.misc.Interval(startIdx, stopIdx));
        String unit = bracketed.substring(1, bracketed.length() - 1).trim();
        if (unit.isEmpty()) {
            return null;
        }
        try {
            return UnitRegistry.siName(UnitRegistry.parseWithOffset(unit).dims());
        } catch (UnitRegistry.UnknownUnitException ignored) {
            return null;
        }
    }

    private ProcDef.ProcedureDef buildProcedureDef(FreesParser.ProcedureDefContext ctx) {
        String name = ctx.IDENT().getText().toLowerCase();
        List<String> inputs = buildParamList(ctx.paramList(0));
        List<String> outputs = buildParamList(ctx.paramList(1));
        List<ProcStatement> body = buildProcBody(ctx.procBody());
        return new ProcDef.ProcedureDef(name, inputs, outputs, body);
    }

    private ProcDef.ModuleDef buildModuleDef(FreesParser.ModuleDefContext ctx) {
        String name = ctx.IDENT().getText().toLowerCase();
        List<String> inputs = buildParamList(ctx.paramList(0));
        List<String> outputs = buildParamList(ctx.paramList(1));
        List<Statement> body = new ArrayList<>();
        if (ctx.statementList() != null) {
            for (FreesParser.StatementContext stmtCtx : ctx.statementList().statement()) {
                body.add(buildStatement(stmtCtx));
            }
        }
        return new ProcDef.ModuleDef(name, inputs, outputs, body);
    }

    // ── Code-defined Function/Curve table (TABLE ... END) ────────────────────

    /**
     * Builds a tabulated curve function from a TABLE block. The first body
     * column is the lookup argument; each further column is one curve. A 1D
     * table has a single (param=null) curve; a family declares its parameter
     * values in the header (TABLE name(arg : p = v1, v2)). Produces the same
     * {@link ProcDef.FunctionTableDef} the Graph Digitizer emits, so the
     * solver/Evaluator/CurveInterpolator handle it unchanged.
     */
    private ProcDef.FunctionTableDef buildTableDef(FreesParser.TableDefContext ctx) {
        String name = ctx.IDENT(0).getText().toLowerCase();
        String argName = ctx.IDENT(1).getText().toLowerCase();
        boolean family = ctx.numberList() != null;

        List<Double> paramValues = new ArrayList<>();
        if (family) {
            for (FreesParser.SignedNumberContext sn : ctx.numberList().signedNumber()) {
                paramValues.add(signedNumberValue(sn));
            }
        }

        boolean xLog = false;
        boolean yLog = false;
        if (ctx.tableFlags() != null) {
            for (var flag : ctx.tableFlags().IDENT()) {
                String f = flag.getText().toLowerCase();
                if (f.equals("xlog") || f.equals("logx")) {
                    xLog = true;
                } else if (f.equals("ylog") || f.equals("logy")) {
                    yLog = true;
                } else {
                    throw new EquationParser.ParseException(
                            "Unknown TABLE flag '" + flag.getText() + "' in " + name
                                    + "(...). Supported flags: XLOG, YLOG.");
                }
            }
        }

        // Read every row as [x, y1, y2, ...]; ragged rows simply omit later columns.
        List<double[]> rows = new ArrayList<>();
        int maxCols = 0;
        for (FreesParser.TableRowContext rowCtx : ctx.tableRow()) {
            List<FreesParser.SignedNumberContext> nums = rowCtx.signedNumber();
            double[] row = new double[nums.size()];
            for (int i = 0; i < nums.size(); i++) {
                row[i] = signedNumberValue(nums.get(i));
            }
            rows.add(row);
            maxCols = Math.max(maxCols, row.length);
        }
        int curveCount = Math.max(1, maxCols - 1);
        if (family && paramValues.size() != curveCount) {
            throw new EquationParser.ParseException(
                    "TABLE " + name + ": header declares " + paramValues.size()
                            + " curve parameter value(s) but the rows have " + curveCount
                            + " value column(s).");
        }

        List<ProcDef.Curve> curves = new ArrayList<>();
        for (int j = 0; j < curveCount; j++) {
            List<double[]> pts = new ArrayList<>();
            for (double[] row : rows) {
                if (row.length >= j + 2) {
                    pts.add(new double[]{row[0], row[j + 1]});
                }
            }
            pts.sort((a, b) -> Double.compare(a[0], b[0]));
            double[] xs = new double[pts.size()];
            double[] ys = new double[pts.size()];
            for (int i = 0; i < pts.size(); i++) {
                xs[i] = pts.get(i)[0];
                ys[i] = pts.get(i)[1];
            }
            curves.add(new ProcDef.Curve(family ? paramValues.get(j) : null, xs, ys));
        }

        List<String> argNames = new ArrayList<>();
        argNames.add(argName);
        if (family) {
            argNames.add(ctx.IDENT(2).getText().toLowerCase());
        }
        // Two optional [unit]s: the argument unit (inside the parens, before
        // RPAREN) and the output unit (after RPAREN). Split them by position.
        FreesParser.UnitContext argUnitCtx = null;
        FreesParser.UnitContext outUnitCtx = null;
        int rparenIdx = ctx.RPAREN().getSymbol().getTokenIndex();
        for (FreesParser.UnitContext u : ctx.unit()) {
            if (u.start.getTokenIndex() < rparenIdx) {
                argUnitCtx = u;
            } else {
                outUnitCtx = u;
            }
        }
        List<String> argUnits = new ArrayList<>();
        argUnits.add(siUnitOf(argUnitCtx));
        if (family) {
            argUnits.add(null); // family-parameter units are not annotated yet
        }
        return new ProcDef.FunctionTableDef(name, argNames, xLog, yLog, curves,
                siUnitOf(outUnitCtx), argUnits);
    }

    private static double signedNumberValue(FreesParser.SignedNumberContext ctx) {
        double v = Double.parseDouble(ctx.NUMBER().getText());
        return ctx.MINUS() != null ? -v : v;
    }

    private List<String> buildParamList(FreesParser.ParamListContext ctx) {
        List<String> params = new ArrayList<>();
        if (ctx != null) {
            for (var ident : ctx.IDENT()) {
                params.add(ident.getText().toLowerCase());
            }
        }
        return params;
    }

    // ── Procedural body ──────────────────────────────────────────────────────

    private List<ProcStatement> buildProcBody(FreesParser.ProcBodyContext ctx) {
        List<ProcStatement> stmts = new ArrayList<>();
        if (ctx != null && ctx.procStatement() != null) {
            for (FreesParser.ProcStatementContext ps : ctx.procStatement()) {
                stmts.add(buildProcStatement(ps));
            }
        }
        return stmts;
    }

    private ProcStatement buildProcStatement(FreesParser.ProcStatementContext ctx) {
        if (ctx.assignment() != null) {
            return buildAssignment(ctx.assignment());
        } else if (ctx.ifStatement() != null) {
            return buildIfStatement(ctx.ifStatement());
        } else if (ctx.repeatStatement() != null) {
            return buildRepeatStatement(ctx.repeatStatement());
        } else if (ctx.whileStatement() != null) {
            return buildWhileStatement(ctx.whileStatement());
        } else if (ctx.forBlock() != null) {
            return buildProcFor(ctx.forBlock());
        } else {
            // equation
            FreesParser.EquationContext eq = ctx.equation();
            Expr lhs = visit(eq.expr(0));
            Expr rhs = visit(eq.expr(1));
            return new ProcStatement.Eq(lhs, rhs, eq.getText());
        }
    }

    private ProcStatement.Assign buildAssignment(FreesParser.AssignmentContext ctx) {
        String target = ctx.IDENT().getText().toLowerCase();
        Expr value = visit(ctx.expr());
        return new ProcStatement.Assign(target, value);
    }

    private ProcStatement.IfElse buildIfStatement(FreesParser.IfStatementContext ctx) {
        Expr condition = buildBoolExpr(ctx.boolExpr());
        List<ProcStatement> thenBranch = buildProcBody(ctx.procBody(0));
        List<ProcStatement> elseBranch = ctx.procBody().size() > 1
                ? buildProcBody(ctx.procBody(1))
                : List.of();
        return new ProcStatement.IfElse(condition, thenBranch, elseBranch);
    }

    private ProcStatement.RepeatUntil buildRepeatStatement(FreesParser.RepeatStatementContext ctx) {
        List<ProcStatement> body = buildProcBody(ctx.procBody());
        Expr condition = buildBoolExpr(ctx.boolExpr());
        return new ProcStatement.RepeatUntil(body, condition);
    }

    private ProcStatement.For buildProcFor(FreesParser.ForBlockContext ctx) {
        String varName = ctx.IDENT().getText().toLowerCase();
        Expr start = visit(ctx.expr(0));
        Expr end = visit(ctx.expr(1));
        // procBody version — re-parse body as proc statements (for loop inside proc body)
        List<ProcStatement> body = new ArrayList<>();
        if (ctx.statementList() != null) {
            for (FreesParser.StatementContext stmtCtx : ctx.statementList().statement()) {
                Statement s = buildStatement(stmtCtx);
                // Convert Statement.Eq to ProcStatement.Eq for procedural context
                if (s instanceof Statement.Eq(Expr lhs, Expr rhs, String sourceText)) {
                    body.add(new ProcStatement.Eq(lhs, rhs, sourceText));
                }
                // FOR inside FOR inside PROC is not supported; skip silently
            }
        }
        return new ProcStatement.For(varName, start, end, body);
    }

    private ProcStatement.While buildWhileStatement(FreesParser.WhileStatementContext ctx) {
        Expr condition = buildBoolExpr(ctx.boolExpr());
        List<ProcStatement> body = buildProcBody(ctx.procBody());
        return new ProcStatement.While(condition, body);
    }

    // ── Boolean expression ────────────────────────────────────────────────────

    private Expr buildBoolExpr(FreesParser.BoolExprContext ctx) {
        return switch (ctx) {
            case FreesParser.BoolNotContext not ->
                    new Expr.Not(buildBoolExpr(not.boolExpr()));
            case FreesParser.BoolAndContext and ->
                    new Expr.Logical("and",
                            buildBoolExpr(and.boolExpr(0)),
                            buildBoolExpr(and.boolExpr(1)));
            case FreesParser.BoolOrContext or ->
                    new Expr.Logical("or",
                            buildBoolExpr(or.boolExpr(0)),
                            buildBoolExpr(or.boolExpr(1)));
            case FreesParser.BoolParenContext paren ->
                    buildBoolExpr(paren.boolExpr());
            case FreesParser.BoolRelContext rel -> {
                Expr left = visit(rel.expr(0));
                Expr right = visit(rel.expr(1));
                // Extract the operator token text (child at index 1)
                String op = rel.getChild(1).getText();
                yield new Expr.Compare(op, left, right);
            }
            case FreesParser.BoolTruthyContext plain ->
                    visit(plain.expr());
            default -> throw new IllegalStateException("Unexpected boolExpr type: " + ctx.getClass().getSimpleName());
        };
    }

    // ── Top-level statement ───────────────────────────────────────────────────

    public Statement buildStatement(FreesParser.StatementContext ctx) {
        if (ctx.forBlock() != null) {
            return buildForBlock(ctx.forBlock());
        } else if (ctx.callStatement() != null) {
            return buildCallStatement(ctx.callStatement());
        } else if (ctx.multiAssign() != null) {
            return buildMultiAssign(ctx.multiAssign());
        } else if (ctx.rangeAssign() != null) {
            return buildRangeAssign(ctx.rangeAssign());
        } else {
            return buildEquation(ctx.equation());
        }
    }

    /** Maximum elements a single range may generate, to keep a typo like
     * {@code x = 0:0.0000001:100} from exploding the equation system. */
    private static final int MAX_RANGE_ELEMENTS = 100_000;

    /**
     * MATLAB-style range that fills an array: {@code speed = 0:10:100 | Linear}.
     * Lowered to the equivalent array assignment {@code speed[1:N] = [v1, ...]}
     * so the existing array-literal expansion in EquationParser materializes the
     * element equations. Linear (default) uses an arithmetic step; Log treats
     * the middle number as a point count and spaces values geometrically.
     */
    private Statement.Eq buildRangeAssign(FreesParser.RangeAssignContext ctx) {
        String var = ctx.IDENT(0).getText().toLowerCase();
        List<FreesParser.SignedNumberContext> nums = ctx.signedNumber();
        boolean threeForm = nums.size() == 3;
        double start = signedNumberValue(nums.get(0));
        double stop = signedNumberValue(nums.get(threeForm ? 2 : 1));
        // 2-number form (start:stop) implies step 1; 3-number form gives step/count.
        double middle = threeForm ? signedNumberValue(nums.get(1)) : 1.0;

        String fill = ctx.PIPE() != null ? ctx.IDENT(1).getText().toLowerCase() : "linear";
        List<Double> values = switch (fill) {
            case "linear" -> linearRange(var, start, middle, stop);
            case "log" -> logRange(var, start, middle, stop, threeForm);
            default -> throw new EquationParser.ParseException(
                    "Unknown range spacing '" + ctx.IDENT(1).getText() + "' in " + var
                            + " = ... Supported: Linear, Log.");
        };

        Expr lhs = new Expr.ArrayAccess(var, List.of(
                new Expr.Range(new Expr.Num(1), new Expr.Num(values.size()))));
        List<Expr> elements = new ArrayList<>();
        for (double v : values) {
            elements.add(new Expr.Num(v));
        }
        return new Statement.Eq(lhs, new Expr.ArrayLiteral(elements), ctx.getText());
    }

    private static List<Double> linearRange(String var, double start, double step, double stop) {
        if (step == 0.0) {
            throw new EquationParser.ParseException("Range step is zero in " + var + " = ...");
        }
        if ((stop - start) * step < 0) {
            throw new EquationParser.ParseException(
                    "Range step points the wrong way in " + var + " = " + start + ":" + step + ":" + stop + ".");
        }
        long count = (long) Math.floor((stop - start) / step + 1e-9) + 1;
        if (count > MAX_RANGE_ELEMENTS) {
            throw new EquationParser.ParseException(
                    "Range " + var + " = ... would generate " + count + " elements (max "
                            + MAX_RANGE_ELEMENTS + "). Use a larger step.");
        }
        List<Double> values = new ArrayList<>();
        for (long k = 0; k < count; k++) {
            values.add(start + k * step);
        }
        return values;
    }

    private static List<Double> logRange(String var, double start, double countRaw,
                                         double stop, boolean threeForm) {
        if (!threeForm) {
            throw new EquationParser.ParseException(
                    "A logarithmic range needs start:count:stop (three numbers) in " + var + " = ...");
        }
        if (start <= 0 || stop <= 0) {
            throw new EquationParser.ParseException(
                    "A logarithmic range needs positive bounds in " + var + " = ...");
        }
        long count = Math.round(countRaw);
        if (count < 2) {
            throw new EquationParser.ParseException(
                    "A logarithmic range needs a point count of at least 2 in " + var + " = ...");
        }
        if (count > MAX_RANGE_ELEMENTS) {
            throw new EquationParser.ParseException(
                    "Range " + var + " = ... would generate " + count + " elements (max "
                            + MAX_RANGE_ELEMENTS + ").");
        }
        double ratio = Math.pow(stop / start, 1.0 / (count - 1));
        List<Double> values = new ArrayList<>();
        for (long k = 0; k < count; k++) {
            values.add(k == count - 1 ? stop : start * Math.pow(ratio, k));
        }
        return values;
    }

    /**
     * MATLAB-style destructuring call {@code [q, w] = split(x)} of a multi-output
     * FUNCTION. Lowered to the same {@link Statement.CallProc} a
     * {@code CALL split(x : q, w)} produces, so EquationParser's procedure
     * flattening (proc$name$k binding equations) handles it unchanged.
     */
    private Statement.CallProc buildMultiAssign(FreesParser.MultiAssignContext ctx) {
        List<Expr> outputs = new ArrayList<>();
        for (org.antlr.v4.runtime.tree.TerminalNode id : ctx.funcOutputs().IDENT()) {
            outputs.add(new Expr.Var(id.getText().toLowerCase()));
        }
        String name = ctx.IDENT().getText().toLowerCase();
        List<Expr> inputs = new ArrayList<>();
        if (ctx.callArgList() != null) {
            for (FreesParser.ExprContext exprCtx : ctx.callArgList().expr()) {
                inputs.add(visit(exprCtx));
            }
        }
        return new Statement.CallProc(name, inputs, outputs, ctx.getText());
    }

    private Statement.CallProc buildCallStatement(FreesParser.CallStatementContext ctx) {
        String name = ctx.IDENT().getText().toLowerCase();
        List<Expr> inputs = new ArrayList<>();
        if (ctx.callArgList(0) != null) {
            for (FreesParser.ExprContext exprCtx : ctx.callArgList(0).expr()) {
                inputs.add(visit(exprCtx));
            }
        }
        List<Expr> outputs = new ArrayList<>();
        if (ctx.callArgList(1) != null) {
            for (FreesParser.ExprContext exprCtx : ctx.callArgList(1).expr()) {
                outputs.add(visit(exprCtx));
            }
        }
        return new Statement.CallProc(name, inputs, outputs, ctx.getText());
    }

    public Statement.For buildForBlock(FreesParser.ForBlockContext ctx) {
        String varName = ctx.IDENT().getText().toLowerCase();
        Expr start = visit(ctx.expr(0));
        Expr end = visit(ctx.expr(1));
        List<Statement> body = new ArrayList<>();
        if (ctx.statementList() != null && ctx.statementList().statement() != null) {
            for (FreesParser.StatementContext stmtCtx : ctx.statementList().statement()) {
                body.add(buildStatement(stmtCtx));
            }
        }
        return new Statement.For(varName, start, end, body);
    }

    public Statement.Eq buildEquation(FreesParser.EquationContext ctx) {
        Expr lhs = visit(ctx.expr(0));
        Expr rhs = visit(ctx.expr(1));
        return new Statement.Eq(lhs, rhs, ctx.getText());
    }

    // ── Arithmetic expression visitors ────────────────────────────────────────

    @Override
    public Expr visitExpr(FreesParser.ExprContext ctx) {
        return visit(ctx.addExpr());
    }

    @Override
    public Expr visitAddExpr(FreesParser.AddExprContext ctx) {
        Expr result = visit(ctx.mulExpr(0));
        for (int i = 1; i < ctx.mulExpr().size(); i++) {
            char op = ctx.getChild(2 * i - 1).getText().charAt(0);
            result = new Expr.BinOp(op, result, visit(ctx.mulExpr(i)));
        }
        return result;
    }

    @Override
    public Expr visitMulExpr(FreesParser.MulExprContext ctx) {
        Expr result = visit(ctx.unaryExpr(0));
        for (int i = 1; i < ctx.unaryExpr().size(); i++) {
            char op = mulOpChar(ctx.getChild(2 * i - 1).getText());
            result = new Expr.BinOp(op, result, visit(ctx.unaryExpr(i)));
        }
        return result;
    }

    /** Map a multiplicative operator's text to its op char, including the
     * MATLAB-style element-wise operators (which are two characters). */
    private static char mulOpChar(String text) {
        return switch (text) {
            case ".*" -> EquationParser.ELEMENT_MUL;
            case "./" -> EquationParser.ELEMENT_DIV;
            case ".\\" -> EquationParser.ELEMENT_LDIV;
            default -> text.charAt(0);
        };
    }

    @Override
    public Expr visitUnaryExpr(FreesParser.UnaryExprContext ctx) {
        if (ctx.powExpr() != null) {
            return visit(ctx.powExpr());
        }
        Expr operand = visit(ctx.unaryExpr());
        if (ctx.MINUS() != null) {
            return new Expr.Neg(operand);
        }
        return operand;
    }

    @Override
    public Expr visitPowExpr(FreesParser.PowExprContext ctx) {
        Expr base = visit(ctx.atom());
        if (ctx.unaryExpr() != null) {
            char op = ctx.DOTCARET() != null ? EquationParser.ELEMENT_POW : '^';
            base = new Expr.BinOp(op, base, visit(ctx.unaryExpr()));
        }
        if (ctx.TRANSPOSE() != null && !ctx.TRANSPOSE().isEmpty()) {
            for (int i = 0; i < ctx.TRANSPOSE().size(); i++) {
                base = new Expr.Call("transpose", List.of(base));
            }
        }
        return base;
    }

    @Override
    public Expr visitNumberAtom(FreesParser.NumberAtomContext ctx) {
        String unit = null;
        double value = Double.parseDouble(ctx.NUMBER().getText());
        if (ctx.unit() != null) {
            int startIdx = ctx.unit().start.getStartIndex();
            int stopIdx = ctx.unit().stop.getStopIndex();
            String bracketed = ctx.unit().start.getInputStream().getText(new org.antlr.v4.runtime.misc.Interval(startIdx, stopIdx));
            unit = bracketed.substring(1, bracketed.length() - 1).trim();
            if (unit.isEmpty()) {
                unit = null;
            } else {
                try {
                    var quantity = UnitRegistry.parseWithOffset(unit);
                    value = value * quantity.factor() + quantity.offset();
                    unit = UnitRegistry.siDisplayName(unit, quantity.dims());
                } catch (UnitRegistry.UnknownUnitException ignored) {
                    // Keep the original text; surfaces as a unit warning.
                }
            }
        }
        return new Expr.Num(value, unit, false);
    }

    @Override
    public Expr visitImagNumberAtom(FreesParser.ImagNumberAtomContext ctx) {
        String unit = null;
        String text = ctx.IMAG_NUMBER().getText();
        // Remove trailing i or j
        text = text.substring(0, text.length() - 1);
        double value = Double.parseDouble(text);
        if (ctx.unit() != null) {
            int startIdx = ctx.unit().start.getStartIndex();
            int stopIdx = ctx.unit().stop.getStopIndex();
            String bracketed = ctx.unit().start.getInputStream().getText(new org.antlr.v4.runtime.misc.Interval(startIdx, stopIdx));
            unit = bracketed.substring(1, bracketed.length() - 1).trim();
            if (unit.isEmpty()) {
                unit = null;
            } else {
                try {
                    var quantity = UnitRegistry.parseWithOffset(unit);
                    value = value * quantity.factor() + quantity.offset();
                    unit = UnitRegistry.siDisplayName(unit, quantity.dims());
                } catch (UnitRegistry.UnknownUnitException ignored) {
                    // Keep the original text; surfaces as a unit warning.
                }
            }
        }
        return new Expr.Num(value, unit, true);
    }

    @Override
    public Expr visitStringAtom(FreesParser.StringAtomContext ctx) {
        String text = ctx.STRING_LITERAL().getText();
        // Remove single quotes
        text = text.substring(1, text.length() - 1);
        return new Expr.Str(text);
    }

    @Override
    public Expr visitVarAtom(FreesParser.VarAtomContext ctx) {
        String original = ctx.IDENT().getText();
        ConstantsRegistry.Constant constant = ConstantsRegistry.lookup(original);
        if (constant != null) {
            return constant.unit() == null
                    ? new Expr.Num(constant.value())
                    : new Expr.Num(constant.value(), constant.unit());
        }
        displayNames.putIfAbsent(original.toLowerCase(), original);
        return new Expr.Var(original);
    }

    @Override
    public Expr visitArrayAtom(FreesParser.ArrayAtomContext ctx) {
        String name = ctx.IDENT().getText();
        displayNames.putIfAbsent(name.toLowerCase(), name);
        List<Expr> indices = new ArrayList<>();
        for (FreesParser.ArrayIndexContext idxCtx : ctx.arrayIndexList().arrayIndex()) {
            indices.add(visit(idxCtx));
        }
        return new Expr.ArrayAccess(name, indices);
    }

    @Override
    public Expr visitArrayIndex(FreesParser.ArrayIndexContext ctx) {
        if (ctx.COLON() != null) {
            return new Expr.Range(visit(ctx.expr(0)), visit(ctx.expr(1)));
        }
        return visit(ctx.expr(0));
    }

    @Override
    public Expr visitMatrixLiteralAtom(FreesParser.MatrixLiteralAtomContext ctx) {
        List<Expr> rows = new ArrayList<>();
        for (FreesParser.MatrixRowContext rowCtx : ctx.matrixRow()) {
            List<Expr> rowElements = new ArrayList<>();
            for (FreesParser.ExprContext exprCtx : rowCtx.expr()) {
                rowElements.add(visit(exprCtx));
            }
            rows.add(new Expr.ArrayLiteral(rowElements));
        }
        Expr literal = new Expr.ArrayLiteral(rows);
        // A trailing unit (`[1 2 3] [kg]`) applies to every element.
        if (ctx.unit() != null) {
            String unit = extractUnit(ctx.unit());
            if (unit != null) {
                literal = applyUnitToElements(literal, unit);
            }
        }
        return literal;
    }

    /** The text between the brackets of a unit annotation, or null if empty. */
    private static String extractUnit(FreesParser.UnitContext unitCtx) {
        int startIdx = unitCtx.start.getStartIndex();
        int stopIdx = unitCtx.stop.getStopIndex();
        String bracketed = unitCtx.start.getInputStream()
                .getText(new org.antlr.v4.runtime.misc.Interval(startIdx, stopIdx));
        String unit = bracketed.substring(1, bracketed.length() - 1).trim();
        return unit.isEmpty() ? null : unit;
    }

    /** Attach a unit to every numeric leaf of a (possibly nested) bracket literal. */
    private static Expr applyUnitToElements(Expr e, String unit) {
        return switch (e) {
            case Expr.ArrayLiteral(List<Expr> elements) ->
                new Expr.ArrayLiteral(elements.stream().map(el -> applyUnitToElements(el, unit)).toList());
            case Expr.Num(double v, String existing, boolean imag) ->
                new Expr.Num(v, existing != null ? existing : unit, imag);
            case Expr.Neg(Expr operand) -> new Expr.Neg(applyUnitToElements(operand, unit));
            default -> throw new EquationParser.ParseException(
                    "A trailing unit on a bracket literal (e.g. [1 2 3] [kg]) requires numeric elements.");
        };
    }

    /** Positional argument expressions; named args are rejected here. */
    private static List<FreesParser.ExprContext> positionalExprs(
            FreesParser.ArgListContext argList, String function) {
        List<FreesParser.ExprContext> exprs = new ArrayList<>();
        for (FreesParser.ArgContext arg : argList.arg()) {
            if (!(arg instanceof FreesParser.PositionalArgContext positional)) {
                throw new EquationParser.ParseException(
                        "Named arguments (name=value) are only valid in fluid "
                                + "property functions: " + function);
            }
            exprs.add(positional.expr());
        }
        return exprs;
    }

    /**
     * Fluid property call: Enthalpy(R134a, T=T1, x=1). Encoded as
     * a synthetic call prop$<output>$<fluid>$<indicators...> over the value
     * expressions, so the fluid and indicator labels never become variables.
     */
    private Expr buildPropertyCall(String function, FreesParser.ArgListContext argList) {
        List<FreesParser.ArgContext> args = argList.arg();
        if (!(args.get(0) instanceof FreesParser.PositionalArgContext fluidArg)) {
            throw new EquationParser.ParseException(
                    "Property functions take the fluid name first: "
                            + function + "(R134a, T=..., x=...)");
        }
        // The fluid may be a bare name (R134a), a quoted string literal
        // ('R134a'), or a string variable (R$, resolved by EquationParser
        // once its assignment is known).
        String fluid = unquote(fluidArg.expr().getText());
        if (!fluid.matches("[A-Za-z]\\w*\\$?")) {
            throw new EquationParser.ParseException(
                    "Invalid fluid name '" + fluid + "' in " + function + "(...)");
        }
        StringBuilder encoded = new StringBuilder("prop$")
                .append(function.toLowerCase()).append('$').append(fluid.toLowerCase());
        List<Expr> values = new ArrayList<>();
        for (int i = 1; i < args.size(); i++) {
            if (!(args.get(i) instanceof FreesParser.NamedArgContext named)) {
                throw new EquationParser.ParseException(
                        "Property indicators must be named after the fluid, "
                                + "e.g. " + function + "(R134a, T=300, x=1)");
            }
            encoded.append('$').append(named.IDENT().getText().toLowerCase());
            values.add(visit(named.expr()));
        }
        return new Expr.Call(encoded.toString(), values);
    }

    /**
     * Chemistry call: MolarMass(C8H18) / HeatingValue(CH4, 'LHV') / StoichAFR(...).
     * Encoded as prop$<fn>$<token>[$<mode>] with the tokens preserving their
     * original case (chemical formulas are case-sensitive) and no value args.
     */
    private Expr buildChemCall(String fn, FreesParser.ArgListContext argList) {
        // The fluid/formula/mode tokens are passed as string-literal arguments
        // (not embedded in the function name) because Expr.Call lowercases its
        // function name — which would corrupt case-sensitive chemical formulas
        // like C8H18. Expr.Str preserves case.
        List<Expr> tokens = new ArrayList<>();
        for (FreesParser.ArgContext arg : argList.arg()) {
            if (!(arg instanceof FreesParser.PositionalArgContext positional)) {
                throw new EquationParser.ParseException(fn
                        + " takes fluid/formula tokens, e.g. MolarMass(C8H18) or "
                        + "HeatingValue(CH4, 'LHV').");
            }
            String tok = unquote(positional.expr().getText());
            if (!tok.matches("[A-Za-z][A-Za-z0-9().]*")) {
                throw new EquationParser.ParseException(
                        "Invalid token '" + tok + "' in " + fn + "(...). Use a fluid name, "
                                + "ideal-gas species, or chemical formula (quote formulas with "
                                + "parentheses, e.g. 'Ca(OH)2').");
            }
            tokens.add(new Expr.Str(tok));
        }
        return new Expr.Call("prop$" + fn, tokens);
    }

    @Override
    public Expr visitIfCallAtom(FreesParser.IfCallAtomContext ctx) {
        List<Expr> args = new ArrayList<>();
        for (FreesParser.ExprContext arg : positionalExprs(ctx.argList(), "if")) {
            args.add(visit(arg));
        }
        return new Expr.Call("if", args);
    }

    /** Single-token chemistry functions whose arguments are fluid/formula/mode
     * tokens (not variables): MolarMass(C8H18), HeatingValue(CH4, 'LHV'),
     * StoichAFR(C8H18). Encoded as prop$ calls preserving token case. */
    private static final java.util.Set<String> CHEM_FUNCS =
            java.util.Set.of("molarmass", "heatingvalue", "stoichafr");

    @Override
    public Expr visitCallAtom(FreesParser.CallAtomContext ctx) {
        String name = ctx.IDENT().getText();

        boolean hasNamedArgs = ctx.argList().arg().stream()
                .anyMatch(a -> a instanceof FreesParser.NamedArgContext);
        if (hasNamedArgs) {
            return buildPropertyCall(name, ctx.argList());
        }

        if (CHEM_FUNCS.contains(name.toLowerCase())) {
            return buildChemCall(name.toLowerCase(), ctx.argList());
        }

        if (name.equalsIgnoreCase("convert")) {
            return buildConvert(positionalExprs(ctx.argList(), name));
        }

        if (name.equalsIgnoreCase("converttemp")) {
            return buildConvertTemp(positionalExprs(ctx.argList(), name));
        }

        List<Expr> args = new ArrayList<>();
        for (FreesParser.ExprContext arg : positionalExprs(ctx.argList(), name)) {
            args.add(visit(arg));
        }
        return new Expr.Call(name, args);
    }

    /** Strips optional surrounding single quotes: Convert('ft^2', 'in^2') ≡ Convert(ft^2, in^2). */
    private static String unquote(String text) {
        if (text.length() >= 2 && text.startsWith("'") && text.endsWith("'")) {
            return text.substring(1, text.length() - 1);
        }
        return text;
    }

    private Expr buildConvert(List<FreesParser.ExprContext> args) {
        if (args.size() != 2) {
            throw new EquationParser.ParseException(
                    "Convert requires exactly two unit arguments: Convert(From, To)");
        }
        try {
            double factor = UnitRegistry.convert(unquote(args.get(0).getText()),
                    unquote(args.get(1).getText()));
            return new Expr.Num(factor, null);
        } catch (UnitRegistry.UnknownUnitException e) {
            throw new EquationParser.ParseException(e.getMessage());
        }
    }

    private Expr buildConvertTemp(List<FreesParser.ExprContext> raw) {
        if (raw.size() != 3) {
            throw new EquationParser.ParseException(
                    "ConvertTemp requires three arguments: ConvertTemp(From, To, value)");
        }
        double[] toKelvin = temperatureToKelvin(unquote(raw.get(0).getText()));
        double[] fromKelvin = kelvinToTemperature(unquote(raw.get(1).getText()));
        double a = toKelvin[0] * fromKelvin[0];
        double b = fromKelvin[0] * toKelvin[1] + fromKelvin[1];
        Expr x = visit(raw.get(2));
        if (x instanceof Expr.Num n && n.unit() == null) {
            String unit = unquote(raw.get(1).getText()).trim().equalsIgnoreCase("k") ? "K" : null;
            return new Expr.Num(a * n.value() + b, unit);
        }
        Expr scaled = a == 1.0 ? x : new Expr.BinOp('*', new Expr.Num(a), x);
        return b == 0.0 ? scaled : new Expr.BinOp('+', scaled, new Expr.Num(b));
    }

    @Override
    public Expr visitParenAtom(FreesParser.ParenAtomContext ctx) {
        return visit(ctx.expr());
    }

    // ── Temperature helpers ───────────────────────────────────────────────────

    private static double[] temperatureToKelvin(String scale) {
        return switch (scale.trim().toLowerCase()) {
            case "c" -> new double[]{1.0, 273.15};
            case "k" -> new double[]{1.0, 0.0};
            case "f" -> new double[]{5.0 / 9.0, UnitRegistry.FAHRENHEIT_OFFSET_K};
            case "r" -> new double[]{5.0 / 9.0, 0.0};
            default -> throw new EquationParser.ParseException(
                    "ConvertTemp: unknown temperature scale '" + scale + "' (use C, K, F, or R)");
        };
    }

    private static double[] kelvinToTemperature(String scale) {
        return switch (scale.trim().toLowerCase()) {
            case "c" -> new double[]{1.0, -273.15};
            case "k" -> new double[]{1.0, 0.0};
            case "f" -> new double[]{9.0 / 5.0, -459.67};
            case "r" -> new double[]{9.0 / 5.0, 0.0};
            default -> throw new EquationParser.ParseException(
                    "ConvertTemp: unknown temperature scale '" + scale + "' (use C, K, F, or R)");
        };
    }
}
