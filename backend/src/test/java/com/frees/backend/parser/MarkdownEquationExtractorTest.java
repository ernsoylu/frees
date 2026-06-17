package com.frees.backend.parser;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class MarkdownEquationExtractorTest {

    @Test
    void testIsPureEquationLine() {
        // True cases
        assertTrue(MarkdownEquationExtractor.isPureEquationLine(""));
        assertTrue(MarkdownEquationExtractor.isPureEquationLine("x + y = 3"));
        assertTrue(MarkdownEquationExtractor.isPureEquationLine("T1 = 100 [C]"));
        assertTrue(MarkdownEquationExtractor.isPureEquationLine("FOR i = 1 TO 5"));
        assertTrue(MarkdownEquationExtractor.isPureEquationLine("End"));
        assertTrue(MarkdownEquationExtractor.isPureEquationLine("Function MyFunc(x)"));

        // False cases
        assertFalse(MarkdownEquationExtractor.isPureEquationLine("# Header"));
        assertFalse(MarkdownEquationExtractor.isPureEquationLine("- List item"));
        assertFalse(MarkdownEquationExtractor.isPureEquationLine("* Bullet point"));
        assertFalse(MarkdownEquationExtractor.isPureEquationLine("> Quote"));
        assertFalse(MarkdownEquationExtractor.isPureEquationLine("The initial temperature T1 = 100 [C]"));
    }

    @Test
    void elementwiseOperatorsSurviveExtraction() {
        // MATLAB-style element-wise operators (.*, ./, .\, .^) and the matrix
        // backslash must be recognized so the equation isn't split and its tail
        // dropped as prose (regression: "C = A .* B" became "C = A").
        assertTrue(MarkdownEquationExtractor.isPureEquationLine("C = A .* B"));
        assertTrue(MarkdownEquationExtractor.isPureEquationLine("C = A ./ B"));
        assertTrue(MarkdownEquationExtractor.isPureEquationLine("C = A .^ 2"));
        assertTrue(MarkdownEquationExtractor.isPureEquationLine("x = A \\ b"));

        String clean = MarkdownEquationExtractor.extract(
                "A = [1 2; 3 4]\nB = [5 6; 7 8]\nC = A .* B").cleanText;
        assertTrue(clean.contains("C = A .* B"), clean);
    }

    @Test
    void hashSuffixedConstantsSurviveExtraction() {
        // Built-in constants carry a trailing '#' (pi#, R#). The extractor's
        // tokenizer must accept '#' so the line stays a pure equation instead
        // of being routed through prose extraction that drops the "# * r^2"
        // tail (regression: "A = pi# * r^2" became "A = pi").
        assertTrue(MarkdownEquationExtractor.isPureEquationLine("A = pi# * r^2"));
        assertTrue(MarkdownEquationExtractor.isPureEquationLine("y = R#"));

        String clean = MarkdownEquationExtractor.extract("A = pi# * r^2").cleanText;
        assertTrue(clean.contains("pi# * r^2"), clean);
    }

    @Test
    void stringLiteralLinesAreEquations() {
        // Lines with quoted string arguments are pure equations and must
        // survive extraction intact (Story 9.9).
        assertTrue(MarkdownEquationExtractor.isPureEquationLine("a = BaseConvert('FF', 16, 10)"));
        assertTrue(MarkdownEquationExtractor.isPureEquationLine("h = Enthalpy('R134a', T=300, x=1)"));

        var extraction = MarkdownEquationExtractor.extract(
                "a = BaseConvert('FF', 16, 10)\nSome prose with x = BaseConvert('1010', 2, 10) inline.");
        assertEquals(2, extraction.equations.size());
        assertEquals("a = BaseConvert('FF', 16, 10)", extraction.equations.get(0).cleanEquation);
        assertEquals("x = BaseConvert('1010', 2, 10)", extraction.equations.get(1).cleanEquation);
    }

    @Test
    void preservesFunctionAndProcedureBodies() {
        // IF/ELSE lines and := assignments inside FUNCTION/PROCEDURE bodies
        // are code, not prose: they must survive extraction verbatim.
        String source = """
                FUNCTION F(x)
                  IF x < 10 THEN
                    F := 64 / x
                  ELSE
                    { turbulent branch }
                    F := (1.8 * log10(x))^-2
                  END
                END
                f = F(5)""";
        String clean = MarkdownEquationExtractor.extract(source).cleanText;
        assertTrue(clean.contains("IF x < 10 THEN"), clean);
        assertTrue(clean.contains("F := 64 / x"), clean);
        assertTrue(clean.contains("ELSE"), clean);
        assertEquals(2, clean.lines().filter(l -> l.trim().equals("END")).count(), clean);

        String proc = """
                PROCEDURE P(d, h : area)
                  radius := d / 2
                  area := 2 * radius * h
                END
                CALL P(0.5, 2.0 : A_c)""";
        String cleanProc = MarkdownEquationExtractor.extract(proc).cleanText;
        assertTrue(cleanProc.contains("radius := d / 2"), cleanProc);
    }

    @Test
    void preservesMultiLineComments() {
        // A {comment} spanning lines must keep its closing brace, otherwise
        // the parser swallows the following equations as comment text.
        String source = """
                { Find the condenser pressure,
                  then the net power output. }
                m_dot = 7.7 [kg/s]
                P = 12500 [kPa]   { turbine inlet }""";
        var result = MarkdownEquationExtractor.extract(source);
        assertTrue(result.cleanText.contains("then the net power output. }"), result.cleanText);
        assertEquals(2, result.equations.size());
    }

    @Test
    void keepsImaginaryLiteralsIntact() {
        // 1i must lex as one number: previously the line was cut after "1".
        String line = "S = V * (2 - 1i * 3)";
        assertTrue(MarkdownEquationExtractor.isPureEquationLine(line));
        var result = MarkdownEquationExtractor.extract(line);
        assertTrue(result.cleanText.contains("(2 - 1i * 3)"), result.cleanText);
    }

    @Test
    void testExtractFromLine() {
        String line = "The initial temperature T1 = 100 [C] and initial pressure P1 = 250 [kPa].";
        List<MarkdownEquationExtractor.ExtractedEquation> eqList = MarkdownEquationExtractor.extractFromLine(line);
        assertEquals(2, eqList.size());

        assertEquals("T1 = 100 [C]", eqList.get(0).originalText);
        assertEquals("T1 = 100 [C]", eqList.get(0).cleanEquation);
        assertEquals(24, eqList.get(0).startIndex);
        assertEquals(36, eqList.get(0).endIndex);

        assertEquals("P1 = 250 [kPa]", eqList.get(1).originalText);
        assertEquals("P1 = 250 [kPa]", eqList.get(1).cleanEquation);
        assertEquals(58, eqList.get(1).startIndex);
        assertEquals(72, eqList.get(1).endIndex);
    }

    @Test
    void testExtractMultiLineDocument() {
        String source = "# Rankine Cycle\n" +
                "We define the inputs:\n" +
                "T1 = 100 [C]\n" +
                "P1 = 250 [kPa]\n" +
                "\n" +
                "Then we calculate h1 = Enthalpy(Water, T=T1, P=P1) in the cycle.";

        MarkdownEquationExtractor.ExtractionResult result = MarkdownEquationExtractor.extract(source);

        // Expected cleanText should contain equations only, separated by semicolon or on their own lines
        String expectedClean = "\n" +
                "\n" +
                "T1 = 100 [C]\n" +
                "P1 = 250 [kPa]\n" +
                "\n" +
                "h1 = Enthalpy(Water, T=T1, P=P1)\n";

        assertEquals(expectedClean, result.cleanText);
        assertEquals(3, result.equations.size());
        assertEquals("T1 = 100 [C]", result.equations.get(0).originalText);
        assertEquals("P1 = 250 [kPa]", result.equations.get(1).originalText);
        assertEquals("h1 = Enthalpy(Water, T=T1, P=P1)", result.equations.get(2).originalText);
    }

    @Test
    void testSemicolonSeparatedEquationsArePure() {
        assertTrue(MarkdownEquationExtractor.isPureEquationLine("A[1,1] = 2;  A[1,2] = 1;  A[1,3] = -1"));
        assertTrue(MarkdownEquationExtractor.isPureEquationLine("x = 1; y = 2"));
        assertTrue(MarkdownEquationExtractor.isPureEquationLine("x = 1;"));
        assertFalse(MarkdownEquationExtractor.isPureEquationLine("some text here; x = 1"));
    }

    @Test
    void testExtractSemicolonSeparatedMatrixAssignments() {
        String source = "A[1,1] = 2;  A[1,2] = 1;  A[1,3] = -1\n" +
                "b[1..3] = [8, -11, -3]\n" +
                "x[1..3] = SolveLinear(A[1..3,1..3], b[1..3])";

        MarkdownEquationExtractor.ExtractionResult result = MarkdownEquationExtractor.extract(source);

        assertEquals(source + "\n", result.cleanText);
        assertEquals(5, result.equations.size());
        assertEquals("A[1,1] = 2", result.equations.get(0).originalText.trim());
        assertEquals("A[1,2] = 1", result.equations.get(1).originalText.trim());
        assertEquals("A[1,3] = -1", result.equations.get(2).originalText.trim());
        assertEquals("b[1..3] = [8, -11, -3]", result.equations.get(3).originalText.trim());
        assertEquals("x[1..3] = SolveLinear(A[1..3,1..3], b[1..3])", result.equations.get(4).originalText.trim());
    }

    @Test
    void testExtractFromLineWithMatrixSubscript() {
        String line = "The matrix entry A[1,2] = 1 appears in row one.";
        List<MarkdownEquationExtractor.ExtractedEquation> eqList = MarkdownEquationExtractor.extractFromLine(line);
        assertEquals(1, eqList.size());
        assertEquals("A[1,2] = 1", eqList.get(0).originalText);
    }

    @Test
    void testGenerateFormattedReportWithSemicolonLine() {
        String source = "x = 1; y = 2";
        List<MarkdownEquationExtractor.ExtractedEquation> extracted = List.of(
                new MarkdownEquationExtractor.ExtractedEquation("x = 1", "x = 1", 0, 5),
                new MarkdownEquationExtractor.ExtractedEquation(" y = 2", " y = 2", 6, 12)
        );
        List<String> formatted = List.of("x = 1", "y = 2");

        String report = MarkdownEquationExtractor.generateFormattedReport(source, extracted, formatted);

        assertEquals("[MATH_BLOCK:x = 1]\n[MATH_BLOCK:y = 2]", report);
    }

    @Test
    void testGenerateFormattedReport() {
        String source = "# Header\n" +
                "Text T1 = 100 [C] text.\n" +
                "x + y = 3";

        // T1 = 100 [C] -> T_{1} = 100\ \left[\text{C}\right]
        // x + y = 3 -> x + y = 3
        List<MarkdownEquationExtractor.ExtractedEquation> extracted = List.of(
                new MarkdownEquationExtractor.ExtractedEquation("T1 = 100 [C]", "T1 = 100 [C]", 5, 17),
                new MarkdownEquationExtractor.ExtractedEquation("x + y = 3", "x + y = 3", 0, 9)
        );

        List<String> formatted = List.of("T_{1} = 100\\ \\left[\\text{C}\\right]", "x + y = 3");

        String report = MarkdownEquationExtractor.generateFormattedReport(source, extracted, formatted);

        String expectedReport = "# Header\n" +
                "Text [MATH_INLINE:T_{1} = 100\\ \\left[\\text{C}\\right]] text.\n" +
                "[MATH_BLOCK:x + y = 3]";

        assertEquals(expectedReport, report);
    }
}
