package com.frees.backend.parser;

import com.frees.backend.ast.Expr;

import java.util.ArrayList;
import java.util.List;

/** Converts the ANTLR parse tree into the solver's AST. */
public class AstBuilder extends EesBaseVisitor<Expr> {

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
        return new Expr.Num(Double.parseDouble(ctx.NUMBER().getText()));
    }

    @Override
    public Expr visitVarAtom(EesParser.VarAtomContext ctx) {
        return new Expr.Var(ctx.IDENT().getText());
    }

    @Override
    public Expr visitCallAtom(EesParser.CallAtomContext ctx) {
        List<Expr> args = new ArrayList<>();
        for (EesParser.ExprContext arg : ctx.argList().expr()) {
            args.add(visit(arg));
        }
        return new Expr.Call(ctx.IDENT().getText(), args);
    }

    @Override
    public Expr visitParenAtom(EesParser.ParenAtomContext ctx) {
        return visit(ctx.expr());
    }
}
