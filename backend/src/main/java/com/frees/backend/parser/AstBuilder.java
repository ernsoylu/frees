package com.frees.backend.parser;

import com.frees.backend.ast.Expr;
import com.frees.backend.units.UnitRegistry;

import java.util.ArrayList;
import java.util.List;

/** Converts the ANTLR parse tree into the solver's AST. */
public class AstBuilder extends EesBaseVisitor<Expr> {

    /**
     * EES unifies the case of variables to match their first appearance;
     * maps canonical (lowercase) name -> first-seen spelling.
     */
    private final java.util.Map<String, String> displayNames = new java.util.LinkedHashMap<>();

    public java.util.Map<String, String> displayNames() {
        return displayNames;
    }

    @Override
    public Expr visitExpr(EesParser.ExprContext ctx) {
        return visit(ctx.addExpr());
    }

    @Override
    public Expr visitAddExpr(EesParser.AddExprContext ctx) {
        Expr result = visit(ctx.mulExpr(0));
        for (int i = 1; i < ctx.mulExpr().size(); i++) {
            char op = ctx.getChild(2 * i - 1).getText().charAt(0);
            result = new Expr.BinOp(op, result, visit(ctx.mulExpr(i)));
        }
        return result;
    }

    @Override
    public Expr visitMulExpr(EesParser.MulExprContext ctx) {
        Expr result = visit(ctx.unaryExpr(0));
        for (int i = 1; i < ctx.unaryExpr().size(); i++) {
            char op = ctx.getChild(2 * i - 1).getText().charAt(0);
            result = new Expr.BinOp(op, result, visit(ctx.unaryExpr(i)));
        }
        return result;
    }

