package com.frees.backend.api;

import com.frees.backend.ast.StateTableDef;
import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.parser.EquationParser;
import com.frees.backend.props.CoolProp;
import com.frees.backend.props.PropertyFunctions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Resolves thermodynamic state points and builds the cycle-path trace for the
 * Solve endpoints.
 *
 * <p>Two related concerns lived tangled inside the old monolithic
 * {@code SolveController} (≈570 lines): (1) detecting solver variables that name
 * a fluid state ({@code T1}, {@code P_2}, {@code h[3]}, …) and back-filling the
 * missing properties of each state through CoolProp, and (2) interpolating a
 * smooth process path between consecutive states (isobaric / isentropic /
 * isothermal / isenthalpic / isochoric / default) so the frontend can overlay the
 * solved states on a T-s or P-h dome. Both are pure functions of a solved
 * {@link EquationSystemSolver.Result} and the source text, with no controller
 * state, so they collapse cleanly into this one component.
 *
 * <p>Made a Spring {@code @Component} (rather than a static utility) so it can be
 * mocked in tests and so its {@link Logger} is owned once.
 */
@Component
public class CyclePathResolver {

    private static final Logger log = LoggerFactory.getLogger(CyclePathResolver.class);

    private static final String HMASS = "Hmass";
    private static final String SMASS = "Smass";
    private static final String DMASS = "Dmass";

    private record PropPair(String key1, String valKey1, String key2, String valKey2) {}

    private static final Map<String, String> PROPERTY_ALIASES = Map.ofEntries(
            Map.entry("t", "T"),
            Map.entry("drybulb", "T"),
            Map.entry("tdrybulb", "T"),
            Map.entry("p", "P"),
            Map.entry("pressure", "P"),
            Map.entry("v", "v"),
            Map.entry("volume", "v"),
            Map.entry("u", "u"),
            Map.entry("internalenergy", "u"),
            Map.entry("h", "h"),
            Map.entry("enthalpy", "h"),
            Map.entry("s", "s"),
            Map.entry("entropy", "s"),
            Map.entry("x", "x"),
            Map.entry("quality", "x"),
            Map.entry("rho", "rho"),
            Map.entry("density", "rho")
    );

    /** Property symbols, longest first, for leading-prefix matching of declared
     * state-table variables (so {@code rho...} beats {@code r...}, etc.). */
    private static final List<String> PROPERTY_PREFIXES = PROPERTY_ALIASES.keySet().stream()
            .sorted((a, b) -> Integer.compare(b.length(), a.length()))
            .toList();

    private static final Pattern BLOCK_BRACKET_STATE =
            Pattern.compile("^([a-zA-Z][a-zA-Z_]*)\\[(\\d+)\\]$");
    private static final Pattern BLOCK_PLAIN_STATE =
            Pattern.compile("^([a-zA-Z][a-zA-Z_]*?)(_?)(\\d+)$");

    /** A state-indexed variable, either {@code name_3} or {@code name[3]}. */
    private static final Pattern STATE_VAR_INDEX =
            Pattern.compile(
                    "^([a-zA-Z][a-zA-Z_]*?)_?(\\d+)$|^([a-zA-Z][a-zA-Z_]*)\\[(\\d+)\\]$");

    private static final List<PropPair> PREFERRED_PAIRS = List.of(
            new PropPair("P", "P", "h", HMASS),
            new PropPair("P", "P", "s", SMASS),
            new PropPair("h", HMASS, "s", SMASS),
            new PropPair("P", "P", "x", "Q"),
            new PropPair("T", "T", "x", "Q"),
            new PropPair("T", "T", "P", "P"),
            new PropPair("T", "T", "s", SMASS),
            new PropPair("T", "T", "h", HMASS),
            new PropPair("P", "P", "v", DMASS),
            new PropPair("T", "T", "v", DMASS),
            new PropPair("P", "P", "rho", DMASS),
            new PropPair("T", "T", "rho", DMASS)
    );

