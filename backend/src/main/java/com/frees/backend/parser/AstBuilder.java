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
            java.util.Map<String, ProcDef> defs) {}

    public ProgramResult buildProgram(FreesParser.ProgramContext ctx) {
        List<Statement> statements = new ArrayList<>();
        java.util.Map<String, ProcDef> defs = new java.util.LinkedHashMap<>();

        if (ctx.topLevel() != null) {
            for (FreesParser.TopLevelContext tl : ctx.topLevel()) {
                if (tl.functionDef() != null) {
                    ProcDef.FunctionDef fd = buildFunctionDef(tl.functionDef());
                    defs.put(fd.name().toLowerCase(), fd);
                } else if (tl.procedureDef() != null) {
                    ProcDef.ProcedureDef pd = buildProcedureDef(tl.procedureDef());
                    defs.put(pd.name().toLowerCase(), pd);
                } else if (tl.moduleDef() != null) {
                    ProcDef.ModuleDef md = buildModuleDef(tl.moduleDef());
                    defs.put(md.name().toLowerCase(), md);
                } else if (tl.statement() != null) {
                    statements.add(buildStatement(tl.statement()));
                }
            }
        }
        return new ProgramResult(statements, defs);
    }

    // ── FUNCTION / PROCEDURE / MODULE definitions ────────────────────────────

    private ProcDef.FunctionDef buildFunctionDef(FreesParser.FunctionDefContext ctx) {
        String name = ctx.IDENT().getText().toLowerCase();
        List<String> params = buildParamList(ctx.paramList());
        List<ProcStatement> body = buildProcBody(ctx.procBody());
        return new ProcDef.FunctionDef(name, params, body);
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
        } else if (ctx.duplicateBlock() != null) {
            return buildProcDuplicate(ctx.duplicateBlock());
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

    private ProcStatement.Duplicate buildProcDuplicate(FreesParser.DuplicateBlockContext ctx) {
        String varName = ctx.IDENT().getText().toLowerCase();
        Expr start = visit(ctx.expr(0));
        Expr end = visit(ctx.expr(1));
        // procBody version — re-parse body as proc statements (duplicate inside proc body)
        List<ProcStatement> body = new ArrayList<>();
        if (ctx.statementList() != null) {
            for (FreesParser.StatementContext stmtCtx : ctx.statementList().statement()) {
                Statement s = buildStatement(stmtCtx);
                // Convert Statement.Eq to ProcStatement.Eq for procedural context
                if (s instanceof Statement.Eq(Expr lhs, Expr rhs, String sourceText)) {
                    body.add(new ProcStatement.Eq(lhs, rhs, sourceText));
                }
                // DUPLICATE inside DUPLICATE inside PROC is not supported; skip silently
            }
        }
        return new ProcStatement.Duplicate(varName, start, end, body);
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
        if (ctx.duplicateBlock() != null) {
            return buildDuplicateBlock(ctx.duplicateBlock());
        } else if (ctx.callStatement() != null) {
            return buildCallStatement(ctx.callStatement());
        } else {
            return buildEquation(ctx.equation());
        }
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

    public Statement.Duplicate buildDuplicateBlock(FreesParser.DuplicateBlockContext ctx) {
        String varName = ctx.IDENT().getText().toLowerCase();
        Expr start = visit(ctx.expr(0));
        Expr end = visit(ctx.expr(1));
        List<Statement> body = new ArrayList<>();
        if (ctx.statementList() != null && ctx.statementList().statement() != null) {
            for (FreesParser.StatementContext stmtCtx : ctx.statementList().statement()) {
                body.add(buildStatement(stmtCtx));
            }
        }
        return new Statement.Duplicate(varName, start, end, body);
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
            char op = ctx.getChild(2 * i - 1).getText().charAt(0);
            result = new Expr.BinOp(op, result, visit(ctx.unaryExpr(i)));
        }
        return result;
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
            return new Expr.BinOp('^', base, visit(ctx.unaryExpr()));
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
                    unit = UnitRegistry.siName(quantity.dims());
                } catch (UnitRegistry.UnknownUnitException ignored) {
                    // Keep the original text; surfaces as a unit warning.
                }
            }
        }
        return new Expr.Num(value, unit);
    }

    @Override
    public Expr visitImagNumberAtom(FreesParser.ImagNumberAtomContext ctx) {
        String text = ctx.IMAG_NUMBER().getText();
        // Remove trailing 'i', 'I', 'j', or 'J'
        String numericText = text.substring(0, text.length() - 1);
        double value = Double.parseDouble(numericText);
        String unit = null;
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
                    unit = UnitRegistry.siName(quantity.dims());
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
        // Remove the surrounding single quotes
        return new Expr.Str(text.substring(1, text.length() - 1));
    }

    @Override
    public Expr visitVarAtom(FreesParser.VarAtomContext ctx) {
        String original = ctx.IDENT().getText();
        if ("pi".equalsIgnoreCase(original)) {
            return new Expr.Num(Math.PI);
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
        if (ctx.DOTDOT() != null) {
            return new Expr.Range(visit(ctx.expr(0)), visit(ctx.expr(1)));
        }
        return visit(ctx.expr(0));
    }

    @Override
    public Expr visitArrayLiteralAtom(FreesParser.ArrayLiteralAtomContext ctx) {
        List<Expr> elements = new ArrayList<>();
        for (FreesParser.ExprContext exprCtx : positionalExprs(ctx.argList(), "array literal")) {
            elements.add(visit(exprCtx));
        }
        return new Expr.ArrayLiteral(elements);
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
        String fluid = fluidArg.expr().getText();
        // Fluid names may be quoted string literals: Enthalpy('R134a', T=..., x=...)
        if (fluid.length() >= 2 && fluid.startsWith("'") && fluid.endsWith("'")) {
            fluid = fluid.substring(1, fluid.length() - 1);
        }
        if (!fluid.matches("[A-Za-z]\\w*")) {
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

    @Override
    public Expr visitCallAtom(FreesParser.CallAtomContext ctx) {
        String name = ctx.IDENT().getText();

        boolean hasNamedArgs = ctx.argList().arg().stream()
                .anyMatch(a -> a instanceof FreesParser.NamedArgContext);
        if (hasNamedArgs) {
            return buildPropertyCall(name, ctx.argList());
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

    private Expr buildConvert(List<FreesParser.ExprContext> args) {
        if (args.size() != 2) {
            throw new EquationParser.ParseException(
                    "Convert requires exactly two unit arguments: Convert(From, To)");
        }
        try {
            double factor = UnitRegistry.convert(args.get(0).getText(), args.get(1).getText());
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
        double[] toKelvin = temperatureToKelvin(raw.get(0).getText());
        double[] fromKelvin = kelvinToTemperature(raw.get(1).getText());
        double a = toKelvin[0] * fromKelvin[0];
        double b = fromKelvin[0] * toKelvin[1] + fromKelvin[1];
        Expr x = visit(raw.get(2));
        if (x instanceof Expr.Num n && n.unit() == null) {
            String unit = raw.get(1).getText().trim().equalsIgnoreCase("k") ? "K" : null;
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
