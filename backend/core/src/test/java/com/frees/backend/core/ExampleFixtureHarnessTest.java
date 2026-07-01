package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

/**
 * TEMPORARY harness (not a real regression test): solves every extracted example
 * fixture and writes a fingerprint report (status + variable count + value sum) to
 * build/example-report.txt. Run before and after the example-syntax modernization
 * and diff the two reports — every example's solvability and numbers must be unchanged.
 */
class ExampleFixtureHarnessTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void fingerprintAllExamples() throws IOException {
        Path dir = Path.of("build/example-fixtures");
        if (!Files.isDirectory(dir)) {
            System.out.println("No fixtures dir; skipping.");
            return;
        }
        List<String> lines = new ArrayList<>();
        List<Path> files;
        try (Stream<Path> s = Files.list(dir)) {
            files = s.filter(p -> p.toString().endsWith(".frees")).sorted().toList();
        }
        for (Path f : files) {
            String name = f.getFileName().toString();
            String src = Files.readString(f);
            String fingerprint;
            try {
                EquationSystemSolver.Result r = solver.solve(src);
                double sum = 0.0;
                int n = 0;
                for (double v : r.variables().values()) {
                    if (Double.isFinite(v)) { sum += v; n++; }
                }
                fingerprint = String.format("OK   vars=%d sum=%.4f", n, sum);
            } catch (Exception e) {
                String msg = e.getMessage();
                if (msg == null) msg = e.getClass().getSimpleName();
                fingerprint = "FAIL " + msg.replaceAll("\\s+", " ").trim();
                if (fingerprint.length() > 140) fingerprint = fingerprint.substring(0, 140);
            }
            lines.add(name + "  ->  " + fingerprint);
        }
        Path report = Path.of("build/example-report.txt");
        Files.write(report, lines);
        long ok = lines.stream().filter(l -> l.contains("->  OK")).count();
        System.out.println("Wrote " + report.toAbsolutePath() + " (" + ok + "/" + lines.size() + " solved)");
    }
}