    private static double getPropOrNaN(String output, String name1, double prop1, String name2, double prop2, String fluid) {
        try {
            return CoolProp.propsSIOrNaN(output, name1, prop1, name2, prop2, fluid);
        } catch (Exception e) {
            // Out-of-range / unsupported property request — NaN signals "unavailable"
            // to the caller; logged at debug for diagnosis without log noise.
            log.debug("CoolProp lookup failed for {} of {} (returning NaN)", output, fluid, e);
            return Double.NaN;
        }
    }

    /** Back-fills the missing fluid properties of every detected state point in
     *  {@code result} (and of each alternative solution), returning a new result.
     *  When {@code fillMissing} is false the result is passed through unchanged. */
    EquationSystemSolver.Result resolveMissingProperties(EquationSystemSolver.Result result,
                                                         String text, Set<String> targetVariables) {
        if (!CoolProp.isAvailable()) {
            return result;
        }
        String fluid = PropertyFunctions.detectFluid(text);
        if (fluid == null) {
            fluid = "Water";
        }

        // Explicit STATE TABLE blocks (if any) drive fluid-aware, per-circuit
        // grouping; otherwise fall back to the legacy global index detection.
        List<StateTableDef> stateTables = List.of();
        try {
            stateTables = new EquationParser().parseResult(text).stateTables();
        } catch (RuntimeException ignored) {
            // text is still valid here (it solved); be defensive regardless.
        }

        // 1. Resolve variables of the main result
        Map<String, Double> mutableVars = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        mutableVars.putAll(result.variables());

        Map<String, String> mutableDisplayNames = new HashMap<>(result.displayNames());

        resolveStates(mutableVars, mutableDisplayNames, fluid, targetVariables, stateTables);

        // 2. Resolve variables of all solutions
        List<EquationSystemSolver.Solution> resolvedSolutions = new ArrayList<>();
        for (EquationSystemSolver.Solution sol : result.solutions()) {
            Map<String, Double> solVars = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
            solVars.putAll(sol.variables());
            resolveStates(solVars, mutableDisplayNames, fluid, targetVariables, stateTables);
            resolvedSolutions.add(new EquationSystemSolver.Solution(solVars, sol.residuals(), sol.maxResidual()));
        }

        return new EquationSystemSolver.Result(
                mutableVars,
                result.blocks(),
                result.residuals(),
                result.stats(),
                resolvedSolutions,
                mutableDisplayNames,
                result.uncertainties(),
                result.odeTables()
        );
    }

    /** Builds the ordered list of flashed state points connecting every solved
     *  state, for overlaying the cycle on a property plot. Returns an empty list
     *  when CoolProp is unavailable or fewer than two states are present. */
    List<Map<String, Double>> generateCyclePath(Map<String, Double> variables, String fluid) {
        List<Map<String, Double>> path = new ArrayList<>();
        if (!CoolProp.isAvailable()) {
            return path;
        }

        Map<Integer, Map<String, Double>> stateKnowns = groupStateKnowns(variables);

        List<Integer> indices = new ArrayList<>(stateKnowns.keySet());
        Collections.sort(indices);

        if (indices.size() < 2) {
            return path;
        }

        int segmentsCount = indices.size();
        for (int i = 0; i < segmentsCount; i++) {
            Map<String, Double> stateA = stateKnowns.get(indices.get(i));
            Map<String, Double> stateB = stateKnowns.get(indices.get((i + 1) % segmentsCount));

            List<Map<String, Double>> segmentPoints = interpolateProcess(stateA, stateB, fluid);
            if (i > 0 && !segmentPoints.isEmpty()) {
                path.addAll(segmentPoints.subList(1, segmentPoints.size()));
            } else {
                path.addAll(segmentPoints);
            }
        }

        return path;
    }

    private static class StateData {
        final Map<Integer, Map<String, Double>> stateKnowns = new HashMap<>();
        final Map<Integer, String> stateStyle = new HashMap<>();
    }

