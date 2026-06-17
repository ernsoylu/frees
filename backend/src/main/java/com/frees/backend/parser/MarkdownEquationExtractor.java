package com.frees.backend.parser;

import java.util.ArrayList;
import java.util.List;

public final class MarkdownEquationExtractor {

    public static class ExtractedEquation {
        public final String originalText;
        public final String cleanEquation;
        public final int startIndex;
        public final int endIndex;

        public ExtractedEquation(String originalText, String cleanEquation, int startIndex, int endIndex) {
            this.originalText = originalText;
            this.cleanEquation = cleanEquation;
            this.startIndex = startIndex;
            this.endIndex = endIndex;
        }
    }

    public static class ExtractionResult {
        public final String cleanText;
        public final List<ExtractedEquation> equations;

        public ExtractionResult(String cleanText, List<ExtractedEquation> equations) {
            this.cleanText = cleanText;
            this.equations = equations;
        }
    }

    private enum TokenType {
        NUMBER, STRING, UNIT, IDENTIFIER, OPERATOR, OPEN_PAREN, CLOSE_PAREN, OPEN_BRACKET, CLOSE_BRACKET, COMMA
    }

    private static class Token {
        final TokenType type;
        final String text;
        final int endIdx;

        Token(TokenType type, String text, int endIdx) {
            this.type = type;
            this.text = text;
            this.endIdx = endIdx;
        }
    }

    private MarkdownEquationExtractor() {}

