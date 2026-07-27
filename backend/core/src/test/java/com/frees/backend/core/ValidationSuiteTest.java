package com.frees.backend.core;

import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * Published verification suite — every {@code *.frees} file under
 * {@code src/test/resources/validation/} is one physics/numerics problem whose
 * expected values are independently derivable: a closed-form solution, exact
 * arithmetic, or a public-standard table value (e.g. the U.S. Standard
 * Atmosphere 1976). The Help portal's Verification page mirrors this directory
 * one-to-one; CI runs this suite on every commit, so the numbers published
 * there are enforced, not aspirational.
 *
 * <p>Directives (frees {@code //} comments, so the solver never sees them):
 * <ul>
 *   <li>{@code // EXPECT <var> = <value> [tol <abs>]} — the solved variable
 *       (dotted display name, case-insensitive) must equal the derived value.
 *       Default tolerance {@code max(1e-6·|value|, 1e-9)}.</li>
 *   <li>{@code // EXPECT-UNC <var> = <value> [tol <abs>]} — the propagated
 *       uncertainty of the variable (flat solver name) must equal the value.</li>
 * </ul>
 * Each file also carries {@code // VALIDATION:} / {@code // AREA:} /
 * {@code // BASIS:} header comments naming the problem and the derivation the
 * expectation rests on — the part a reader needs to audit the number without
 * trusting the suite. A file with no directive fails: an unasserted case
 * verifies nothing.
 */
class ValidationSuiteTest {

    private static final Path ROOT = Path.of("src/test/resources/validation");
    // Matched against trim()ed lines; possessive quantifiers forbid
    // backtracking (same rationale as ComponentFixturesTest).
    private static final Pattern EXPECT =
            Pattern.compile("^//\\s*+EXPECT\\s++([^=\\s]++)\\s*+=\\s*+(\\S++)(?:\\s++tol\\s++(\\S++))?+$");
    private static final Pattern EXPECT_UNC =
            Pattern.compile("^//\\s*+EXPECT-UNC\\s++([^=\\s]++)\\s*+=\\s*+(\\S++)(?:\\s++tol\\s++(\\S++))?+$");

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @TestFactory
    Stream<DynamicTest> validationCases() throws IOException {
        assertTrue(Files.isDirectory(ROOT), "validation directory missing: " + ROOT.toAbsolutePath());
        List<Path> files;
        try (Stream<Path> s = Files.walk(ROOT)) {
            files = s.filter(p -> p.toString().endsWith(".frees")).sorted().toList();
        }
        assertFalse(files.isEmpty(), "no validation cases found under " + ROOT.toAbsolutePath());
        return files.stream().map(f -> DynamicTest.dynamicTest(
                ROOT.relativize(f).toString(), () -> runCase(f)));
    }

    private void runCase(Path file) throws IOException {
        String src = Files.readString(file);
        List<String[]> expects = new ArrayList<>();      // {var, value, tol?}
        List<String[]> expectUncs = new ArrayList<>();   // {var, value, tol?}
        for (String line : src.split("\n")) {
            Matcher u = EXPECT_UNC.matcher(line.trim());
            if (u.matches()) {
                expectUncs.add(new String[]{u.group(1), u.group(2), u.group(3)});
                continue;
            }
            Matcher m = EXPECT.matcher(line.trim());
            if (m.matches()) {
                expects.add(new String[]{m.group(1), m.group(2), m.group(3)});
            }
        }
        if (expects.isEmpty() && expectUncs.isEmpty()) {
            fail(file + ": case has no EXPECT / EXPECT-UNC directive — it verifies nothing.");
        }
        EquationSystemSolver.Result result = solver.solve(src);
        Map<String, Double> v = result.variables();
        for (String[] ex : expects) {
            assertWithin(file, "EXPECT", ex, v.get(ex[0].toLowerCase(Locale.ROOT)));
        }
        for (String[] ex : expectUncs) {
            assertWithin(file, "EXPECT-UNC", ex,
                    result.uncertainties().get(ex[0].toLowerCase(Locale.ROOT)));
        }
    }

    private static void assertWithin(Path file, String directive, String[] ex, Double actual) {
        double expected = Double.parseDouble(ex[1]);
        double tol = ex[2] != null ? Double.parseDouble(ex[2])
                : Math.max(1e-6 * Math.abs(expected), 1e-9);
        if (actual == null) {
            fail(file + ": " + directive + " references '" + ex[0] + "' but the solution has no such value.");
        }
        assertEquals(expected, actual, tol, file + ": " + directive + " " + ex[0]);
    }
}