    private void parseAndPopulateState(String name, Double value, StateData data, Pattern pattern) {
        Matcher m = pattern.matcher(name);
        if (!m.matches()) {
            return;
        }
        String propName = (m.group(1) != null) ? m.group(1) : m.group(3);
        String idxStr = (m.group(2) != null) ? m.group(2) : m.group(4);
        int index = Integer.parseInt(idxStr);

        String base = propName.replace("_", "").toLowerCase();
        String canonicalProp = PROPERTY_ALIASES.get(base);
        if (canonicalProp == null) {
            return;
        }
        data.stateKnowns.computeIfAbsent(index, k -> new HashMap<>()).put(canonicalProp, value);

        if (!data.stateStyle.containsKey(index)) {
            String template;
            if (name.contains("[")) {
                template = "%s[" + index + "]";
            } else if (name.contains("_")) {
                template = "%s_" + index;
            } else {
                template = "%s" + index;
            }
            data.stateStyle.put(index, template);
        }
    }

    private StateData parseStateVariables(Map<String, Double> variables) {
        StateData data = new StateData();
        Pattern pattern = STATE_VAR_INDEX;

        for (Map.Entry<String, Double> entry : variables.entrySet()) {
            parseAndPopulateState(entry.getKey(), entry.getValue(), data, pattern);
        }
        return data;
    }

    private PropPair findMatchedPair(Map<String, Double> knowns) {
        for (PropPair pair : PREFERRED_PAIRS) {
            if (knowns.containsKey(pair.key1()) && knowns.containsKey(pair.key2())) {
                return pair;
            }
        }
        return null;
    }

    private boolean shouldSkipProp(String prop, String template, Set<String> targetVariables) {
        if (targetVariables == null) {
            return false;
        }
        String casedProp = prop;
        if ("rho".equals(prop)) {
            casedProp = "rho";
        } else if ("v".equals(prop) || "h".equals(prop) || "s".equals(prop) || "u".equals(prop) || "x".equals(prop)) {
            casedProp = prop.toLowerCase();
        } else if ("T".equals(prop) || "P".equals(prop)) {
            casedProp = prop.toUpperCase();
        }
        String varName = String.format(template, casedProp);
        return !containsIgnoreCase(targetVariables, varName);
    }


    private void populateSolvedProperties(Map<String, Double> solvedProps, String template, Map<String, Double> variables, Map<String, String> displayNames) {
        for (Map.Entry<String, Double> solved : solvedProps.entrySet()) {
            String propName = solved.getKey();
            String casedProp = propName;
            if ("rho".equals(propName)) {
                casedProp = "rho";
            } else if ("v".equals(propName) || "h".equals(propName) || "s".equals(propName) || "u".equals(propName) || "x".equals(propName)) {
                casedProp = propName.toLowerCase();
            } else if ("T".equals(propName) || "P".equals(propName)) {
                casedProp = propName.toUpperCase();
            }

            String varName = String.format(template, casedProp);
            variables.put(varName, solved.getValue());
            displayNames.put(varName.toLowerCase(), varName);
        }
    }

    private void solveSingleState(Map<String, Double> knowns, String template, Map<String, Double> variables, Map<String, String> displayNames, String fluid, Set<String> targetVariables) {
        PropPair matchedPair = findMatchedPair(knowns);
        if (matchedPair == null) {
            return;
        }

        double inputVal1 = knowns.get(matchedPair.key1());
        double inputVal2 = knowns.get(matchedPair.key2());
        double propVal1 = "v".equals(matchedPair.key1()) ? 1.0 / inputVal1 : inputVal1;
        double propVal2 = "v".equals(matchedPair.key2()) ? 1.0 / inputVal2 : inputVal2;

        Map<String, Double> solvedProps = new HashMap<>();
        Map<String, String> outputs = Map.of(
                "T", "T",
                "P", "P",
                "h", HMASS,
                "s", SMASS,
                "u", "Umass",
                "rho", DMASS
        );

        for (Map.Entry<String, String> out : outputs.entrySet()) {
            String canonical = out.getKey();
            if (knowns.containsKey(canonical) || shouldSkipProp(canonical, template, targetVariables)) {
                continue;
            }
            double res = getPropOrNaN(out.getValue(), matchedPair.valKey1(), propVal1, matchedPair.valKey2(), propVal2, fluid);
            if (Double.isFinite(res)) {
                solvedProps.put(canonical, res);
            }
        }

        resolveSpecificVolume(solvedProps, knowns, template, targetVariables, matchedPair, propVal1, propVal2, fluid);
        resolveQuality(solvedProps, knowns, template, targetVariables, matchedPair, propVal1, propVal2, fluid);

        populateSolvedProperties(solvedProps, template, variables, displayNames);
    }

