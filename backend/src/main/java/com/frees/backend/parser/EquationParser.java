package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;
import org.antlr.v4.runtime.BaseErrorListener;
import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;
import org.antlr.v4.runtime.RecognitionException;
import org.antlr.v4.runtime.Recognizer;

import java.util.ArrayList;
import java.util.List;

/**
 * Parses EES source text into a list of equations using the ANTLR-generated
 * lexer/parser and an AST-building visitor.
 */
public final class EquationParser {

    public static class ParseException extends RuntimeException {
        public ParseException(String message) {
            super(message);
        }
    }

    private static class CollectingErrorListener extends BaseErrorListener {
        final List<String> errors = new ArrayList<>();

        @Override
        public void syntaxError(Recognizer<?, ?> recognizer, Object offendingSymbol,
                                int line, int charPositionInLine, String msg,
                                RecognitionException e) {
            errors.add("line " + line + ":" + (charPositionInLine + 1) + " " + msg);
        }
    }

    public List<Equation> parse(String source) {
        CollectingErrorListener errorListener = new CollectingErrorListener();

        EesLexer lexer = new EesLexer(CharStreams.fromString(source));
        lexer.removeErrorListeners();
        lexer.addErrorListener(errorListener);

        EesParser parser = new EesParser(new CommonTokenStream(lexer));
        parser.removeErrorListeners();
        parser.addErrorListener(errorListener);

        EesParser.ProgramContext program = parser.program();
        if (!errorListener.errors.isEmpty()) {
            throw new ParseException(String.join("\n", errorListener.errors));
        }

        AstBuilder builder = new AstBuilder();
        List<Equation> equations = new ArrayList<>();
        for (EesParser.EquationContext eq : program.equation()) {
            Expr lhs = builder.visit(eq.expr(0));
            Expr rhs = builder.visit(eq.expr(1));
            equations.add(new Equation(lhs, rhs, eq.getText()));
        }
        return equations;
    }
}
