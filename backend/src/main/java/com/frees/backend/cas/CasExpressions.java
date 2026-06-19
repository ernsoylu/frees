package com.frees.backend.cas;

import com.frees.backend.ast.Expr;
import com.frees.backend.parser.AstBuilder;
import com.frees.backend.parser.FreesLexer;
import com.frees.backend.parser.FreesParser;
import org.antlr.v4.runtime.BaseErrorListener;
import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;
import org.antlr.v4.runtime.RecognitionException;
import org.antlr.v4.runtime.Recognizer;
import org.antlr.v4.runtime.Token;

import java.util.ArrayList;
import java.util.List;

/**
 * Parses a single frees arithmetic expression (the {@code expr} grammar rule)
 * into an {@link Expr} AST. Used by the CAS layer both to read the argument of a
 * CAS directive and to read symbolic results that come back from the engine.
 */
public final class CasExpressions {

    private CasExpressions() {
    }

    /** Thrown when a string cannot be parsed as a frees expression. */
    public static final class ParseFailure extends RuntimeException {
        public ParseFailure(String message) {
            super(message);
        }
    }

    public static Expr parse(String expression) {
        CollectingErrorListener errors = new CollectingErrorListener();

        FreesLexer lexer = new FreesLexer(CharStreams.fromString(expression));
        lexer.removeErrorListeners();
        lexer.addErrorListener(errors);

        FreesParser parser = new FreesParser(new CommonTokenStream(lexer));
        parser.removeErrorListeners();
        parser.addErrorListener(errors);

        FreesParser.ExprContext ctx = parser.expr();
        if (!errors.messages.isEmpty()) {
            throw new ParseFailure(String.join("; ", errors.messages));
        }
        // expr does not anchor on EOF, so a partial match (e.g. "x +") would
        // otherwise succeed and silently drop the trailing tokens.
        if (parser.getCurrentToken().getType() != Token.EOF) {
            throw new ParseFailure("unexpected trailing input: '"
                    + parser.getCurrentToken().getText() + "'");
        }

        Expr result = new AstBuilder().visit(ctx);
        if (result == null) {
            throw new ParseFailure("could not build an expression from: " + expression);
        }
        return result;
    }

    private static final class CollectingErrorListener extends BaseErrorListener {
        private final List<String> messages = new ArrayList<>();

        @Override
        public void syntaxError(Recognizer<?, ?> recognizer, Object offendingSymbol, int line,
                                int charPositionInLine, String msg, RecognitionException e) {
            messages.add("col " + charPositionInLine + ": " + msg);
        }
    }
}
