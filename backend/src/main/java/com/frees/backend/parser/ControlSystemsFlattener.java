package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;
import com.frees.backend.ast.ProcDef;
import com.frees.backend.ast.Statement;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Control-systems CALL flattening (Epic 12): expands {@code series},
 * {@code parallel}, {@code feedback}, the LTI conversions ({@code tf2ss},
 * {@code ss2tf}, {@code zp2tf}, {@code tf2zp}), {@code pole}/{@code zero},
 * {@code bode}/{@code nyquist}/{@code margin}/{@code nichols}/{@code routh},
 * {@code residue}, {@code step}/{@code impulse}/{@code lsim},
 * {@code lqr}/{@code place}/{@code pidtune}, {@code ctrb}/{@code obsv}/
 * {@code rank}/{@code ss2ss}, SS interconnection, {@code stepinfo},
 * {@code pade}, {@code rlocus}, {@code c2d}/{@code d2c}, {@code errorconst}
 * and {@code mason} into scalar equations emitted into the shared
 * {@link EquationParser.FlattenContext}.
 *
 * <p>Extracted from the monolithic {@link EquationParser} (was ~1500 of its
 * 3665 lines). These handlers share only five {@link EquationParser} helpers
 * ({@code evalIndexExpr}, {@code expandExpr}, {@code parseMatrixInfo},
 * {@code parseVectorInfo}, {@code registerShape}) and the
 * {@code FlattenContext}/{@code MatrixInfo}/{@code VectorInfo} types, reached
 * through the parser back-reference; everything else is self-contained, so the
 * move is behaviour-preserving. {@link EquationParser#flattenCallProc}
 * dispatches each control-systems CALL here via the {@code csFlattener} field.
 */
final class ControlSystemsFlattener {

    private final EquationParser parser;

    ControlSystemsFlattener(EquationParser parser) {
        this.parser = parser;
    }

    void flattenRank(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 1 || outputs.size() != 1) {
            throw new EquationParser.ParseException("rank expects 1 input (M) and 1 output (r), e.g. CALL rank(M[1:3,1:3] : r)");
        }
        EquationParser.MatrixInfo m = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int rows = m.rows;
        int cols = m.cols;
        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < rows; i++) {
            entries.addAll(Arrays.asList(m.elements[i]));
        }
        ctx.out().add(new Equation(outputs.get(0),
                new Expr.Call("rank$" + rows + "$" + cols, entries), sourceText));
    }

    void flattenCtrb(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 1) {
            throw new EquationParser.ParseException("ctrb expects 2 inputs (A, B) and 1 output (Ctrb), e.g. CALL ctrb(A, B : Ctrb)");
        }
        EquationParser.MatrixInfo a = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n = a.rows;
        if (a.cols != n) {
            throw new EquationParser.ParseException("ctrb: A must be square");
        }
        List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
        EquationParser.MatrixInfo ctrb = parser.parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (ctrb.rows != n || ctrb.cols != n) {
            throw new EquationParser.ParseException("ctrb: Output Ctrb must be " + n + "x" + n);
        }
        EquationParser.registerShape(ctrb.name, n, n, ctx);
        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            entries.addAll(Arrays.asList(a.elements[i]));
        }
        entries.addAll(bElements);
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                ctx.out().add(new Equation(ctrb.elements[i][j],
                        new Expr.Call("ctrb$" + i + "$" + j + "$" + n + "$1", entries), sourceText));
            }
        }
    }

    void flattenObsv(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 1) {
            throw new EquationParser.ParseException("obsv expects 2 inputs (A, C) and 1 output (Obsv), e.g. CALL obsv(A, C : Obsv)");
        }
        EquationParser.MatrixInfo a = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n = a.rows;
        if (a.cols != n) {
            throw new EquationParser.ParseException("obsv: A must be square");
        }
        List<Expr> cElements = getVectorElements(inputs.get(1), n, ctx);
        EquationParser.MatrixInfo obsv = parser.parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (obsv.rows != n || obsv.cols != n) {
            throw new EquationParser.ParseException("obsv: Output Obsv must be " + n + "x" + n);
        }
        EquationParser.registerShape(obsv.name, n, n, ctx);
        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            entries.addAll(Arrays.asList(a.elements[i]));
        }
        entries.addAll(cElements);
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                ctx.out().add(new Equation(obsv.elements[i][j],
                        new Expr.Call("obsv$" + i + "$" + j + "$" + n + "$1", entries), sourceText));
            }
        }
    }

    void flattenSs2ss(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 5 || outputs.size() != 4) {
            throw new EquationParser.ParseException("ss2ss expects 5 inputs (A, B, C, D, P) and 4 outputs (An, Bn, Cn, Dn), "
                    + "e.g. CALL ss2ss(A, B, C, D, P : An, Bn, Cn, Dn)");
        }
        EquationParser.MatrixInfo a = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n = a.rows;
        if (a.cols != n) throw new EquationParser.ParseException("ss2ss: A must be square");
        List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
        List<Expr> cElements = getVectorElements(inputs.get(2), n, ctx);
        Expr d = getScalarElement(inputs.get(3), ctx);
        EquationParser.MatrixInfo transform = parser.parseMatrixInfo(inputs.get(4), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (transform.rows != n || transform.cols != n) {
            throw new EquationParser.ParseException("ss2ss: transform matrix P must be " + n + "x" + n);
        }
        EquationParser.MatrixInfo an = parser.parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (an.rows != n || an.cols != n) throw new EquationParser.ParseException("ss2ss: An must be " + n + "x" + n);
        List<Expr> bnElements = getVectorElements(outputs.get(1), n, ctx);
        List<Expr> cnElements = getVectorElements(outputs.get(2), n, ctx);
        Expr dn = getScalarElement(outputs.get(3), ctx);

        EquationParser.registerShape(an.name, n, n, ctx);
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), n, 1, ctx);
        }
        if (outputs.get(2) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), 1, n, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n; i++) entries.addAll(Arrays.asList(a.elements[i]));
        entries.addAll(bElements);
        entries.addAll(cElements);
        entries.add(d);
        for (int i = 0; i < n; i++) entries.addAll(Arrays.asList(transform.elements[i]));

        String suffix = "$" + n + "$1$1"; // m=1, p=1
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                ctx.out().add(new Equation(an.elements[i][j],
                        new Expr.Call("ss2ss$a$" + i + "$" + j + suffix, entries), sourceText));
            }
        }
        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(bnElements.get(i),
                    new Expr.Call("ss2ss$b$" + i + "$0" + suffix, entries), sourceText));
        }
        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(cnElements.get(i),
                    new Expr.Call("ss2ss$c$" + i + "$0" + suffix, entries), sourceText));
        }
        ctx.out().add(new Equation(dn, new Expr.Call("ss2ss$d" + suffix, entries), sourceText));
    }

    void flattenSs2tf(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 4 || outputs.size() != 2) {
            throw new EquationParser.ParseException("ss2tf expects 4 inputs (A, B, C, D) and 2 outputs (num, den), "
                    + "e.g. CALL ss2tf(A[1:2,1:2], B[1:2], C[1:2], D : num[1:3], den[1:3])");
        }
        EquationParser.MatrixInfo a = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n = a.rows;
        if (a.cols != n) {
            throw new EquationParser.ParseException("ss2tf: A must be square (got " + a.rows + "x" + a.cols + ")");
        }

        List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
        List<Expr> cElements = getRowVectorElements(inputs.get(2), n, ctx);
        Expr dElement = getScalarElement(inputs.get(3), ctx);

        // Serialize entries in the order the Evaluator reconstructs them:
        // A row-major, then B, then C, then D.
        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            entries.addAll(Arrays.asList(a.elements[i]));
        }
        entries.addAll(bElements);
        entries.addAll(cElements);
        entries.add(dElement);

        EquationParser.VectorInfo num = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo den = parser.parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (num.size != n + 1 || den.size != n + 1) {
            throw new EquationParser.ParseException("ss2tf: num and den outputs must each have length n+1 = " + (n + 1)
                    + " (e.g. num[1:" + (n + 1) + "], den[1:" + (n + 1) + "])");
        }
        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), n + 1, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), n + 1, 1, ctx);
        }
        for (int k = 0; k < n + 1; k++) {
            ctx.out().add(new Equation(num.elements[k],
                    new Expr.Call("ss2tf$num$" + k + "$" + n, entries), sourceText));
            ctx.out().add(new Equation(den.elements[k],
                    new Expr.Call("ss2tf$den$" + k + "$" + n, entries), sourceText));
        }
    }

    void flattenTf2ss(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 4) {
            throw new EquationParser.ParseException("tf2ss expects 2 inputs (num, den) and 4 outputs (A, B, C, D), "
                    + "e.g. CALL tf2ss(num[1:3], den[1:3] : A[1:2,1:2], B[1:2], C[1:2], D)");
        }
        EquationParser.VectorInfo num = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo den = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (num.size != den.size) {
            throw new EquationParser.ParseException("tf2ss: num and den must have the same length");
        }
        int np = den.size;
        int n = np - 1;

        EquationParser.MatrixInfo a = parser.parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (a.rows != n || a.cols != n) {
            throw new EquationParser.ParseException("tf2ss: A must be n x n = " + n + "x" + n);
        }
        List<Expr> bElements = getVectorElements(outputs.get(1), n, ctx);
        List<Expr> cElements = getRowVectorElements(outputs.get(2), n, ctx);
        Expr dElement = getScalarElement(outputs.get(3), ctx);

        EquationParser.registerShape(a.name, a.rows, a.cols, ctx);
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), n, 1, ctx);
        }
        if (outputs.get(2) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), 1, n, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num.elements));
        entries.addAll(Arrays.asList(den.elements));

        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                ctx.out().add(new Equation(a.elements[i][j],
                        new Expr.Call("tf2ss$a$" + i + "$" + j + "$" + n, entries), sourceText));
            }
            ctx.out().add(new Equation(bElements.get(i),
                    new Expr.Call("tf2ss$b$" + i + "$" + n, entries), sourceText));
            ctx.out().add(new Equation(cElements.get(i),
                    new Expr.Call("tf2ss$c$" + i + "$" + n, entries), sourceText));
        }
        ctx.out().add(new Equation(dElement,
                new Expr.Call("tf2ss$d$" + n, entries), sourceText));
    }

    void flattenZp2tf(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 5 || outputs.size() != 2) {
            throw new EquationParser.ParseException("zp2tf expects 5 inputs (z_r, z_i, p_r, p_i, k) and 2 outputs (num, den), "
                    + "e.g. CALL zp2tf(z_r[1:2], z_i[1:2], p_r[1:2], p_i[1:2], k : num[1:3], den[1:3])");
        }
        EquationParser.VectorInfo zr = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo zi = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo pr = parser.parseVectorInfo(inputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo pi = parser.parseVectorInfo(inputs.get(3), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        Expr kExpr = getScalarElement(inputs.get(4), ctx);

        if (zr.size != zi.size) {
            throw new EquationParser.ParseException("zp2tf: z_r and z_i must have the same length");
        }
        if (pr.size != pi.size) {
            throw new EquationParser.ParseException("zp2tf: p_r and p_i must have the same length");
        }

        int nz = zr.size;
        int np = pr.size;

        EquationParser.VectorInfo num = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo den = parser.parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        if (num.size != np + 1 || den.size != np + 1) {
            throw new EquationParser.ParseException("zp2tf: num and den must have length np + 1 = " + (np + 1));
        }

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), np + 1, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), np + 1, 1, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(zr.elements));
        entries.addAll(Arrays.asList(zi.elements));
        entries.addAll(Arrays.asList(pr.elements));
        entries.addAll(Arrays.asList(pi.elements));
        entries.add(kExpr);

        for (int i = 0; i <= np; i++) {
            ctx.out().add(new Equation(num.elements[i],
                    new Expr.Call("zp2tf$num$" + i + "$" + nz + "$" + np, entries), sourceText));
            ctx.out().add(new Equation(den.elements[i],
                    new Expr.Call("zp2tf$den$" + i + "$" + nz + "$" + np, entries), sourceText));
        }
    }

    void flattenTf2zp(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 5) {
            throw new EquationParser.ParseException("tf2zp expects 2 inputs (num, den) and 5 outputs (z_r, z_i, p_r, p_i, k), "
                    + "e.g. CALL tf2zp(num[1:3], den[1:3] : z_r[1:2], z_i[1:2], p_r[1:2], p_i[1:2], k)");
        }
        EquationParser.VectorInfo num = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo den = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        int np = den.size - 1; // denominator degree

        EquationParser.VectorInfo zr = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo zi = parser.parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo pr = parser.parseVectorInfo(outputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo pi = parser.parseVectorInfo(outputs.get(3), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        Expr kExpr = getScalarElement(outputs.get(4), ctx);

        if (zr.size != zi.size) {
            throw new EquationParser.ParseException("tf2zp: z_r and z_i outputs must have the same length");
        }
        if (pr.size != pi.size) {
            throw new EquationParser.ParseException("tf2zp: p_r and p_i outputs must have the same length");
        }

        int nz = zr.size;
        if (pr.size != np) {
            throw new EquationParser.ParseException("tf2zp: p_r/p_i length must match denominator degree np = " + np);
        }

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), nz, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), nz, 1, ctx);
        }
        if (outputs.get(2) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), np, 1, ctx);
        }
        if (outputs.get(3) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), np, 1, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num.elements));
        entries.addAll(Arrays.asList(den.elements));

        for (int i = 0; i < nz; i++) {
            ctx.out().add(new Equation(zr.elements[i],
                    new Expr.Call("tf2zp$zr$" + i + "$" + nz + "$" + np, entries), sourceText));
            ctx.out().add(new Equation(zi.elements[i],
                    new Expr.Call("tf2zp$zi$" + i + "$" + nz + "$" + np, entries), sourceText));
        }
        for (int i = 0; i < np; i++) {
            ctx.out().add(new Equation(pr.elements[i],
                    new Expr.Call("tf2zp$pr$" + i + "$" + nz + "$" + np, entries), sourceText));
            ctx.out().add(new Equation(pi.elements[i],
                    new Expr.Call("tf2zp$pi$" + i + "$" + nz + "$" + np, entries), sourceText));
        }
        ctx.out().add(new Equation(kExpr,
                new Expr.Call("tf2zp$k$" + nz + "$" + np, entries), sourceText));
    }

    void flattenSeries(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        flattenTfCombine("series", inputs, outputs, sourceText, ctx);
    }

    void flattenParallel(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        flattenTfCombine("parallel", inputs, outputs, sourceText, ctx);
    }

    /** Shared expansion for the two-system transfer-function interconnections
     *  (series, parallel): both consume (num1, den1, num2, den2), produce a
     *  length L1+L2-1 (num, den), and differ only in the per-coefficient backing
     *  function ({@code <op>$num$…} / {@code <op>$den$…}) the solver evaluates. */
    void flattenTfCombine(String op, List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 4 || outputs.size() != 2) {
            throw new EquationParser.ParseException(op + " expects 4 inputs (num1, den1, num2, den2) and 2 outputs (num, den), "
                    + "e.g. CALL " + op + "(num1[1:2], den1[1:2], num2[1:2], den2[1:2] : num[1:3], den[1:3])");
        }
        EquationParser.VectorInfo num1 = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo den1 = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo num2 = parser.parseVectorInfo(inputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo den2 = parser.parseVectorInfo(inputs.get(3), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        if (num1.size != den1.size) {
            throw new EquationParser.ParseException(op + ": num1 and den1 must have the same length");
        }
        if (num2.size != den2.size) {
            throw new EquationParser.ParseException(op + ": num2 and den2 must have the same length");
        }

        int L1 = num1.size;
        int L2 = num2.size;
        int expectedLen = L1 + L2 - 1;

        EquationParser.VectorInfo num = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo den = parser.parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        if (num.size != expectedLen || den.size != expectedLen) {
            throw new EquationParser.ParseException(op + ": outputs num and den must have length L1 + L2 - 1 = " + expectedLen);
        }

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), expectedLen, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), expectedLen, 1, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num1.elements));
        entries.addAll(Arrays.asList(den1.elements));
        entries.addAll(Arrays.asList(num2.elements));
        entries.addAll(Arrays.asList(den2.elements));

        for (int i = 0; i < expectedLen; i++) {
            ctx.out().add(new Equation(num.elements[i],
                    new Expr.Call(op + "$num$" + i + "$" + L1 + "$" + L2, entries), sourceText));
            ctx.out().add(new Equation(den.elements[i],
                    new Expr.Call(op + "$den$" + i + "$" + L1 + "$" + L2, entries), sourceText));
        }
    }

    void flattenFeedback(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if ((inputs.size() != 4 && inputs.size() != 5) || outputs.size() != 2) {
            throw new EquationParser.ParseException("feedback expects 4 or 5 inputs (num1, den1, num2, den2, [sign]) and 2 outputs (num, den), "
                    + "e.g. CALL feedback(num1[1:2], den1[1:2], num2[1:2], den2[1:2] : num[1:3], den[1:3])");
        }
        EquationParser.VectorInfo num1 = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo den1 = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo num2 = parser.parseVectorInfo(inputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo den2 = parser.parseVectorInfo(inputs.get(3), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        Expr signExpr = (inputs.size() == 5) ? getScalarElement(inputs.get(4), ctx) : new Expr.Num(1.0);

        if (num1.size != den1.size) {
            throw new EquationParser.ParseException("feedback: num1 and den1 must have the same length");
        }
        if (num2.size != den2.size) {
            throw new EquationParser.ParseException("feedback: num2 and den2 must have the same length");
        }

        int L1 = num1.size;
        int L2 = num2.size;
        int expectedLen = L1 + L2 - 1;

        EquationParser.VectorInfo num = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo den = parser.parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        if (num.size != expectedLen || den.size != expectedLen) {
            throw new EquationParser.ParseException("feedback: outputs num and den must have length L1 + L2 - 1 = " + expectedLen);
        }

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), expectedLen, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), expectedLen, 1, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num1.elements));
        entries.addAll(Arrays.asList(den1.elements));
        entries.addAll(Arrays.asList(num2.elements));
        entries.addAll(Arrays.asList(den2.elements));
        entries.add(signExpr);

        for (int i = 0; i < expectedLen; i++) {
            ctx.out().add(new Equation(num.elements[i],
                    new Expr.Call("feedback$num$" + i + "$" + L1 + "$" + L2, entries), sourceText));
            ctx.out().add(new Equation(den.elements[i],
                    new Expr.Call("feedback$den$" + i + "$" + L1 + "$" + L2, entries), sourceText));
        }
    }

    void flattenSsSeries(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        flattenSsCombine("series", inputs, outputs, sourceText, ctx);
    }

    void flattenSsParallel(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        flattenSsCombine("parallel", inputs, outputs, sourceText, ctx);
    }

    /** Shared expansion for the two-system state-space interconnections (series,
     *  parallel): both stack the two realizations identically and differ only in
     *  the per-element backing function ({@code ss_<op>$…}) the solver evaluates. */
    void flattenSsCombine(String op, List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 8 || outputs.size() != 4) {
            throw new EquationParser.ParseException(op + " for state-space expects 8 inputs (A1, B1, C1, D1, A2, B2, C2, D2) and 4 outputs (A, B, C, D)");
        }
        EquationParser.MatrixInfo a1 = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n1 = a1.rows;
        if (a1.cols != n1) throw new EquationParser.ParseException(op + ": A1 must be square");
        List<Expr> b1Elements = getVectorElements(inputs.get(1), n1, ctx);
        List<Expr> c1Elements = getVectorElements(inputs.get(2), n1, ctx);
        Expr d1 = getScalarElement(inputs.get(3), ctx);

        EquationParser.MatrixInfo a2 = parser.parseMatrixInfo(inputs.get(4), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n2 = a2.rows;
        if (a2.cols != n2) throw new EquationParser.ParseException(op + ": A2 must be square");
        List<Expr> b2Elements = getVectorElements(inputs.get(5), n2, ctx);
        List<Expr> c2Elements = getVectorElements(inputs.get(6), n2, ctx);
        Expr d2 = getScalarElement(inputs.get(7), ctx);

        int n = n1 + n2;
        EquationParser.MatrixInfo an = parser.parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (an.rows != n || an.cols != n) throw new EquationParser.ParseException(op + ": Output A must be " + n + "x" + n);
        List<Expr> bnElements = getVectorElements(outputs.get(1), n, ctx);
        List<Expr> cnElements = getVectorElements(outputs.get(2), n, ctx);
        Expr dn = getScalarElement(outputs.get(3), ctx);

        EquationParser.registerShape(an.name, n, n, ctx);
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), n, 1, ctx);
        }
        if (outputs.get(2) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), 1, n, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n1; i++) entries.addAll(Arrays.asList(a1.elements[i]));
        entries.addAll(b1Elements);
        entries.addAll(c1Elements);
        entries.add(d1);
        for (int i = 0; i < n2; i++) entries.addAll(Arrays.asList(a2.elements[i]));
        entries.addAll(b2Elements);
        entries.addAll(c2Elements);
        entries.add(d2);

        String fn = "ss_" + op;
        String suffix = "$" + n1 + "$" + n2;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                ctx.out().add(new Equation(an.elements[i][j],
                        new Expr.Call(fn + "$a$" + i + "$" + j + suffix, entries), sourceText));
            }
        }
        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(bnElements.get(i),
                    new Expr.Call(fn + "$b$" + i + "$0" + suffix, entries), sourceText));
        }
        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(cnElements.get(i),
                    new Expr.Call(fn + "$c$" + i + "$0" + suffix, entries), sourceText));
        }
        ctx.out().add(new Equation(dn, new Expr.Call(fn + "$d" + suffix, entries), sourceText));
    }

    void flattenSsFeedback(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if ((inputs.size() != 8 && inputs.size() != 9) || outputs.size() != 4) {
            throw new EquationParser.ParseException("feedback for state-space expects 8 or 9 inputs (A1, B1, C1, D1, A2, B2, C2, D2 [, sign]) and 4 outputs (A, B, C, D)");
        }
        EquationParser.MatrixInfo a1 = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n1 = a1.rows;
        if (a1.cols != n1) throw new EquationParser.ParseException("feedback: A1 must be square");
        List<Expr> b1Elements = getVectorElements(inputs.get(1), n1, ctx);
        List<Expr> c1Elements = getVectorElements(inputs.get(2), n1, ctx);
        Expr d1 = getScalarElement(inputs.get(3), ctx);

        EquationParser.MatrixInfo a2 = parser.parseMatrixInfo(inputs.get(4), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n2 = a2.rows;
        if (a2.cols != n2) throw new EquationParser.ParseException("feedback: A2 must be square");
        List<Expr> b2Elements = getVectorElements(inputs.get(5), n2, ctx);
        List<Expr> c2Elements = getVectorElements(inputs.get(6), n2, ctx);
        Expr d2 = getScalarElement(inputs.get(7), ctx);

        Expr signExpr = inputs.size() == 9 ? inputs.get(8) : new Expr.Num(1.0);

        int n = n1 + n2;
        EquationParser.MatrixInfo an = parser.parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (an.rows != n || an.cols != n) throw new EquationParser.ParseException("feedback: Output A must be " + n + "x" + n);
        List<Expr> bnElements = getVectorElements(outputs.get(1), n, ctx);
        List<Expr> cnElements = getVectorElements(outputs.get(2), n, ctx);
        Expr dn = getScalarElement(outputs.get(3), ctx);

        EquationParser.registerShape(an.name, n, n, ctx);
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), n, 1, ctx);
        }
        if (outputs.get(2) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), 1, n, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n1; i++) entries.addAll(Arrays.asList(a1.elements[i]));
        entries.addAll(b1Elements);
        entries.addAll(c1Elements);
        entries.add(d1);
        for (int i = 0; i < n2; i++) entries.addAll(Arrays.asList(a2.elements[i]));
        entries.addAll(b2Elements);
        entries.addAll(c2Elements);
        entries.add(d2);
        entries.add(signExpr);

        String suffix = "$" + n1 + "$" + n2;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                ctx.out().add(new Equation(an.elements[i][j],
                        new Expr.Call("ss_feedback$a$" + i + "$" + j + suffix, entries), sourceText));
            }
        }
        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(bnElements.get(i),
                    new Expr.Call("ss_feedback$b$" + i + "$0" + suffix, entries), sourceText));
        }
        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(cnElements.get(i),
                    new Expr.Call("ss_feedback$c$" + i + "$0" + suffix, entries), sourceText));
        }
        ctx.out().add(new Equation(dn, new Expr.Call("ss_feedback$d" + suffix, entries), sourceText));
    }

    void flattenPole(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if ((inputs.size() != 1 && inputs.size() != 2) || outputs.size() != 2) {
            throw new EquationParser.ParseException("pole expects 1 input (A) or 2 inputs (num, den) and 2 outputs (pr, pi), "
                    + "e.g. CALL pole(num, den : pr[1:3], pi[1:3])");
        }
        int n;
        List<Expr> entries = new ArrayList<>();
        if (inputs.size() == 1) {
            EquationParser.MatrixInfo a = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (a.rows != a.cols) {
                throw new EquationParser.ParseException("pole: A must be square");
            }
            n = a.rows;
            for (int i = 0; i < n; i++) {
                entries.addAll(Arrays.asList(a.elements[i]));
            }
        } else {
            EquationParser.VectorInfo num = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            EquationParser.VectorInfo den = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (num.size != den.size) {
                throw new EquationParser.ParseException("pole: num and den must have the same length");
            }
            n = den.size - 1; // degree
            entries.addAll(Arrays.asList(num.elements));
            entries.addAll(Arrays.asList(den.elements));
        }

        EquationParser.VectorInfo pr = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo pi = parser.parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (pr.size != n || pi.size != n) {
            throw new EquationParser.ParseException("pole: output vectors pr and pi must have length n = " + n);
        }

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), n, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), n, 1, ctx);
        }

        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(pr.elements[i],
                    new Expr.Call("pole$pr$" + i + "$" + inputs.size() + "$" + n, entries), sourceText));
            ctx.out().add(new Equation(pi.elements[i],
                    new Expr.Call("pole$pi$" + i + "$" + inputs.size() + "$" + n, entries), sourceText));
        }
    }

    void flattenZero(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if ((inputs.size() != 2 && inputs.size() != 4) || outputs.size() != 2) {
            throw new EquationParser.ParseException("zero expects 2 inputs (num, den) or 4 inputs (A, B, C, D) and 2 outputs (zr, zi), "
                    + "e.g. CALL zero(num, den : zr[1:2], zi[1:2])");
        }
        EquationParser.VectorInfo zr = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo zi = parser.parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (zr.size != zi.size) {
            throw new EquationParser.ParseException("zero: zr and zi outputs must have the same length");
        }
        int nz = zr.size;

        List<Expr> entries = new ArrayList<>();
        if (inputs.size() == 2) {
            EquationParser.VectorInfo num = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            EquationParser.VectorInfo den = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (num.size != den.size) {
                throw new EquationParser.ParseException("zero: num and den must have the same length");
            }
            entries.addAll(Arrays.asList(num.elements));
            entries.addAll(Arrays.asList(den.elements));
        } else {
            EquationParser.MatrixInfo a = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            int n = a.rows;
            if (a.cols != n) throw new EquationParser.ParseException("zero: A must be square");
            List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
            List<Expr> cElements = getRowVectorElements(inputs.get(2), n, ctx);
            Expr dElement = getScalarElement(inputs.get(3), ctx);

            for (int i = 0; i < n; i++) {
                entries.addAll(Arrays.asList(a.elements[i]));
            }
            entries.addAll(bElements);
            entries.addAll(cElements);
            entries.add(dElement);
        }

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), nz, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), nz, 1, ctx);
        }

        for (int i = 0; i < nz; i++) {
            ctx.out().add(new Equation(zr.elements[i],
                    new Expr.Call("zero$zr$" + i + "$" + inputs.size() + "$" + nz, entries), sourceText));
            ctx.out().add(new Equation(zi.elements[i],
                    new Expr.Call("zero$zi$" + i + "$" + inputs.size() + "$" + nz, entries), sourceText));
        }
    }

    void flattenBode(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if ((inputs.size() != 3 && inputs.size() != 5) || outputs.size() != 2) {
            throw new EquationParser.ParseException("bode expects 3 inputs (num, den, omega) or 5 inputs (A, B, C, D, omega) and 2 outputs (mag, phase), "
                    + "e.g. CALL bode(num, den, omega : mag[1:50], phase[1:50])");
        }
        EquationParser.VectorInfo omega = parser.parseVectorInfo(inputs.get(inputs.size() - 1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int N = omega.size;

        EquationParser.VectorInfo mag = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo phase = parser.parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (mag.size != N || phase.size != N) {
            throw new EquationParser.ParseException("bode: outputs mag and phase must have the same size N as omega = " + N);
        }

        List<Expr> entries = new ArrayList<>();
        if (inputs.size() == 3) {
            EquationParser.VectorInfo num = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            EquationParser.VectorInfo den = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (num.size != den.size) {
                throw new EquationParser.ParseException("bode: num and den must have the same length");
            }
            entries.addAll(Arrays.asList(num.elements));
            entries.addAll(Arrays.asList(den.elements));
        } else {
            EquationParser.MatrixInfo a = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            int n = a.rows;
            if (a.cols != n) throw new EquationParser.ParseException("bode: A must be square");
            List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
            List<Expr> cElements = getRowVectorElements(inputs.get(2), n, ctx);
            Expr dElement = getScalarElement(inputs.get(3), ctx);

            for (int i = 0; i < n; i++) {
                entries.addAll(Arrays.asList(a.elements[i]));
            }
            entries.addAll(bElements);
            entries.addAll(cElements);
            entries.add(dElement);
        }
        entries.addAll(Arrays.asList(omega.elements));

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), N, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), N, 1, ctx);
        }

        for (int i = 0; i < N; i++) {
            ctx.out().add(new Equation(mag.elements[i],
                    new Expr.Call("bode$mag$" + i + "$" + inputs.size() + "$" + N, entries), sourceText));
            ctx.out().add(new Equation(phase.elements[i],
                    new Expr.Call("bode$phase$" + i + "$" + inputs.size() + "$" + N, entries), sourceText));
        }
    }

    void flattenNyquist(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if ((inputs.size() != 3 && inputs.size() != 5) || outputs.size() != 2) {
            throw new EquationParser.ParseException("nyquist expects 3 inputs (num, den, omega) or 5 inputs (A, B, C, D, omega) and 2 outputs (real, imag), "
                    + "e.g. CALL nyquist(num, den, omega : real[1:50], imag[1:50])");
        }
        EquationParser.VectorInfo omega = parser.parseVectorInfo(inputs.get(inputs.size() - 1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int N = omega.size;

        EquationParser.VectorInfo real = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo imag = parser.parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (real.size != N || imag.size != N) {
            throw new EquationParser.ParseException("nyquist: outputs real and imag must have the same size N as omega = " + N);
        }

        List<Expr> entries = new ArrayList<>();
        if (inputs.size() == 3) {
            EquationParser.VectorInfo num = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            EquationParser.VectorInfo den = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (num.size != den.size) {
                throw new EquationParser.ParseException("nyquist: num and den must have the same length");
            }
            entries.addAll(Arrays.asList(num.elements));
            entries.addAll(Arrays.asList(den.elements));
        } else {
            EquationParser.MatrixInfo a = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            int n = a.rows;
            if (a.cols != n) throw new EquationParser.ParseException("nyquist: A must be square");
            List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
            List<Expr> cElements = getRowVectorElements(inputs.get(2), n, ctx);
            Expr dElement = getScalarElement(inputs.get(3), ctx);

            for (int i = 0; i < n; i++) {
                entries.addAll(Arrays.asList(a.elements[i]));
            }
            entries.addAll(bElements);
            entries.addAll(cElements);
            entries.add(dElement);
        }
        entries.addAll(Arrays.asList(omega.elements));

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), N, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), N, 1, ctx);
        }

        for (int i = 0; i < N; i++) {
            ctx.out().add(new Equation(real.elements[i],
                    new Expr.Call("nyquist$real$" + i + "$" + inputs.size() + "$" + N, entries), sourceText));
            ctx.out().add(new Equation(imag.elements[i],
                    new Expr.Call("nyquist$imag$" + i + "$" + inputs.size() + "$" + N, entries), sourceText));
        }
    }

    void flattenMargin(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if ((inputs.size() != 2 && inputs.size() != 4) || outputs.size() != 4) {
            throw new EquationParser.ParseException("margin expects 2 inputs (num, den) or 4 inputs (A, B, C, D) and 4 scalar outputs (gm, pm, w_cg, w_cp), "
                    + "e.g. CALL margin(num, den : gm, pm, w_cg, w_cp)");
        }
        List<Expr> entries = new ArrayList<>();
        if (inputs.size() == 2) {
            EquationParser.VectorInfo num = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            EquationParser.VectorInfo den = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (num.size != den.size) {
                throw new EquationParser.ParseException("margin: num and den must have the same length");
            }
            entries.addAll(Arrays.asList(num.elements));
            entries.addAll(Arrays.asList(den.elements));
        } else {
            EquationParser.MatrixInfo a = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            int n = a.rows;
            if (a.cols != n) throw new EquationParser.ParseException("margin: A must be square");
            List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
            List<Expr> cElements = getRowVectorElements(inputs.get(2), n, ctx);
            Expr dElement = getScalarElement(inputs.get(3), ctx);

            for (int i = 0; i < n; i++) {
                entries.addAll(Arrays.asList(a.elements[i]));
            }
            entries.addAll(bElements);
            entries.addAll(cElements);
            entries.add(dElement);
        }

        ctx.out().add(new Equation(outputs.get(0),
                new Expr.Call("margin$gm$" + inputs.size(), entries), sourceText));
        ctx.out().add(new Equation(outputs.get(1),
                new Expr.Call("margin$pm$" + inputs.size(), entries), sourceText));
        ctx.out().add(new Equation(outputs.get(2),
                new Expr.Call("margin$wcg$" + inputs.size(), entries), sourceText));
        ctx.out().add(new Equation(outputs.get(3),
                new Expr.Call("margin$wcp$" + inputs.size(), entries), sourceText));
    }

    /**
     * Flattens the Routh-Hurwitz test: 1 input (the characteristic polynomial
     * coefficients, descending powers) and 2 scalar outputs (nRHP = number of
     * right-half-plane poles, stable = 1 if stable else 0). The polynomial
     * coefficients are serialized as the synthetic call's arguments.
     */
    void flattenRouth(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 1 || outputs.size() != 2) {
            throw new EquationParser.ParseException("routh expects 1 input (den) and 2 scalar outputs (nRHP, stable), "
                    + "e.g. CALL routh(den[1:4] : nRHP, stable)");
        }
        EquationParser.VectorInfo den = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        List<Expr> entries = new ArrayList<>(Arrays.asList(den.elements));

        ctx.out().add(new Equation(outputs.get(0),
                new Expr.Call("routh$nrhp$" + den.size, entries), sourceText));
        ctx.out().add(new Equation(outputs.get(1),
                new Expr.Call("routh$stable$" + den.size, entries), sourceText));
    }

    /**
     * Flattens {@code residue}: 2 inputs (num, den) and either 5 outputs
     * (r_r, r_i, p_r, p_i, k) or 6 outputs (r_r, r_i, p_r, p_i, ord, k). The
     * residues (real/imag), matching poles (real/imag), per-term order, and the
     * scalar direct term are the numeric inverse-Laplace path: they appear in the
     * Solution window as ordinary variables. The 6-output form (with the {@code
     * ord} array) is required for repeated poles, where {@code ord} carries the
     * power k of each {@code A/(s-p)^k} term.
     */
    void flattenResidue(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        boolean withOrder = outputs.size() == 6;
        if (inputs.size() != 2 || (outputs.size() != 5 && !withOrder)) {
            throw new EquationParser.ParseException("residue expects 2 inputs (num, den) and 5 outputs (r_r, r_i, p_r, p_i, k) "
                    + "or 6 outputs (r_r, r_i, p_r, p_i, ord, k) for repeated poles, "
                    + "e.g. CALL residue(num[1:1], den[1:3] : r_r[1:2], r_i[1:2], p_r[1:2], p_i[1:2], k)");
        }
        EquationParser.VectorInfo num = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo den = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n = den.size - 1; // number of residue terms = denominator degree

        EquationParser.VectorInfo rr = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo ri = parser.parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo pr = parser.parseVectorInfo(outputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo pi = parser.parseVectorInfo(outputs.get(3), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (rr.size != n || ri.size != n || pr.size != n || pi.size != n) {
            throw new EquationParser.ParseException("residue: output vectors r_r, r_i, p_r, p_i must have length n = " + n);
        }
        int arrayOutputs = 4;
        EquationParser.VectorInfo ord = null;
        if (withOrder) {
            ord = parser.parseVectorInfo(outputs.get(4), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (ord.size != n) {
                throw new EquationParser.ParseException("residue: output vector ord must have length n = " + n);
            }
            arrayOutputs = 5;
        }

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num.elements));
        entries.addAll(Arrays.asList(den.elements));

        for (int o = 0; o < arrayOutputs; o++) {
            if (outputs.get(o) instanceof Expr.ArrayAccess aa) {
                EquationParser.registerShape(aa.name(), n, 1, ctx);
            }
        }

        String form = withOrder ? "o" : "s";
        int numLen = num.size;
        String suffix = "$" + form + "$";
        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(rr.elements[i],
                    new Expr.Call("residue$rr" + suffix + i + "$" + numLen + "$" + n, entries), sourceText));
            ctx.out().add(new Equation(ri.elements[i],
                    new Expr.Call("residue$ri" + suffix + i + "$" + numLen + "$" + n, entries), sourceText));
            ctx.out().add(new Equation(pr.elements[i],
                    new Expr.Call("residue$pr" + suffix + i + "$" + numLen + "$" + n, entries), sourceText));
            ctx.out().add(new Equation(pi.elements[i],
                    new Expr.Call("residue$pi" + suffix + i + "$" + numLen + "$" + n, entries), sourceText));
            if (withOrder) {
                ctx.out().add(new Equation(ord.elements[i],
                        new Expr.Call("residue$ord" + suffix + i + "$" + numLen + "$" + n, entries), sourceText));
            }
        }
        ctx.out().add(new Equation(outputs.get(arrayOutputs),
                new Expr.Call("residue$k" + suffix + numLen + "$" + n, entries), sourceText));
    }

    /**
     * Flattens {@code nichols}: same inputs as {@code bode} (num, den, omega or
     * A, B, C, D, omega) and 2 outputs (mag in dB, phase in deg). The pair plots
     * as a Nichols chart (magnitude vs phase, parametric in omega).
     */
    void flattenNichols(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if ((inputs.size() != 3 && inputs.size() != 5) || outputs.size() != 2) {
            throw new EquationParser.ParseException("nichols expects 3 inputs (num, den, omega) or 5 inputs (A, B, C, D, omega) and 2 outputs (mag, phase), "
                    + "e.g. CALL nichols(num, den, omega : mag[1:50], phase[1:50])");
        }
        EquationParser.VectorInfo omega = parser.parseVectorInfo(inputs.get(inputs.size() - 1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int N = omega.size;

        EquationParser.VectorInfo mag = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo phase = parser.parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (mag.size != N || phase.size != N) {
            throw new EquationParser.ParseException("nichols: outputs mag and phase must have the same size N as omega = " + N);
        }

        List<Expr> entries = new ArrayList<>();
        if (inputs.size() == 3) {
            EquationParser.VectorInfo num = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            EquationParser.VectorInfo den = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (num.size != den.size) {
                throw new EquationParser.ParseException("nichols: num and den must have the same length");
            }
            entries.addAll(Arrays.asList(num.elements));
            entries.addAll(Arrays.asList(den.elements));
        } else {
            EquationParser.MatrixInfo a = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            int n = a.rows;
            if (a.cols != n) throw new EquationParser.ParseException("nichols: A must be square");
            List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
            List<Expr> cElements = getRowVectorElements(inputs.get(2), n, ctx);
            Expr dElement = getScalarElement(inputs.get(3), ctx);
            for (int i = 0; i < n; i++) {
                entries.addAll(Arrays.asList(a.elements[i]));
            }
            entries.addAll(bElements);
            entries.addAll(cElements);
            entries.add(dElement);
        }
        entries.addAll(Arrays.asList(omega.elements));

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), N, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), N, 1, ctx);
        }

        for (int i = 0; i < N; i++) {
            ctx.out().add(new Equation(mag.elements[i],
                    new Expr.Call("nichols$mag$" + i + "$" + inputs.size() + "$" + N, entries), sourceText));
            ctx.out().add(new Equation(phase.elements[i],
                    new Expr.Call("nichols$phase$" + i + "$" + inputs.size() + "$" + N, entries), sourceText));
        }
    }

    /**
     * Flattens {@code errorconst}: 2 inputs (open-loop num, den) and 3 scalar
     * outputs (position Kp, velocity Kv, acceleration Ka static error constants).
     */
    void flattenErrorConst(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 3) {
            throw new EquationParser.ParseException("errorconst expects 2 inputs (num, den) and 3 scalar outputs (Kp, Kv, Ka), "
                    + "e.g. CALL errorconst(num[1:2], den[1:3] : Kp, Kv, Ka)");
        }
        EquationParser.VectorInfo num = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo den = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num.elements));
        entries.addAll(Arrays.asList(den.elements));

        ctx.out().add(new Equation(outputs.get(0),
                new Expr.Call("errorconst$kp$" + num.size + "$" + den.size, entries), sourceText));
        ctx.out().add(new Equation(outputs.get(1),
                new Expr.Call("errorconst$kv$" + num.size + "$" + den.size, entries), sourceText));
        ctx.out().add(new Equation(outputs.get(2),
                new Expr.Call("errorconst$ka$" + num.size + "$" + den.size, entries), sourceText));
    }

    /**
     * Flattens {@code mason}: a square node-gain adjacency matrix G plus the
     * source and sink node numbers (1-based), and 1 scalar output T — the
     * overall transmittance of the signal-flow graph by Mason's gain formula.
     */
    void flattenMason(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 3 || outputs.size() != 1) {
            throw new EquationParser.ParseException("mason expects 3 inputs (G, source, sink) and 1 output (T), "
                    + "e.g. CALL mason(G[1:4,1:4], 1, 4 : T)");
        }
        EquationParser.MatrixInfo g = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (g.rows != g.cols) {
            throw new EquationParser.ParseException("mason: G must be a square node-gain matrix");
        }
        int n = g.rows;
        Expr source = getScalarElement(inputs.get(1), ctx);
        Expr sink = getScalarElement(inputs.get(2), ctx);

        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            entries.addAll(Arrays.asList(g.elements[i]));
        }
        entries.add(source);
        entries.add(sink);

        ctx.out().add(new Equation(outputs.get(0),
                new Expr.Call("mason$" + n, entries), sourceText));
    }

    /**
     * Flattens {@code c2d}/{@code d2c}: 4 inputs (num, den, Ts, method$) and 2
     * output vectors (numz, denz) of the same length as den. The conversion
     * method is encoded into the synthetic call name; the model coefficients and
     * Ts are serialized as arguments.
     */
    void flattenDiscretize(String name, List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if ((inputs.size() != 3 && inputs.size() != 4) || outputs.size() != 2) {
            throw new EquationParser.ParseException(name + " expects 3 inputs (num, den, Ts) or 4 inputs (num, den, Ts, method$) "
                    + "and 2 outputs (numz, denz), e.g. CALL " + name + "(num[1:2], den[1:2], Ts, 'tustin' : numz[1:2], denz[1:2])");
        }
        String method = "tustin";
        if (inputs.size() == 4) {
            if (!(inputs.get(3) instanceof Expr.Str(String methodRaw))) {
                throw new EquationParser.ParseException(name + ": the fourth argument must be a quoted method, 'tustin' or 'zoh'");
            }
            method = methodRaw.toLowerCase();
            if (!method.equals("tustin") && !method.equals("bilinear") && !method.equals("zoh")) {
                throw new EquationParser.ParseException(name + ": method must be 'tustin' or 'zoh' (got '" + methodRaw + "')");
            }
            if (name.equals("d2c") && method.equals("zoh")) {
                throw new EquationParser.ParseException("d2c: only the 'tustin' method is supported");
            }
        }
        EquationParser.VectorInfo num = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo den = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (num.size != den.size) {
            throw new EquationParser.ParseException(name + ": num and den must have the same length (pad the numerator with leading zeros)");
        }
        Expr ts = getScalarElement(inputs.get(2), ctx);

        int outLen = den.size;
        EquationParser.VectorInfo numz = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo denz = parser.parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (numz.size != outLen || denz.size != outLen) {
            throw new EquationParser.ParseException(name + ": outputs numz and denz must have the same length as den = " + outLen);
        }
        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), outLen, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), outLen, 1, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num.elements));
        entries.addAll(Arrays.asList(den.elements));
        entries.add(ts);

        int L = den.size;
        for (int i = 0; i < outLen; i++) {
            ctx.out().add(new Equation(numz.elements[i],
                    new Expr.Call(name + "$num$" + method + "$" + i + "$" + L, entries), sourceText));
            ctx.out().add(new Equation(denz.elements[i],
                    new Expr.Call(name + "$den$" + method + "$" + i + "$" + L, entries), sourceText));
        }
    }

    /**
     * Flattens {@code step} / {@code impulse}: 3 inputs (num, den, t) or 5 inputs
     * (A, B, C, D, t), and one output vector y the same length as t. Each y[i] is
     * emitted as a synthetic call {@code <name>$<i>$<numInputs>$<N>} whose
     * arguments are the serialized model entries followed by the time samples.
     */
    void flattenTimeResponse(String name, List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if ((inputs.size() != 3 && inputs.size() != 5) || outputs.size() != 1) {
            throw new EquationParser.ParseException(name + " expects 3 inputs (num, den, t) or 5 inputs (A, B, C, D, t) and 1 output (y), "
                    + "e.g. CALL " + name + "(num, den, t : y[1:50])");
        }
        EquationParser.VectorInfo time = parser.parseVectorInfo(inputs.get(inputs.size() - 1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int N = time.size;

        EquationParser.VectorInfo y = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (y.size != N) {
            throw new EquationParser.ParseException(name + ": output y must have the same size N as t = " + N);
        }

        List<Expr> entries = new ArrayList<>();
        if (inputs.size() == 3) {
            EquationParser.VectorInfo num = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            EquationParser.VectorInfo den = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (num.size != den.size) {
                throw new EquationParser.ParseException(name + ": num and den must have the same length");
            }
            entries.addAll(Arrays.asList(num.elements));
            entries.addAll(Arrays.asList(den.elements));
        } else {
            EquationParser.MatrixInfo a = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            int n = a.rows;
            if (a.cols != n) throw new EquationParser.ParseException(name + ": A must be square");
            List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
            List<Expr> cElements = getRowVectorElements(inputs.get(2), n, ctx);
            Expr dElement = getScalarElement(inputs.get(3), ctx);

            for (int i = 0; i < n; i++) {
                entries.addAll(Arrays.asList(a.elements[i]));
            }
            entries.addAll(bElements);
            entries.addAll(cElements);
            entries.add(dElement);
        }
        entries.addAll(Arrays.asList(time.elements));

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), N, 1, ctx);
        }

        for (int i = 0; i < N; i++) {
            ctx.out().add(new Equation(y.elements[i],
                    new Expr.Call(name + "$" + i + "$" + inputs.size() + "$" + N, entries), sourceText));
        }
    }

    /**
     * Flattens {@code lsim}: 4 inputs (num, den, u, t) or 6 inputs (A, B, C, D, u, t)
     * and one output vector y the same length as t. The input signal u and time
     * vector t must both have length N. Serialized arguments are the model entries
     * followed by the u samples then the t samples.
     */
    void flattenLsim(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if ((inputs.size() != 4 && inputs.size() != 6) || outputs.size() != 1) {
            throw new EquationParser.ParseException("lsim expects 4 inputs (num, den, u, t) or 6 inputs (A, B, C, D, u, t) and 1 output (y), "
                    + "e.g. CALL lsim(num, den, u, t : y[1:50])");
        }
        EquationParser.VectorInfo input = parser.parseVectorInfo(inputs.get(inputs.size() - 2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo time = parser.parseVectorInfo(inputs.get(inputs.size() - 1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int N = time.size;
        if (input.size != N) {
            throw new EquationParser.ParseException("lsim: input u and time t must have the same size N = " + N);
        }

        EquationParser.VectorInfo y = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (y.size != N) {
            throw new EquationParser.ParseException("lsim: output y must have the same size N as t = " + N);
        }

        List<Expr> entries = new ArrayList<>();
        if (inputs.size() == 4) {
            EquationParser.VectorInfo num = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            EquationParser.VectorInfo den = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (num.size != den.size) {
                throw new EquationParser.ParseException("lsim: num and den must have the same length");
            }
            entries.addAll(Arrays.asList(num.elements));
            entries.addAll(Arrays.asList(den.elements));
        } else {
            EquationParser.MatrixInfo a = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            int n = a.rows;
            if (a.cols != n) throw new EquationParser.ParseException("lsim: A must be square");
            List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
            List<Expr> cElements = getRowVectorElements(inputs.get(2), n, ctx);
            Expr dElement = getScalarElement(inputs.get(3), ctx);

            for (int i = 0; i < n; i++) {
                entries.addAll(Arrays.asList(a.elements[i]));
            }
            entries.addAll(bElements);
            entries.addAll(cElements);
            entries.add(dElement);
        }
        entries.addAll(Arrays.asList(input.elements));
        entries.addAll(Arrays.asList(time.elements));

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), N, 1, ctx);
        }

        for (int i = 0; i < N; i++) {
            ctx.out().add(new Equation(y.elements[i],
                    new Expr.Call("lsim$" + i + "$" + inputs.size() + "$" + N, entries), sourceText));
        }
    }

    /**
     * Flattens {@code lqr(A, B, Q, R : K)}: single-input continuous-time LQR.
     * A and Q are n×n, B is an n-vector, R is a scalar, and the gain K is an
     * n-element row vector. Serialized arguments: A row-major, then B, then Q
     * row-major, then R.
     */
    void flattenLqr(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 4 || outputs.size() != 1) {
            throw new EquationParser.ParseException("lqr expects 4 inputs (A, B, Q, R) and 1 output (K), "
                    + "e.g. CALL lqr(A[1:2,1:2], B[1:2], Q[1:2,1:2], R : K[1:2])");
        }
        EquationParser.MatrixInfo a = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n = a.rows;
        if (a.cols != n) {
            throw new EquationParser.ParseException("lqr: A must be square (got " + a.rows + "x" + a.cols + ")");
        }
        List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
        EquationParser.MatrixInfo q = parser.parseMatrixInfo(inputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (q.rows != n || q.cols != n) {
            throw new EquationParser.ParseException("lqr: Q must be n x n = " + n + "x" + n);
        }
        Expr rElement = getScalarElement(inputs.get(3), ctx);

        EquationParser.VectorInfo k = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (k.size != n) {
            throw new EquationParser.ParseException("lqr: output K must have length n = " + n);
        }

        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            entries.addAll(Arrays.asList(a.elements[i]));
        }
        entries.addAll(bElements);
        for (int i = 0; i < n; i++) {
            entries.addAll(Arrays.asList(q.elements[i]));
        }
        entries.add(rElement);

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), n, 1, ctx);
        }
        for (int j = 0; j < n; j++) {
            ctx.out().add(new Equation(k.elements[j],
                    new Expr.Call("lqr$" + j + "$" + n, entries), sourceText));
        }
    }

    /**
     * Flattens {@code place(A, B, pr, pi : K)}: SISO Ackermann pole placement.
     * A is n×n, B is an n-vector, and the desired closed-loop poles are given as
     * real/imag arrays pr, pi (each length n). The gain K is an n-element row
     * vector. Serialized arguments: A row-major, then B, then pr, then pi.
     */
    void flattenPlace(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 4 || outputs.size() != 1) {
            throw new EquationParser.ParseException("place expects 4 inputs (A, B, pr, pi) and 1 output (K), "
                    + "e.g. CALL place(A[1:2,1:2], B[1:2], pr[1:2], pi[1:2] : K[1:2])");
        }
        EquationParser.MatrixInfo a = parser.parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n = a.rows;
        if (a.cols != n) {
            throw new EquationParser.ParseException("place: A must be square (got " + a.rows + "x" + a.cols + ")");
        }
        List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
        EquationParser.VectorInfo pr = parser.parseVectorInfo(inputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo pi = parser.parseVectorInfo(inputs.get(3), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (pr.size != n || pi.size != n) {
            throw new EquationParser.ParseException("place: desired pole arrays pr and pi must each have length n = " + n);
        }

        EquationParser.VectorInfo k = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (k.size != n) {
            throw new EquationParser.ParseException("place: output K must have length n = " + n);
        }

        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            entries.addAll(Arrays.asList(a.elements[i]));
        }
        entries.addAll(bElements);
        entries.addAll(Arrays.asList(pr.elements));
        entries.addAll(Arrays.asList(pi.elements));

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), n, 1, ctx);
        }
        for (int j = 0; j < n; j++) {
            ctx.out().add(new Equation(k.elements[j],
                    new Expr.Call("place$" + j + "$" + n, entries), sourceText));
        }
    }

    /**
     * Flattens {@code pidtune(num, den, type$, wc : Kp, Ki, Kd)}: loop-shaping
     * PID design for a SISO plant {@code num/den} with a gain crossover at wc and
     * a 60° target phase margin. {@code type$} is a quoted 'P' / 'PI' / 'PID'.
     * The controller type is encoded into the synthetic call name; serialized
     * arguments are num, then den, then wc.
     */
    void flattenPidtune(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 4 || outputs.size() != 3) {
            throw new EquationParser.ParseException("pidtune expects 4 inputs (num, den, type$, wc) and 3 outputs (Kp, Ki, Kd), "
                    + "e.g. CALL pidtune(num, den, 'PID', wc : Kp, Ki, Kd)");
        }
        if (!(inputs.get(2) instanceof Expr.Str(String typeRaw))) {
            throw new EquationParser.ParseException("pidtune: the third argument must be a quoted controller type, "
                    + "one of 'P', 'PI', or 'PID'");
        }
        String type = typeRaw.toLowerCase();
        if (!type.equals("p") && !type.equals("pi") && !type.equals("pid")) {
            throw new EquationParser.ParseException("pidtune: controller type must be 'P', 'PI', or 'PID' (got '" + typeRaw + "')");
        }
        EquationParser.VectorInfo num = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo den = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (num.size != den.size) {
            throw new EquationParser.ParseException("pidtune: num and den must have the same length");
        }
        Expr wc = getScalarElement(inputs.get(3), ctx);

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num.elements));
        entries.addAll(Arrays.asList(den.elements));
        entries.add(wc);

        ctx.out().add(new Equation(outputs.get(0),
                new Expr.Call("pidtune$kp$" + type, entries), sourceText));
        ctx.out().add(new Equation(outputs.get(1),
                new Expr.Call("pidtune$ki$" + type, entries), sourceText));
        ctx.out().add(new Equation(outputs.get(2),
                new Expr.Call("pidtune$kd$" + type, entries), sourceText));
    }

    void flattenStepInfo(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 4) {
            throw new EquationParser.ParseException("stepinfo expects 2 inputs (t, y) and 4 scalar outputs (Tr, Tp, Ts, OS), "
                    + "e.g. CALL stepinfo(t[1:50], y[1:50] : Tr, Tp, Ts, OS)");
        }
        EquationParser.VectorInfo t = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int N = t.size;
        EquationParser.VectorInfo y = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (y.size != N) {
            throw new EquationParser.ParseException("stepinfo: inputs t and y must have the same length (got t: " + N + ", y: " + y.size + ")");
        }

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(t.elements));
        entries.addAll(Arrays.asList(y.elements));

        ctx.out().add(new Equation(outputs.get(0),
                new Expr.Call("stepinfo$tr$" + N, entries), sourceText));
        ctx.out().add(new Equation(outputs.get(1),
                new Expr.Call("stepinfo$tp$" + N, entries), sourceText));
        ctx.out().add(new Equation(outputs.get(2),
                new Expr.Call("stepinfo$ts$" + N, entries), sourceText));
        ctx.out().add(new Equation(outputs.get(3),
                new Expr.Call("stepinfo$os$" + N, entries), sourceText));
    }

    void flattenPade(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 2) {
            throw new EquationParser.ParseException("pade expects 2 inputs (Td, order) and 2 vector outputs (num_delay, den_delay), "
                    + "e.g. CALL pade(Td, order : num_delay[1:3], den_delay[1:3])");
        }
        Expr expandedOrder = parser.expandExpr(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int order = (int) Math.round(parser.evalIndexExpr(expandedOrder, ctx.loopVars(), ctx.constants(), ctx.defs()));
        if (order < 1) {
            throw new EquationParser.ParseException("pade: order must be >= 1");
        }
        int M = order + 1;
        EquationParser.VectorInfo num = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo den = parser.parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (num.size != M || den.size != M) {
            throw new EquationParser.ParseException("pade: outputs num_delay and den_delay must have size " + M + " (order + 1) for a Padé approximation of order " + order);
        }

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), M, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            EquationParser.registerShape(aa.name(), M, 1, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        entries.add(inputs.get(0));
        entries.add(inputs.get(1));

        for (int i = 0; i < M; i++) {
            ctx.out().add(new Equation(num.elements[i],
                    new Expr.Call("pade$num$" + i + "$" + order, entries), sourceText));
            ctx.out().add(new Equation(den.elements[i],
                    new Expr.Call("pade$den$" + i + "$" + order, entries), sourceText));
        }
    }

    void flattenRlocus(List<Expr> inputs, List<Expr> outputs, String sourceText, EquationParser.FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 3) {
            throw new EquationParser.ParseException("rlocus expects 2 inputs (num, den) and 3 outputs (K[1:M], cpr[1:M, 1:N], cpi[1:M, 1:N]), "
                    + "e.g. CALL rlocus(num, den : K[1:100], cpr[1:100, 1:4], cpi[1:100, 1:4])");
        }
        EquationParser.VectorInfo num = parser.parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.VectorInfo den = parser.parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (num.size > den.size) {
            throw new EquationParser.ParseException("rlocus: system must be proper (numerator order <= denominator order)");
        }

        EquationParser.VectorInfo kOut = parser.parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int M = kOut.size;

        EquationParser.MatrixInfo cpr = parser.parseMatrixInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        EquationParser.MatrixInfo cpi = parser.parseMatrixInfo(outputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        int N = den.size - 1; // system order
        if (cpr.rows != M || cpr.cols != N) {
            throw new EquationParser.ParseException("rlocus: cpr must be a matrix of size " + M + "x" + N + " (got " + cpr.rows + "x" + cpr.cols + ")");
        }
        if (cpi.rows != M || cpi.cols != N) {
            throw new EquationParser.ParseException("rlocus: cpi must be a matrix of size " + M + "x" + N + " (got " + cpi.rows + "x" + cpi.cols + ")");
        }

        EquationParser.registerShape(kOut.name, M, 1, ctx);
        EquationParser.registerShape(cpr.name, M, N, ctx);
        EquationParser.registerShape(cpi.name, M, N, ctx);

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num.elements));
        entries.addAll(Arrays.asList(den.elements));

        String suffix = "$" + num.size + "$" + den.size + "$" + M + "$" + N;

        for (int i = 0; i < M; i++) {
            ctx.out().add(new Equation(kOut.elements[i],
                    new Expr.Call("rlocus$k$" + i + suffix, entries), sourceText));
        }

        for (int i = 0; i < M; i++) {
            for (int j = 0; j < N; j++) {
                ctx.out().add(new Equation(cpr.elements[i][j],
                        new Expr.Call("rlocus$cpr$" + i + "$" + j + suffix, entries), sourceText));
                ctx.out().add(new Equation(cpi.elements[i][j],
                        new Expr.Call("rlocus$cpi$" + i + "$" + j + suffix, entries), sourceText));
            }
        }
    }

    private List<Expr> getVectorElements(Expr e, int expectedSize, EquationParser.FlattenContext ctx) {
        if (e instanceof Expr.ArrayAccess aa && aa.indices().size() == 2) {
            EquationParser.MatrixInfo m = parser.parseMatrixInfo(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (m.rows != expectedSize || m.cols != 1) {
                throw new EquationParser.ParseException("ss2tf: B must be a vector of size " + expectedSize + "x1 (got " + m.rows + "x" + m.cols + ")");
            }
            List<Expr> res = new ArrayList<>();
            for (int i = 0; i < expectedSize; i++) {
                res.add(m.elements[i][0]);
            }
            return res;
        } else {
            EquationParser.VectorInfo v = parser.parseVectorInfo(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (v.size != expectedSize) {
                throw new EquationParser.ParseException("ss2tf: B must be a vector of size " + expectedSize + " (got size " + v.size + ")");
            }
            return Arrays.asList(v.elements);
        }
    }

    private List<Expr> getRowVectorElements(Expr e, int expectedSize, EquationParser.FlattenContext ctx) {
        if (e instanceof Expr.ArrayAccess aa && aa.indices().size() == 2) {
            EquationParser.MatrixInfo m = parser.parseMatrixInfo(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (m.rows != 1 || m.cols != expectedSize) {
                throw new EquationParser.ParseException("ss2tf: C must be a row vector of size 1x" + expectedSize + " (got " + m.rows + "x" + m.cols + ")");
            }
            List<Expr> res = new ArrayList<>();
            for (int j = 0; j < expectedSize; j++) {
                res.add(m.elements[0][j]);
            }
            return res;
        } else {
            EquationParser.VectorInfo v = parser.parseVectorInfo(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (v.size != expectedSize) {
                throw new EquationParser.ParseException("ss2tf: C must be a vector of size " + expectedSize + " (got size " + v.size + ")");
            }
            return Arrays.asList(v.elements);
        }
    }

    private Expr getScalarElement(Expr e, EquationParser.FlattenContext ctx) {
        if (e instanceof Expr.ArrayAccess aa) {
            if (aa.indices().size() == 2) {
                EquationParser.MatrixInfo m = parser.parseMatrixInfo(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
                if (m.rows != 1 || m.cols != 1) {
                    throw new EquationParser.ParseException("ss2tf: D must be a 1x1 matrix (got " + m.rows + "x" + m.cols + ")");
                }
                return m.elements[0][0];
            } else {
                Expr idxExpr = parser.expandExpr(aa.indices().get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
                if (idxExpr instanceof Expr.Range) {
                    EquationParser.VectorInfo v = parser.parseVectorInfo(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
                    if (v.size != 1) {
                        throw new EquationParser.ParseException("ss2tf: D must be a size-1 vector (got size " + v.size + ")");
                    }
                    return v.elements[0];
                } else {
                    return parser.expandExpr(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
                }
            }
        }
        return parser.expandExpr(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
    }


}