    /** Resolves specific volume v = 1/ρ (reusing an already-solved density when present). */
    private void resolveSpecificVolume(Map<String, Double> solvedProps, Map<String, Double> knowns, String template,
            Set<String> targetVariables, PropPair matchedPair, double propVal1, double propVal2, String fluid) {
        if (knowns.containsKey("v") || shouldSkipProp("v", template, targetVariables)) {
            return;
        }
        double resDmass = solvedProps.containsKey("rho") ? solvedProps.get("rho") :
                getPropOrNaN(DMASS, matchedPair.valKey1(), propVal1, matchedPair.valKey2(), propVal2, fluid);
        if (Double.isFinite(resDmass) && resDmass != 0.0) {
            solvedProps.put("v", 1.0 / resDmass);
        }
    }

    /** Resolves vapor quality x = Q. */
    private void resolveQuality(Map<String, Double> solvedProps, Map<String, Double> knowns, String template,
            Set<String> targetVariables, PropPair matchedPair, double propVal1, double propVal2, String fluid) {
        if (knowns.containsKey("x") || shouldSkipProp("x", template, targetVariables)) {
            return;
        }
        double resQ = getPropOrNaN("Q", matchedPair.valKey1(), propVal1, matchedPair.valKey2(), propVal2, fluid);
        if (Double.isFinite(resQ)) {
            solvedProps.put("x", resQ);
        }
    }

    private void resolveForVariables(Map<String, Double> variables, Map<String, String> displayNames, String fluid, Set<String> targetVariables) {
        StateData data = parseStateVariables(variables);

        for (Map.Entry<Integer, Map<String, Double>> entry : data.stateKnowns.entrySet()) {
            int index = entry.getKey();
            Map<String, Double> knowns = entry.getValue();
            if (knowns.size() < 2) {
                continue;
            }

            String template = data.stateStyle.get(index);
            if (template != null) {
                solveSingleState(knowns, template, variables, displayNames, fluid, targetVariables);
            }
        }
    }

    /** Dispatch missing-property resolution: when STATE TABLE blocks are
     * declared, resolve each block's states with that block's fluid (so a
     * Water circuit's P1 and a R134a circuit's P1 never collide); otherwise use
     * the legacy global index-based detection. */
    private void resolveStates(Map<String, Double> variables, Map<String, String> displayNames,
                               String defaultFluid, Set<String> targetVariables,
                               List<StateTableDef> stateTables) {
        if (stateTables.isEmpty()) {
            resolveForVariables(variables, displayNames, defaultFluid, targetVariables);
            return;
        }
        for (StateTableDef st : stateTables) {
            String fluid = (st.fluid() != null && !st.fluid().isBlank()) ? st.fluid() : defaultFluid;
            resolveBlockStates(variables, displayNames, st.variables(), fluid, targetVariables);
        }
    }

    /** Group only this block's declared variables by state index and fill the
     * missing properties of each state with the block's fluid. */
    private void resolveBlockStates(Map<String, Double> variables, Map<String, String> displayNames,
                                    List<String> declaredVars, String fluid,
                                    Set<String> targetVariables) {
        StateData data = new StateData();
        for (String var : declaredVars) {
            Double val = variables.get(var); // case-insensitive map
            if (val != null) {
                parseBlockState(var, val, data);
            }
        }
        for (Map.Entry<Integer, Map<String, Double>> entry : data.stateKnowns.entrySet()) {
            Map<String, Double> knowns = entry.getValue();
            if (knowns.size() < 2) {
                continue;
            }
            String template = data.stateStyle.get(entry.getKey());
            if (template != null) {
                solveSingleState(knowns, template, variables, displayNames, fluid, targetVariables);
            }
        }
    }