    @Override
    public Expr visitUnaryExpr(EesParser.UnaryExprContext ctx) {
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
    public Expr visitPowExpr(EesParser.PowExprContext ctx) {
        Expr base = visit(ctx.atom());
        if (ctx.unaryExpr() != null) {
            return new Expr.BinOp('^', base, visit(ctx.unaryExpr()));
        }
        return base;
    }

    @Override
    public Expr visitNumberAtom(EesParser.NumberAtomContext ctx) {
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
                // All calculations run in SI: annotated constants are
                // converted at parse time (120 [lb] -> 54.43 with unit kg).
                // Bare temperature units convert affinely (25 [C] -> 298.15 K).
                // Unknown units stay untouched; the unit checker reports them.
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
    public Expr visitVarAtom(EesParser.VarAtomContext ctx) {
        String original = ctx.IDENT().getText();
        displayNames.putIfAbsent(original.toLowerCase(), original);
        return new Expr.Var(original);
    }

    @Override
    public Expr visitArrayAtom(EesParser.ArrayAtomContext ctx) {
        String name = ctx.IDENT().getText();
        displayNames.putIfAbsent(name.toLowerCase(), name);
        List<Expr> indices = new ArrayList<>();
        for (EesParser.ArrayIndexContext idxCtx : ctx.arrayIndexList().arrayIndex()) {
            indices.add(visit(idxCtx));
        }
        return new Expr.ArrayAccess(name, indices);
    }

    @Override
    public Expr visitArrayIndex(EesParser.ArrayIndexContext ctx) {
        if (ctx.DOTDOT() != null) {
            return new Expr.Range(visit(ctx.expr(0)), visit(ctx.expr(1)));
        }
        return visit(ctx.expr(0));
    }

    @Override
    public Expr visitArrayLiteralAtom(EesParser.ArrayLiteralAtomContext ctx) {
        List<Expr> elements = new ArrayList<>();
        for (EesParser.ExprContext exprCtx : ctx.argList().expr()) {
            elements.add(visit(exprCtx));
        }
        return new Expr.ArrayLiteral(elements);
    }


    @Override
    public Expr visitCallAtom(EesParser.CallAtomContext ctx) {
        String name = ctx.IDENT().getText();

        // EES Convert(From, To): the arguments are unit expressions, not math.
        // The factor is a constant, so it folds to a number at parse time.
        if (name.equalsIgnoreCase("convert")) {
            List<EesParser.ExprContext> args = ctx.argList().expr();
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

        // EES ConvertTemp(From, To, x): affine temperature conversion (the
        // only EES conversion with an offset). Folds to a*x + b.
        if (name.equalsIgnoreCase("converttemp")) {
            List<EesParser.ExprContext> raw = ctx.argList().expr();
            if (raw.size() != 3) {
                throw new EquationParser.ParseException(
                        "ConvertTemp requires three arguments: ConvertTemp(From, To, value)");
            }
            double[] toKelvin = temperatureToKelvin(raw.get(0).getText());
            double[] fromKelvin = kelvinToTemperature(raw.get(1).getText());
            double a = toKelvin[0] * fromKelvin[0];
            double b = fromKelvin[0] * toKelvin[1] + fromKelvin[1];
            Expr x = visit(raw.get(2));
            // A constant argument folds completely; converting to Kelvin
            // yields an SI value, so the unit metadata can carry K.
            if (x instanceof Expr.Num n && n.unit() == null) {
                String unit = raw.get(1).getText().trim().equalsIgnoreCase("k") ? "K" : null;
                return new Expr.Num(a * n.value() + b, unit);
            }
            Expr scaled = a == 1.0 ? x : new Expr.BinOp('*', new Expr.Num(a), x);
            return b == 0.0 ? scaled : new Expr.BinOp('+', scaled, new Expr.Num(b));
        }

        List<Expr> args = new ArrayList<>();
        for (EesParser.ExprContext arg : ctx.argList().expr()) {
            args.add(visit(arg));
        }
        return new Expr.Call(name, args);
    }

    /** {a, b} such that K = a * T + b. */
    private static double[] temperatureToKelvin(String scale) {
        return switch (scale.trim().toLowerCase()) {
            case "c" -> new double[]{1.0, 273.15};
            case "k" -> new double[]{1.0, 0.0};
            case "f" -> new double[]{5.0 / 9.0, UnitRegistry.FAHRENHEIT_OFFSET_K};
            case "r" -> new double[]{5.0 / 9.0, 0.0};
            default -> throw new EquationParser.ParseException(
                    "ConvertTemp: unknown temperature scale '" + scale
                            + "' (use C, K, F, or R)");
        };
    }

    /** {a, b} such that T = a * K + b. */
    private static double[] kelvinToTemperature(String scale) {
        return switch (scale.trim().toLowerCase()) {
            case "c" -> new double[]{1.0, -273.15};
            case "k" -> new double[]{1.0, 0.0};
            case "f" -> new double[]{9.0 / 5.0, -459.67};
            case "r" -> new double[]{9.0 / 5.0, 0.0};
            default -> throw new EquationParser.ParseException(
                    "ConvertTemp: unknown temperature scale '" + scale
                            + "' (use C, K, F, or R)");
        };
    }

    @Override
    public Expr visitParenAtom(EesParser.ParenAtomContext ctx) {
        return visit(ctx.expr());
    }

    public List<com.frees.backend.ast.Statement> buildProgram(EesParser.ProgramContext ctx) {
        List<com.frees.backend.ast.Statement> statements = new ArrayList<>();
        if (ctx.statement() != null) {
            for (EesParser.StatementContext stmtCtx : ctx.statement()) {
                statements.add(buildStatement(stmtCtx));
            }
        }
        return statements;
    }

    public com.frees.backend.ast.Statement buildStatement(EesParser.StatementContext ctx) {
        if (ctx.duplicateBlock() != null) {
            return buildDuplicateBlock(ctx.duplicateBlock());
        } else {
            return buildEquation(ctx.equation());
        }
    }

    public com.frees.backend.ast.Statement.Duplicate buildDuplicateBlock(EesParser.DuplicateBlockContext ctx) {
        String varName = ctx.IDENT().getText().toLowerCase();
        Expr start = visit(ctx.expr(0));
        Expr end = visit(ctx.expr(1));
        List<com.frees.backend.ast.Statement> body = new ArrayList<>();
        if (ctx.statementList() != null && ctx.statementList().statement() != null) {
            for (EesParser.StatementContext stmtCtx : ctx.statementList().statement()) {
                body.add(buildStatement(stmtCtx));
            }
        }
        return new com.frees.backend.ast.Statement.Duplicate(varName, start, end, body);
    }

    public com.frees.backend.ast.Statement.Eq buildEquation(EesParser.EquationContext ctx) {
        Expr lhs = visit(ctx.expr(0));
        Expr rhs = visit(ctx.expr(1));
        return new com.frees.backend.ast.Statement.Eq(lhs, rhs, ctx.getText());
    }
}