    /**
     * Splits a line at top-level semicolons (several equations per line are allowed,
     * e.g. "A[1,1] = 2; A[1,2] = 1"), ignoring semicolons inside {comments} and "strings".
     * Returns [start, end) index pairs into the given string; always at least one segment.
     */
    private static List<int[]> semicolonSegments(String line) {
        List<int[]> segments = new ArrayList<>();
        boolean inBraces = false;
        boolean inQuotes = false;
        int segStart = 0;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (inBraces) {
                if (c == '}') {
                    inBraces = false;
                }
            } else if (inQuotes) {
                if (c == '"') {
                    inQuotes = false;
                }
            } else if (c == '{') {
                inBraces = true;
            } else if (c == '"') {
                inQuotes = true;
            } else if (c == ';') {
                segments.add(new int[]{segStart, i});
                segStart = i + 1;
            }
        }
        segments.add(new int[]{segStart, line.length()});
        return segments;
    }

    public static String stripComments(String text) {
        StringBuilder sb = new StringBuilder();
        boolean inBraces = false;
        boolean inQuotes = false;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (inBraces) {
                if (c == '}') {
                    inBraces = false;
                }
            } else if (inQuotes) {
                if (c == '"') {
                    inQuotes = false;
                }
            } else if (c == '{') {
                inBraces = true;
            } else if (c == '"') {
                inQuotes = true;
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    public static boolean isPureEquationLine(String line) {
        String clean = stripComments(line).trim();
        if (clean.isEmpty()) {
            return true;
        }
        if (clean.startsWith("#") || clean.startsWith("-") || clean.startsWith("*") || clean.startsWith(">")) {
            return false;
        }
        List<int[]> segments = semicolonSegments(clean);
        if (segments.size() > 1) {
            for (int[] seg : segments) {
                String segment = clean.substring(seg[0], seg[1]).trim();
                if (!segment.isEmpty() && !isPureEquationLine(segment)) {
                    return false;
                }
            }
            return true;
        }
        String upper = clean.toUpperCase();
        if (upper.startsWith("FOR") || upper.startsWith("WHILE") || upper.startsWith("END") ||
            upper.startsWith("FUNCTION") || upper.startsWith("PROCEDURE") ||
            upper.startsWith("MODULE") || upper.startsWith("CALL") ||
            upper.startsWith("PARAMETRIC") || opensTableBlock(upper) || opensPlotBlock(upper) ||
            opensStateTableBlock(upper)) {
            return true;
        }
        if (!clean.contains("=")) {
            return false;
        }
        return isValidMathTokenSequence(clean);
    }


    private static boolean isTransitionAllowed(TokenType lastType, TokenType tokenType) {
        if (lastType == null) {
            return true;
        }
        return switch (lastType) {
            case NUMBER, STRING -> tokenType != TokenType.IDENTIFIER && tokenType != TokenType.NUMBER && tokenType != TokenType.STRING && tokenType != TokenType.OPEN_PAREN;
            case IDENTIFIER -> tokenType != TokenType.IDENTIFIER && tokenType != TokenType.NUMBER && tokenType != TokenType.STRING && tokenType != TokenType.UNIT;
            case UNIT, CLOSE_PAREN, CLOSE_BRACKET -> tokenType != TokenType.IDENTIFIER && tokenType != TokenType.NUMBER && tokenType != TokenType.STRING && tokenType != TokenType.UNIT && tokenType != TokenType.OPEN_PAREN;
            default -> true;
        };
    }

    private static boolean isValidMathTokenSequence(String line) {
        int i = 0;
        TokenType lastType = null;
        while (i < line.length()) {
            Token token = nextToken(line, i);
            if (token == null) {
                return false;
            }

            if (!isTransitionAllowed(lastType, token.type)) {
                return false;
            }

            lastType = token.type;
            i = token.endIdx;
        }
        return true;
    }

    /** FUNCTION/PROCEDURE/MODULE keyword opening a body that runs to END. */
    private static boolean opensCodeBlock(String line) {
        String upper = stripComments(line).trim().toUpperCase();
        return upper.startsWith("FUNCTION") || upper.startsWith("PROCEDURE")
                || upper.startsWith("MODULE") || upper.startsWith("PARAMETRIC")
                || opensTableBlock(upper) || opensPlotBlock(upper)
                || opensStateTableBlock(upper);
    }

    /** A STATE TABLE block opener: the two keywords (any whitespace between)
     * followed by a word boundary, so the block body runs verbatim to END. */
    private static boolean opensStateTableBlock(String upper) {
        return STATE_TABLE_OPENER.matcher(upper).find();
    }

    private static final java.util.regex.Pattern STATE_TABLE_OPENER =
            java.util.regex.Pattern.compile("^STATE\\s+TABLE(\\s|\\(|$)");

    /** A TABLE block opener: the keyword followed by a word boundary, so a
     * variable like {@code table_temp = 5} is not mistaken for a block. */
    private static boolean opensTableBlock(String upper) {
        return upper.equals("TABLE")
                || (upper.startsWith("TABLE") && upper.length() > 5
                        && !isIdentChar(upper.charAt(5)));
    }

    /** A PLOT block opener: the keyword followed by a word boundary, so a
     * variable like {@code plot_x = 5} is not mistaken for a block. */
    private static boolean opensPlotBlock(String upper) {
        return upper.equals("PLOT")
                || (upper.startsWith("PLOT") && upper.length() > 4
                        && !isIdentChar(upper.charAt(4)));
    }

    private static boolean isIdentChar(char c) {
        return Character.isLetterOrDigit(c) || c == '_' || c == '$';
    }

    /** Depth change contributed by a line inside a FUNCTION/PROCEDURE/MODULE
     * body: IF and REPEAT open nested blocks, END and UNTIL close one. */
    private static int nestedDepthDelta(String line) {
        String upper = stripComments(line).trim().toUpperCase();
        if (upper.startsWith("IF ") || upper.startsWith("IF(")
                || upper.startsWith("REPEAT") || upper.startsWith("FOR") || upper.startsWith("WHILE")) {
            return 1;
        }
        if (upper.equals("END") || upper.startsWith("END ")
                || upper.startsWith("UNTIL")) {
            return -1;
        }
        return 0;
    }

    /** Whether the line ends inside a still-open {comment}. */
    private static boolean leavesCommentOpen(String line) {
        boolean inBraces = false;
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (inBraces) {
                if (c == '}') {
                    inBraces = false;
                }
            } else if (inQuotes) {
                if (c == '"') {
                    inQuotes = false;
                }
            } else if (c == '{') {
                inBraces = true;
            } else if (c == '"') {
                inQuotes = true;
            }
        }
        return inBraces;
    }

    public static ExtractionResult extract(String source) {
        if (source == null) {
            return new ExtractionResult("", List.of());
        }
        StringBuilder clean = new StringBuilder();
        List<ExtractedEquation> equations = new ArrayList<>();
        String[] lines = source.split("\\r?\\n", -1);
        int blockDepth = 0;
        boolean inComment = false;
        for (int lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            String line = lines[lineIdx];
            String stripped = stripComments(line).trim();
            if (inComment) {
                // Continuation of a multi-line {comment} opened on a kept
                // line: preserve it so the parser sees the closing brace.
                clean.append(line).append("\n");
                inComment = line.indexOf('}') == -1;
                continue;
            }
            if (blockDepth > 0) {
                // Inside a FUNCTION/PROCEDURE/MODULE body: assignments
                // (:=), IF/ELSE and loop lines are code, not prose — keep
                // them verbatim and out of the equation list.
                blockDepth += nestedDepthDelta(line);
                clean.append(line).append("\n");
                inComment = leavesCommentOpen(line);
                continue;
            }
            if (opensCodeBlock(line)) {
                blockDepth = 1;
                clean.append(line).append("\n");
                inComment = leavesCommentOpen(line);
                continue;
            }
            if (isPureEquationLine(line)) {
                clean.append(line).append("\n");
                inComment = leavesCommentOpen(line);
                if (stripped.contains("=")) {
                    for (int[] seg : semicolonSegments(line)) {
                        String segText = line.substring(seg[0], seg[1]);
                        if (stripComments(segText).trim().contains("=")) {
                            equations.add(new ExtractedEquation(segText, segText, seg[0], seg[1]));
                        }
                    }
                }
            } else {
                List<ExtractedEquation> lineEqs = extractFromLine(line);
                if (lineEqs.isEmpty()) {
                    clean.append("\n");
                } else {
                    StringBuilder cleanLine = new StringBuilder();
                    for (int i = 0; i < lineEqs.size(); i++) {
                        cleanLine.append(lineEqs.get(i).cleanEquation);
                        if (i < lineEqs.size() - 1) {
                            cleanLine.append(" ; ");
                        }
                    }
                    clean.append(cleanLine).append("\n");
                    equations.addAll(lineEqs);
                }
            }
        }
        return new ExtractionResult(clean.toString(), equations);
    }

    public static List<ExtractedEquation> extractFromLine(String line) {
        List<ExtractedEquation> list = new ArrayList<>();
        int index = 0;
        while (index < line.length()) {
            int eqIndex = line.indexOf('=', index);
            if (eqIndex == -1) {
                break;
            }

            int lhsStart = scanLhsStart(line, eqIndex);
            if (lhsStart == -1) {
                index = eqIndex + 1;
                continue;
            }

            int rhsEnd = scanRhsEnd(line, eqIndex + 1);
            if (rhsEnd <= eqIndex + 1) {
                index = eqIndex + 1;
                continue;
            }

            String original = line.substring(lhsStart, rhsEnd);
            list.add(new ExtractedEquation(original, original, lhsStart, rhsEnd));
            index = rhsEnd;
        }
        return list;
    }

    private static int scanLhsStart(String line, int eqIndex) {
        int i = eqIndex - 1;
        while (i >= 0 && Character.isWhitespace(line.charAt(i))) {
            i--;
        }
        if (i < 0) {
            return -1;
        }

        if (line.charAt(i) == ']') {
            i--;
            while (i >= 0 && line.charAt(i) != '[') {
                char c = line.charAt(i);
                // Subscripts may be multi-dimensional or ranged: A[1,2], x[1..3]
                if (!Character.isLetterOrDigit(c) && c != '_' && c != ',' && c != '.' && !Character.isWhitespace(c)) {
                    return -1;
                }
                i--;
            }
            if (i < 0) {
                return -1;
            }
            i--;
            while (i >= 0 && Character.isWhitespace(line.charAt(i))) {
                i--;
            }
        }

        int idEnd = i;
        // String variables carry a trailing '$': R$ = 'R134a'
        if (i >= 0 && line.charAt(i) == '$') {
            i--;
        }
        while (i >= 0 && (Character.isLetterOrDigit(line.charAt(i)) || line.charAt(i) == '_')) {
            i--;
        }
        int idStart = i + 1;
        if (idStart > idEnd) {
            return -1;
        }
        char first = line.charAt(idStart);
        if (!Character.isLetter(first) && first != '_') {
            return -1;
        }
        return idStart;
    }

    private static int scanRhsEnd(String line, int start) {
        int i = start;
        TokenType lastType = null;
        int lastValidEnd = start;

        while (i < line.length()) {
            Token token = nextToken(line, i);
            if (token == null) {
                break;
            }

            if (!isTransitionAllowed(lastType, token.type)) {
                break;
            }

            lastType = token.type;
            i = token.endIdx;
            lastValidEnd = i;
        }

        while (lastValidEnd > start && Character.isWhitespace(line.charAt(lastValidEnd - 1))) {
            lastValidEnd--;
        }
        return lastValidEnd;
    }

    private static Token nextToken(String line, int start) {
        int i = start;
        while (i < line.length() && Character.isWhitespace(line.charAt(i))) {
            i++;
        }
        if (i >= line.length()) {
            return null;
        }

        char c = line.charAt(i);

        if (c == '[') {
            int prev = i - 1;
            while (prev >= 0 && Character.isWhitespace(line.charAt(prev))) {
                prev--;
            }
            boolean isArrayAccess = false;
            if (prev >= 0) {
                char pc = line.charAt(prev);
                if (Character.isLetterOrDigit(pc) || pc == '_' || pc == ']' || pc == ')') {
                    isArrayAccess = true;
                }
            }
            if (!isArrayAccess) {
                int end = line.indexOf(']', i);
                if (end != -1) {
                    String unitText = line.substring(i, end + 1);
                    return new Token(TokenType.UNIT, unitText, end + 1);
                }
            }
            return new Token(TokenType.OPEN_BRACKET, "[", i + 1);
        }
        if (c == ']') {
            return new Token(TokenType.CLOSE_BRACKET, "]", i + 1);
        }
        if (c == '(') {
            return new Token(TokenType.OPEN_PAREN, "(", i + 1);
        }
        if (c == ')') {
            return new Token(TokenType.CLOSE_PAREN, ")", i + 1);
        }
        if (c == ',') {
            return new Token(TokenType.COMMA, ",", i + 1);
        }
        // String literal: 'R134a' — single quotes, no nesting.
        if (c == '\'') {
            int end = line.indexOf('\'', i + 1);
            if (end != -1) {
                return new Token(TokenType.STRING, line.substring(i, end + 1), end + 1);
            }
            return null;
        }

        if (Character.isDigit(c) || (c == '.' && i + 1 < line.length() && Character.isDigit(line.charAt(i + 1)))) {
            int end = i;
            while (end < line.length() && (Character.isDigit(line.charAt(end)) || line.charAt(end) == '.')) {
                end++;
            }
            if (end < line.length() && (line.charAt(end) == 'e' || line.charAt(end) == 'E')) {
                int exp = end + 1;
                if (exp < line.length() && (line.charAt(exp) == '+' || line.charAt(exp) == '-')) {
                    exp++;
                }
                while (exp < line.length() && Character.isDigit(line.charAt(exp))) {
                    exp++;
                }
                end = exp;
            }
            // Imaginary literal suffix: 0i, 1.5i — but not the start of an
            // identifier (2items stays a number followed by an identifier).
            if (end < line.length() && (line.charAt(end) == 'i' || line.charAt(end) == 'j')
                    && (end + 1 >= line.length()
                        || (!Character.isLetterOrDigit(line.charAt(end + 1))
                            && line.charAt(end + 1) != '_'))) {
                end++;
            }
            return new Token(TokenType.NUMBER, line.substring(i, end), end);
        }

        if (Character.isLetter(c) || c == '_') {
            int end = i;
            while (end < line.length() && (Character.isLetterOrDigit(line.charAt(end)) || line.charAt(end) == '_')) {
                end++;
            }
            // String variables carry a trailing '$' (R$ = 'R134a'); built-in
            // constants carry a trailing '#' (pi#, R#, g#).
            if (end < line.length() && (line.charAt(end) == '$' || line.charAt(end) == '#')) {
                end++;
            }
            return new Token(TokenType.IDENTIFIER, line.substring(i, end), end);
        }

        // Two-char operators starting with '.': MATLAB-style element-wise
        // operators (.*, ./, .\, .^) and the range operator (..). Without these,
        // a line like "C = A .* B" fails validation and the ".* B" tail is
        // dropped as prose.
        if (c == '.' && i + 1 < line.length()) {
            char n = line.charAt(i + 1);
            if (n == '*' || n == '/' || n == '\\' || n == '^' || n == '.') {
                return new Token(TokenType.OPERATOR, line.substring(i, i + 2), i + 2);
            }
        }

        // ':' and '|' appear in MATLAB-style range assignments
        // (speed = 0:10:100 | Linear); '\' is the matrix backslash solver.
        // Treat them as operators so the line is recognized as an equation
        // rather than dropped as prose.
        if (c == '+' || c == '-' || c == '*' || c == '/' || c == '^' || c == '='
                || c == ':' || c == '|' || c == '\\') {
            return new Token(TokenType.OPERATOR, String.valueOf(c), i + 1);
        }

        return null;
    }

    public static String generateFormattedReport(String originalText, List<ExtractedEquation> extracted, List<String> formattedEquations) {
        if (extracted.size() != formattedEquations.size()) {
            return originalText;
        }
        String[] lines = originalText.split("\\r?\\n", -1);
        StringBuilder report = new StringBuilder();
        int eqIndex = 0;
        int blockDepth = 0;
        boolean inComment = false;
        for (String line : lines) {
            if (inComment) {
                report.append(line).append("\n");
                inComment = line.indexOf('}') == -1;
                continue;
            }
            if (blockDepth > 0) {
                blockDepth += nestedDepthDelta(line);
                report.append(line).append("\n");
                inComment = leavesCommentOpen(line);
                continue;
            }
            if (opensCodeBlock(line)) {
                blockDepth = 1;
                report.append(line).append("\n");
                inComment = leavesCommentOpen(line);
                continue;
            }
            if (isPureEquationLine(line)) {
                inComment = leavesCommentOpen(line);
                String stripped = stripComments(line).trim();
                if (stripped.contains("=")) {
                    for (int[] seg : semicolonSegments(line)) {
                        if (stripComments(line.substring(seg[0], seg[1])).trim().contains("=")) {
                            String latex = formattedEquations.get(eqIndex++);
                            report.append("[MATH_BLOCK:").append(latex).append("]").append("\n");
                        }
                    }
                } else {
                    report.append(line).append("\n");
                }
            } else {
                List<ExtractedEquation> lineEqs = extractFromLine(line);
                if (lineEqs.isEmpty()) {
                    report.append(line).append("\n");
                } else {
                    StringBuilder newLine = new StringBuilder();
                    int currentPos = 0;
                    for (ExtractedEquation eq : lineEqs) {
                        newLine.append(line, currentPos, eq.startIndex);
                        String latex = formattedEquations.get(eqIndex++);
                        boolean isBlock = isEntireLineEquation(line, eq);
                        if (isBlock) {
                            newLine.append("[MATH_BLOCK:").append(latex).append("]");
                        } else {
                            newLine.append("[MATH_INLINE:").append(latex).append("]");
                        }
                        currentPos = eq.endIndex;
                    }
                    newLine.append(line.substring(currentPos));
                    report.append(newLine).append("\n");
                }
            }
        }
        if (!originalText.endsWith("\n") && !report.isEmpty()) {
            report.setLength(report.length() - 1);
        }
        return report.toString();
    }

    private static boolean isEntireLineEquation(String line, ExtractedEquation eq) {
        String before = line.substring(0, eq.startIndex).trim();
        String after = line.substring(eq.endIndex).trim();
        if (after.equals(".") || after.equals(",") || after.equals(";")) {
            after = "";
        }
        return before.isEmpty() && after.isEmpty();
    }
}