    /** Parse a declared state-table variable as {@code <prop><tag><index>}: the
     * longest leading property symbol (P, T, h, …) is the property, any middle
     * characters are the circuit tag (e.g. the {@code w} in {@code Pw_1}), and
     * the trailing digits are the state index. The tag is preserved in the
     * write-back template so computed properties (e.g. {@code hw_1}) keep the
     * same naming. */
    private void parseBlockState(String name, Double value, StateData data) {
        String lower = name.toLowerCase();
        String prefix;
        int index;
        String tail;
        Matcher br = BLOCK_BRACKET_STATE.matcher(lower);
        if (br.matches()) {
            prefix = br.group(1);
            index = Integer.parseInt(br.group(2));
            tail = "[" + index + "]";
        } else {
            Matcher pl = BLOCK_PLAIN_STATE.matcher(lower);
            if (!pl.matches()) {
                return;
            }
            prefix = pl.group(1);
            index = Integer.parseInt(pl.group(3));
            tail = pl.group(2) + index; // group(2) is "_" or ""
        }
        String canonicalProp = null;
        String tag = "";
        for (String sym : PROPERTY_PREFIXES) {
            if (prefix.startsWith(sym)) {
                canonicalProp = PROPERTY_ALIASES.get(sym);
                tag = prefix.substring(sym.length());
                break;
            }
        }
        if (canonicalProp == null) {
            return;
        }
        data.stateKnowns.computeIfAbsent(index, k -> new HashMap<>()).put(canonicalProp, value);
        data.stateStyle.putIfAbsent(index, "%s" + tag + tail);
    }

    private static boolean containsIgnoreCase(Collection<String> list, String target) {
        if (list == null || target == null) return false;
        for (String s : list) {
            if (target.equalsIgnoreCase(s)) return true;
        }
        return false;
    }

    private Map<Integer, Map<String, Double>> groupStateKnowns(Map<String, Double> variables) {
        Map<Integer, Map<String, Double>> stateKnowns = new HashMap<>();
        Pattern pattern = STATE_VAR_INDEX;

        for (Map.Entry<String, Double> entry : variables.entrySet()) {
            Matcher m = pattern.matcher(entry.getKey());
            if (m.matches()) {
                String propName = (m.group(1) != null) ? m.group(1) : m.group(3);
                String idxStr = (m.group(2) != null) ? m.group(2) : m.group(4);
                int index = Integer.parseInt(idxStr);

                String base = propName.replace("_", "").toLowerCase();
                String canonicalProp = PROPERTY_ALIASES.get(base);
                if (canonicalProp != null) {
                    stateKnowns.computeIfAbsent(index, k -> new HashMap<>()).put(canonicalProp, entry.getValue());
                }
            }
        }
        return stateKnowns;
    }

    private List<Map<String, Double>> interpolateIsobaric(double p, double sA, double sB, String fluid, int steps) {
        List<Map<String, Double>> points = new ArrayList<>();
        for (int i = 0; i <= steps; i++) {
            double u = (double) i / steps;
            double s = sA + u * (sB - sA);
            points.add(flash("P", p, "S", s, fluid, s, p));
        }
        return points;
    }

    private List<Map<String, Double>> interpolateIsentropic(double s, double pA, double pB, String fluid, int steps) {
        List<Map<String, Double>> points = new ArrayList<>();
        double logPa = Math.log(pA);
        double logPb = Math.log(pB);
        for (int i = 0; i <= steps; i++) {
            double u = (double) i / steps;
            double p = Math.exp(logPa + u * (logPb - logPa));
            points.add(flash("P", p, "S", s, fluid, s, p));
        }
        return points;
    }

    private List<Map<String, Double>> interpolateIsothermal(double t, double sA, double sB, String fluid, int steps) {
        List<Map<String, Double>> points = new ArrayList<>();
        for (int i = 0; i <= steps; i++) {
            double u = (double) i / steps;
            double s = sA + u * (sB - sA);
            points.add(flash("T", t, "S", s, fluid, s, null));
        }
        return points;
    }

    private List<Map<String, Double>> interpolateIsenthalpic(double h, double pA, double pB, String fluid, int steps) {
        List<Map<String, Double>> points = new ArrayList<>();
        double logPa = Math.log(pA);
        double logPb = Math.log(pB);
        for (int i = 0; i <= steps; i++) {
            double u = (double) i / steps;
            double p = Math.exp(logPa + u * (logPb - logPa));
            points.add(flash("P", p, HMASS, h, fluid, null, p));
        }
        return points;
    }

