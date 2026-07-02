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
 * Golden-circuit component fixture harness — the throughput enabler for a large
 * component library. Every {@code *.frees} file under
 * {@code src/test/resources/component-fixtures/} is one verified test case: a
 * small circuit exercising a component (or variant), with hand-derived expected
 * values embedded as comment directives. Adding a verified component test is
 * adding a fixture file, not a Java class.
 *
 * <p>Directives (frees {@code //} comments, so the solver never sees them):
 * <ul>
 *   <li>{@code // EXPECT <var> = <value> [tol <abs>]} — the solved variable
 *       (dotted display name, case-insensitive) must equal the hand-derived
 *       value. Default tolerance {@code max(1e-6·|value|, 1e-9)}. Transient
 *       assertions use the same form on {@code FinalValue}/{@code MaxValue}/
 *       {@code TimeAt} accessor variables defined in the fixture.</li>
 *   <li>{@code // EXPECT-ERROR <substring>} — the circuit must be REJECTED with
 *       a diagnostic containing the substring (diagnostics are part of the
 *       component contract too).</li>
 * </ul>
 * A fixture with no directive fails — an unasserted fixture verifies nothing.
 */
class ComponentFixturesTest {

    private static final Path ROOT = Path.of("src/test/resources/component-fixtures");
    private static final Pattern EXPECT =
            Pattern.compile("^//\\s*EXPECT\\s+(\\S+)\\s*=\\s*(\\S+)(?:\\s+tol\\s+(\\S+))?\\s*$");
    private static final Pattern EXPECT_ERROR =
            Pattern.compile("^//\\s*EXPECT-ERROR\\s+(.+?)\\s*$");

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @TestFactory
    Stream<DynamicTest> componentFixtures() throws IOException {
        assertTrue(Files.isDirectory(ROOT), "fixture directory missing: " + ROOT.toAbsolutePath());
        List<Path> files;
        try (Stream<Path> s = Files.walk(ROOT)) {
            files = s.filter(p -> p.toString().endsWith(".frees")).sorted().toList();
        }
        assertFalse(files.isEmpty(), "no component fixtures found under " + ROOT.toAbsolutePath());
        return files.stream().map(f -> DynamicTest.dynamicTest(
                ROOT.relativize(f).toString(), () -> runFixture(f)));
    }

    private void runFixture(Path file) throws IOException {
        String src = Files.readString(file);
        List<String[]> expects = new ArrayList<>();   // {var, value, tol?}
        List<String> expectErrors = new ArrayList<>();
        for (String line : src.split("\n")) {
            Matcher m = EXPECT.matcher(line.trim());
            if (m.matches()) {
                expects.add(new String[]{m.group(1), m.group(2), m.group(3)});
                continue;
            }
            Matcher e = EXPECT_ERROR.matcher(line.trim());
            if (e.matches()) {
                expectErrors.add(e.group(1));
            }
        }
        if (expects.isEmpty() && expectErrors.isEmpty()) {
            fail(file + ": fixture has no EXPECT / EXPECT-ERROR directive — it verifies nothing.");
        }
        if (!expectErrors.isEmpty()) {
            try {
                solver.solve(src);
                fail(file + ": expected the circuit to be rejected, but it solved.");
            } catch (RuntimeException ex) {
                String msg = ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
                for (String want : expectErrors) {
                    assertTrue(msg.toLowerCase(Locale.ROOT).contains(want.toLowerCase(Locale.ROOT)),
                            file + ": diagnostic should contain '" + want + "' but was: " + msg);
                }
            }
            return;
        }
        Map<String, Double> v = solver.solve(src).variables();
        for (String[] ex : expects) {
            String name = ex[0].toLowerCase(Locale.ROOT);
            double expected = Double.parseDouble(ex[1]);
            double tol = ex[2] != null ? Double.parseDouble(ex[2])
                    : Math.max(1e-6 * Math.abs(expected), 1e-9);
            Double actual = v.get(name);
            if (actual == null) {
                fail(file + ": EXPECT references '" + ex[0] + "' but the solution has no such "
                        + "variable. Solved names include e.g. "
                        + v.keySet().stream().filter(k -> k.contains(".")).limit(8).toList());
            }
            assertEquals(expected, actual, tol, file + ": " + ex[0]);
        }
    }
}
