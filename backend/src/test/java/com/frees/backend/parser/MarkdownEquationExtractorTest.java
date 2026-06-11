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
        assertTrue(MarkdownEquationExtractor.isPureEquationLine("Duplicate i = 1, 5"));
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