    private List<Map<String, Double>> interpolateIsochoric(double v, double tA, double tB, String fluid, int steps) {
        List<Map<String, Double>> points = new ArrayList<>();
        for (int i = 0; i <= steps; i++) {
            double u = (double) i / steps;
            double t = tA + u * (tB - tA);
            points.add(flash("T", t, DMASS, 1.0 / v, fluid, null, null));
        }
        return points;
    }

    private List<Map<String, Double>> interpolateDefault(Map<String, Double> stateA, Map<String, Double> stateB, int steps) {
        List<Map<String, Double>> points = new ArrayList<>();
        String[] keys = {"T", "P", "v", "h", "s"};
        for (int i = 0; i <= steps; i++) {
            double u = (double) i / steps;
            Map<String, Double> pt = new HashMap<>();
            for (String key : keys) {
                Double a = stateA.get(key);
                Double b = stateB.get(key);
                if (a != null && b != null) {
                    pt.put(key, a + u * (b - a));
                }
            }
            points.add(pt);
        }
        return points;
    }

    private List<Map<String, Double>> interpolateProcess(Map<String, Double> stateA, Map<String, Double> stateB, String fluid) {
        Double pA = stateA.get("P");
        Double pB = stateB.get("P");
        Double tA = stateA.get("T");
        Double tB = stateB.get("T");
        Double sA = stateA.get("s");
        Double sB = stateB.get("s");
        Double hA = stateA.get("h");
        Double hB = stateB.get("h");
        Double vA = stateA.get("v");
        Double vB = stateB.get("v");

        int steps = 30;

        if (sA != null && sB != null && isClose(pA, pB)) {
            return interpolateIsobaric(pA, sA, sB, fluid, steps);
        }
        if (pA != null && pB != null && isClose(sA, sB)) {
            return interpolateIsentropic(sA, pA, pB, fluid, steps);
        }
        if (sA != null && sB != null && isClose(tA, tB)) {
            return interpolateIsothermal(tA, sA, sB, fluid, steps);
        }
        if (pA != null && pB != null && isClose(hA, hB)) {
            return interpolateIsenthalpic(hA, pA, pB, fluid, steps);
        }
        if (tA != null && tB != null && isClose(vA, vB)) {
            return interpolateIsochoric(vA, tA, tB, fluid, steps);
        }
        return interpolateDefault(stateA, stateB, steps);
    }

    private double getFlashVal(String prop, String name1, double val1, String name2, double val2, String fluid) {
        if (prop.equals(name1)) {
            return val1;
        }
        if (prop.equals(name2)) {
            return val2;
        }
        return CoolProp.propsSIOrNaN(prop, name1, val1, name2, val2, fluid);
    }

    private Map<String, Double> flash(String name1, double val1, String name2, double val2, String fluid, Double fallbackS, Double fallbackP) {
        Map<String, Double> pt = new HashMap<>();

        // Output properties we want: T, P, v, h, s
        double tVal = getFlashVal("T", name1, val1, name2, val2, fluid);
        double pVal = getFlashVal("P", name1, val1, name2, val2, fluid);
        double hVal = getFlashVal(HMASS, name1, val1, name2, val2, fluid);
        double sVal = getFlashVal("S", name1, val1, name2, val2, fluid);
        double dVal = getFlashVal(DMASS, name1, val1, name2, val2, fluid);

        if (Double.isFinite(tVal)) pt.put("T", tVal);
        if (Double.isFinite(pVal)) pt.put("P", pVal);
        else if (fallbackP != null) pt.put("P", fallbackP);

        if (Double.isFinite(hVal)) pt.put("h", hVal);
        if (Double.isFinite(sVal)) pt.put("s", sVal);
        else if (fallbackS != null) pt.put("s", fallbackS);

        if (Double.isFinite(dVal) && dVal != 0.0) pt.put("v", 1.0 / dVal);

        return pt;
    }

    private static boolean isClose(Double a, Double b) {
        if (a == null || b == null) {
            return false;
        }
        double max = Math.max(Math.abs(a), Math.abs(b));
        if (max == 0.0) {
            return true;
        }
        return Math.abs(a - b) / max < 0.01;
    }
}
