package com.frees.backend.core;
import org.junit.jupiter.api.Test;
import java.nio.file.Files;
import java.nio.file.Path;
class BareInputProbeTest {
    private final EquationSystemSolver solver = new EquationSystemSolver();
    @Test
    void probe() throws Exception {
        String src = Files.readString(Path.of("build/probe/p.frees"));
        StringBuilder sb = new StringBuilder();
        try {
            solver.solve(src);
            sb.append("OK");
        } catch (Exception e) {
            sb.append(e).append("\n");
            for (StackTraceElement el : e.getStackTrace()) {
                if (el.getClassName().contains("frees")) sb.append("  at ").append(el).append("\n");
            }
        }
        Files.writeString(Path.of("build/probe/result.txt"), sb.toString());
    }
}
