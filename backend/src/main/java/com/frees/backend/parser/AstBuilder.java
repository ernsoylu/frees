package com.frees.backend.parser;

import com.frees.backend.ast.Expr;

import java.util.ArrayList;
import java.util.List;

/** Converts the ANTLR parse tree into the solver's AST. */
public class AstBuilder extends FreesBaseVisitor<Expr> {

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
        return new Expr.Num(Double.parseDouble(ctx.NUMBER().getText()));
    }

    @Override
    public Expr visitVarAtom(FreesParser.VarAtomContext ctx) {
        return new Expr.Var(ctx.IDENT().getText());
    }

    @Override
    public Expr visitCallAtom(FreesParser.CallAtomContext ctx) {
        List<Expr> args = new ArrayList<>();
        for (FreesParser.ExprContext arg : ctx.argList().expr()) {
            args.add(visit(arg));
        }
        return new Expr.Call(ctx.IDENT().getText(), args);
    }

    @Override
    public Expr visitParenAtom(FreesParser.ParenAtomContext ctx) {
        return visit(ctx.expr());
    }
}
