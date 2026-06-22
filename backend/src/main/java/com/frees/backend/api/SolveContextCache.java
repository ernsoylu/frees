package com.frees.backend.api;

import com.frees.backend.ast.ProcDef;
import com.frees.backend.units.UnitRegistry;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory store of the most recent successful solve, keyed by a client-supplied
 * session id (one per open document/tab). The REPL reads from here so it can
 * evaluate expressions against the solved workspace without re-solving the whole
 * document on every keystroke.
 *
 * <p>Each {@link Session} holds an immutable solve snapshot plus a small mutable
 * overlay of variables the user defined directly in the REPL (e.g. {@code A = 5}).
 * The backend is otherwise stateless; this is a bounded, self-evicting cache
 * (TTL + a hard session cap).
 */
@Component
public class SolveContextCache {

    /** Fallback key for clients that don't send a session id (e.g. local single-user use). */
    public static final String DEFAULT_SESSION = "default";

    private static final long TTL_MILLIS = 60L * 60L * 1000L; // 1 hour
    private static final int MAX_SESSIONS = 256;

    /** One workspace variable as the user sees it: display value, unit, uncertainty. */
    public record ReplVar(double value, String unit, Double uncertainty) {}

    /** Mutable per-document state: the last solve snapshot plus REPL-defined vars. */
    public static final class Session {
        // --- solve snapshot (replaced wholesale on each solve) ---
        private volatile Map<String, Double> siValues = Map.of();      // lowercased name -> SI value
        private volatile Map<String, ReplVar> displayVars = Map.of();  // lowercased name -> display tuple
        private volatile List<String> names = List.of();               // display spellings
        private volatile Map<String, ProcDef> defs = Map.of();         // FUNCTION/TABLE defs in scope
        private volatile UnitRegistry.UnitSystem system = UnitRegistry.UnitSystem.SI;
        // --- REPL-defined overlay (survives across REPL calls, reset on solve) ---
        private final Map<String, Double> overlaySi = new ConcurrentHashMap<>();
        private final Map<String, ReplVar> overlayDisplay = new ConcurrentHashMap<>();
        private volatile long timestampMillis = System.currentTimeMillis();

        public Map<String, ProcDef> defs() { return defs; }
        public UnitRegistry.UnitSystem system() { return system; }

        /** SI values visible to expression math: solve snapshot with REPL overlay on top. */
        public Map<String, Double> siValues() {
            if (overlaySi.isEmpty()) return siValues;
            Map<String, Double> merged = new HashMap<>(siValues);
            merged.putAll(overlaySi);
            return merged;
        }

        /** Display tuple for a bare-variable echo (REPL overlay shadows the solve). */
        public ReplVar displayOf(String lowerName) {
            ReplVar v = overlayDisplay.get(lowerName);
            return v != null ? v : displayVars.get(lowerName);
        }

        /** Unit string for dimension lookups; null when the variable is unknown. */
        public String unitOf(String lowerName) {
            ReplVar v = displayOf(lowerName);
            return v != null ? v.unit() : null;
        }

        /** Variable names for tab-completion: solve snapshot names plus REPL-defined ones. */
        public List<String> completionNames() {
            if (overlayDisplay.isEmpty()) return names;
            java.util.LinkedHashSet<String> all = new java.util.LinkedHashSet<>(names);
            all.addAll(overlayDisplay.keySet());
            return List.copyOf(all);
        }

        /** Records a REPL-defined variable (from {@code name = expr}). */
        public void define(String lowerName, double si, ReplVar display) {
            overlaySi.put(lowerName, si);
            overlayDisplay.put(lowerName, display);
        }

        /** Drops all REPL-defined variables (the `clear` command). */
        public void clearOverlay() {
            overlaySi.clear();
            overlayDisplay.clear();
        }

        /** Drops a specific REPL-defined variable. */
        public void clearVariable(String lowerName) {
            overlaySi.remove(lowerName);
            overlayDisplay.remove(lowerName);
            String prefix = lowerName + "[";
            overlaySi.keySet().removeIf(k -> k.startsWith(prefix));
            overlayDisplay.keySet().removeIf(k -> k.startsWith(prefix));
        }

        /** True once anything is available to evaluate against (solve, defs, or REPL vars). */
        public boolean isPopulated() {
            return !siValues.isEmpty() || !defs.isEmpty() || !overlaySi.isEmpty();
        }
    }

    private final Map<String, Session> store = new ConcurrentHashMap<>();

    /** The session for {@code sessionId}, creating an empty one if absent. */
    public Session session(String sessionId) {
        evict();
        return store.computeIfAbsent(key(sessionId), k -> new Session());
    }

    /** The session for {@code sessionId}, or {@code null} if absent/expired. */
    public Session peek(String sessionId) {
        String k = key(sessionId);
        Session s = store.get(k);
        if (s == null) return null;
        if (isExpired(s)) { store.remove(k); return null; }
        return s;
    }

    /** Replaces the solve snapshot for {@code sessionId}. The REPL overlay is kept
     *  (REPL-defined/overridden variables persist across solves so the terminal
     *  keeps priority over the editor); it is dropped only by the `clear` command. */
    public void put(String sessionId,
                    Map<String, Double> siValues,
                    Map<String, ReplVar> displayVars,
                    List<String> names,
                    Map<String, ProcDef> defs,
                    UnitRegistry.UnitSystem system) {
        Session s = session(sessionId);
        s.siValues = Map.copyOf(siValues);
        s.displayVars = Map.copyOf(displayVars);
        s.names = List.copyOf(names);
        s.defs = Map.copyOf(defs);
        s.system = system != null ? system : UnitRegistry.UnitSystem.SI;
        s.timestampMillis = System.currentTimeMillis();
    }

    public void clear(String sessionId) {
        store.remove(key(sessionId));
    }

    private static boolean isExpired(Session s) {
        return System.currentTimeMillis() - s.timestampMillis > TTL_MILLIS;
    }

    private static String key(String sessionId) {
        return (sessionId == null || sessionId.isBlank()) ? DEFAULT_SESSION : sessionId;
    }

    /** Drops expired entries, then trims the oldest if the session cap is exceeded. */
    private void evict() {
        store.values().removeIf(SolveContextCache::isExpired);
        int overflow = store.size() - MAX_SESSIONS;
        if (overflow > 0) {
            store.entrySet().stream()
                    .sorted(Comparator.comparingLong(e -> e.getValue().timestampMillis))
                    .limit(overflow)
                    .map(Map.Entry::getKey)
                    .toList()
                    .forEach(store::remove);
        }
    }
}
