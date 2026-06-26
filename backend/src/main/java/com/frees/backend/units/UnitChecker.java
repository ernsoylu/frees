package com.frees.backend.units;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Check Units: traverses each equation's AST verifying dimensional
 * homogeneity across '=' and '+'/'-'. Inconsistencies are warnings — they
 * never block solving.
 *
 * Variables with blank units are wildcards (unknown); the explicit
 * dimensionless marker is "-".
 */
public final class UnitChecker {

    /** A dimension that may be unknown (wildcard from a variable with blank units). */
    private record Dim(Quantity quantity, boolean known) {
        static final Dim UNKNOWN = new Dim(Quantity.dimensionless(1.0), false);

        static Dim of(Quantity q) {
            return new Dim(q, true);
        }
    }

    /** Warnings plus SI units derived for computed variables (lowercase keys). */
    public record Result(List<String> warnings, Map<String, String> derivedUnits) {}

    private final Map<String, Quantity> variableDims;
    private final Map<String, Quantity> functionDims;
    private final List<String> warnings = new ArrayList<>();
    private final boolean collectWarnings;
    private String currentEquation;

    private UnitChecker(Map<String, Quantity> variableDims,
                        Map<String, Quantity> functionDims, boolean collectWarnings) {
        this.variableDims = variableDims;
        this.functionDims = functionDims;
        this.collectWarnings = collectWarnings;
    }

    private void warn(String message) {
        if (collectWarnings) {
            warnings.add(message);
        }
    }

    /**
     * Checks all equations against the declared variable units
     * (variable name -> unit expression, blank/null = unspecified) and derives
     * SI units for variables defined by equations whose other side has known
     * dimensions (P = m*g/A gets Pa once m, g, A are known).
     */
    public static Result check(List<Equation> equations,
                               Map<String, String> variableUnits) {
        return check(equations, variableUnits, Map.of(), Map.of());
    }

    public static Result check(List<Equation> equations,
                               Map<String, String> variableUnits,
                               Map<String, String> functionUnits) {
        return check(equations, variableUnits, functionUnits, Map.of());
    }

    /**
     * As {@link #check(List, Map)}, plus declared units for TABLE/FUNCTION
     * calls: output units (function name -> SI unit) carry the call's result
     * dimensions, and argument units (function name -> per-arg SI units) ground
     * the call's argument variables. Together they let variables computed from
     * lookups/functions resolve instead of collapsing to dimensionless.
     */
    public static Result check(List<Equation> equations,
                               Map<String, String> variableUnits,
                               Map<String, String> functionUnits,
                               Map<String, List<String>> functionInputUnits) {
        Map<String, Quantity> dims = new java.util.HashMap<>();
        List<String> warnings = new ArrayList<>();

        for (Map.Entry<String, String> entry : variableUnits.entrySet()) {
            String units = entry.getValue();
            if (units == null || units.isBlank()) {
                continue;
            }
            try {
                dims.put(entry.getKey().toLowerCase(), UnitRegistry.parse(units));
            } catch (UnitRegistry.UnknownUnitException e) {
                warnings.add("Variable " + entry.getKey() + ": " + e.getMessage());
            }
        }

        Map<String, Quantity> functionDims = new java.util.HashMap<>();
        functionUnits.forEach((name, units) -> {
            if (units != null && !units.isBlank()) {
                try {
                    functionDims.put(name.toLowerCase(), UnitRegistry.parse(units));
                } catch (UnitRegistry.UnknownUnitException ignored) {
                    // A bad declared unit just leaves the function unitless.
                }
            }
        });

        // Derivation passes (warnings suppressed): when an equation has
        // exactly one variable with unknown dimensions and it participates
        // multiplicatively, its dimensions are solved by rearrangement
        // (F = m*g with F and g known gives m = kg). Iterates to a fixpoint
        // so chains propagate.
        // Argument-unit declarations become synthetic "argExpr = X[unit]"
        // equations, so the existing rearrangement grounds the argument's
        // variable (e.g. fanCurve(Vair/f_rpm) with arg unit m^3/s gives Vair).
        List<Equation> derivationEquations = equations;
        if (!functionInputUnits.isEmpty()) {
            List<Equation> augmented = new ArrayList<>(equations);
            for (Equation eq : equations) {
                collectArgUnitEquations(eq.lhs(), functionInputUnits, augmented);
                collectArgUnitEquations(eq.rhs(), functionInputUnits, augmented);
            }
            derivationEquations = augmented;
        }

        Map<String, String> derived = new java.util.HashMap<>();
        UnitChecker deriver = new UnitChecker(dims, functionDims, false);
        for (int pass = 0; pass < 8; pass++) {
            boolean changed = false;
            for (Equation eq : derivationEquations) {
                List<String> unknowns = eq.variables().stream()
                        .filter(v -> !dims.containsKey(v))
                        .toList();
                if (unknowns.isEmpty()) {
                    continue;
                }
                deriver.currentEquation = eq.sourceText();
                if (unknowns.size() == 1) {
                    String unknown = unknowns.get(0);
                    Quantity solvedDims = deriver.solveDimsFor(eq, unknown);
                    if (solvedDims != null) {
                        dims.put(unknown, solvedDims);
                        derived.put(unknown, UnitRegistry.siName(solvedDims.dims()));
                        changed = true;
                        continue;
                    }
                }
                // Additive homogeneity: in T[3] - T[4], the unknown T[3]
                // must carry T[4]'s dimensions, no matter how many other
                // unknowns the equation has. This grounds variables that
                // appear only implicitly (on both sides of their equations).
                for (String unknown : unknowns) {
                    if (dims.containsKey(unknown)) {
                        continue;
                    }
                    Quantity additive = deriver.additiveDims(eq, unknown);
                    if (additive != null) {
                        dims.put(unknown, additive);
                        derived.put(unknown, UnitRegistry.siName(additive.dims()));
                        changed = true;
                    }
                }
            }
            if (!changed) {
                break;
            }
        }

        UnitChecker checker = new UnitChecker(dims, functionDims, true);
        for (Equation eq : equations) {
            checker.currentEquation = eq.sourceText();
            Dim lhs = checker.dimOf(eq.lhs());
            Dim rhs = checker.dimOf(eq.rhs());
            if (lhs.known() && rhs.known()
                    && !lhs.quantity().sameDimensionsAs(rhs.quantity())) {
                checker.warnings.add(String.format(
                        "%s: the units of the left side [%s] do not match the right side [%s].",
                        eq.sourceText(),
                        lhs.quantity().dimensionString(),
                        rhs.quantity().dimensionString()));
            }
        }

        warnings.addAll(checker.warnings);
        return new Result(warnings, derived);
    }

    /**
     * Walks an expression and, for each call to a function with declared
     * argument units, emits a synthetic {@code argExpr = X[unit]} equation that
     * the derivation passes solve to ground the argument's variable.
     */
    private static void collectArgUnitEquations(Expr e,
                                                Map<String, List<String>> functionInputUnits,
                                                List<Equation> out) {
        switch (e) {
            case Expr.Call c -> {
                List<String> argUnits = functionInputUnits.get(c.function().toLowerCase());
                List<Expr> args = c.args();
                if (argUnits != null) {
                    for (int k = 0; k < args.size() && k < argUnits.size(); k++) {
                        String unit = argUnits.get(k);
                        if (unit != null) {
                            out.add(new Equation(args.get(k),
                                    new Expr.Num(0.0, unit, false), "<arg unit>"));
                        }
                    }
                }
                for (Expr arg : args) {
                    collectArgUnitEquations(arg, functionInputUnits, out);
                }
            }
            case Expr.BinOp b -> {
                collectArgUnitEquations(b.left(), functionInputUnits, out);
                collectArgUnitEquations(b.right(), functionInputUnits, out);
            }
            case Expr.Neg n -> collectArgUnitEquations(n.operand(), functionInputUnits, out);
            case Expr.ArrayLiteral al -> {
                for (Expr el : al.elements()) {
                    collectArgUnitEquations(el, functionInputUnits, out);
                }
            }
            default -> { /* leaves carry no calls */ }
        }
    }

    /** Known-dimension contribution plus the net exponent of the unknown. */
    record DimTerm(double[] dims, double unknownExponent) {
        @Override
        public boolean equals(Object o) {
            return o instanceof DimTerm(double[] otherDims, double otherExp)
                    && Arrays.equals(dims, otherDims)
                    && Double.compare(unknownExponent, otherExp) == 0;
        }

        @Override
        public int hashCode() {
            int result = Arrays.hashCode(dims);
            result = 31 * result + Double.hashCode(unknownExponent);
            return result;
        }

        @Override
        public String toString() {
            return "DimTerm[dims=" + Arrays.toString(dims) + ", unknownExponent=" + unknownExponent + "]";
        }
    }

    /**
     * Solves an equation dimensionally for the single unknown variable:
     * analyzes both sides as (known dims) * unknown^e and rearranges.
     * Returns null when the unknown does not appear purely multiplicatively
     * or the other dimensions cannot be determined.
     */
    private Quantity solveDimsFor(Equation eq, String unknown) {
        DimTerm lhs = analyze(eq.lhs(), unknown);
        DimTerm rhs = analyze(eq.rhs(), unknown);
        if (lhs == null || rhs == null) {
            return null;
        }
        double exponent = lhs.unknownExponent() - rhs.unknownExponent();
        if (Math.abs(exponent) < 1e-9) {
            return null;
        }
        double[] solved = new double[Quantity.DIMENSIONS];
        for (int i = 0; i < Quantity.DIMENSIONS; i++) {
            solved[i] = (rhs.dims()[i] - lhs.dims()[i]) / exponent;
        }
        return new Quantity(1.0, solved);
    }

    private boolean mentions(Expr e, String name) {
        return e.variables().contains(name);
    }

    /** Dimensions of the unknown forced by a sum/difference with a
     * known-dimension partner anywhere in the equation, or null. */
    private Quantity additiveDims(Equation eq, String unknown) {
        Quantity q = additiveDims(eq.lhs(), unknown);
        return q != null ? q : additiveDims(eq.rhs(), unknown);
    }

    private Quantity additiveDims(Expr e, String unknown) {
        return switch (e) {
            case Expr.BinOp b -> {
                if (b.op() == '+' || b.op() == '-') {
                    Quantity q = additivePartnerDims(b.left(), b.right(), unknown);
                    if (q == null) {
                        q = additivePartnerDims(b.right(), b.left(), unknown);
                    }
                    if (q != null) {
                        yield q;
                    }
                }
                Quantity left = additiveDims(b.left(), unknown);
                yield left != null ? left : additiveDims(b.right(), unknown);
            }
            case Expr.Neg neg -> additiveDims(neg.operand(), unknown);
            case Expr.Call c -> {
                for (Expr arg : c.args()) {
                    Quantity q = additiveDims(arg, unknown);
                    if (q != null) {
                        yield q;
                    }
                }
                yield null;
            }
            default -> null;
        };
    }

    private Quantity additivePartnerDims(Expr candidate, Expr partner, String unknown) {
        if (candidate instanceof Expr.Var v && v.name().equals(unknown)
                && !mentions(partner, unknown)) {
            Dim dim = dimOf(partner);
            if (dim.known()) {
                return dim.quantity();
            }
        }
        return null;
    }

    private DimTerm analyze(Expr e, String unknown) {
        return switch (e) {
            case Expr.Num n -> {
                // A bare constant is dimensionless inside a product chain.
                if (n.unit() == null) {
                    yield new DimTerm(new double[Quantity.DIMENSIONS], 0.0);
                }
                try {
                    yield new DimTerm(UnitRegistry.parse(n.unit()).dims(), 0.0);
                } catch (UnitRegistry.UnknownUnitException ex) {
                    yield null;
                }
            }
            case Expr.Var v -> {
                if (v.name().equals(unknown)) {
                    yield new DimTerm(new double[Quantity.DIMENSIONS], 1.0);
                }
                Quantity q = variableDims.get(v.name());
                yield q != null ? new DimTerm(q.dims(), 0.0) : null;
            }
            case Expr.Neg neg -> analyze(neg.operand(), unknown);
            case Expr.BinOp b -> switch (b.op()) {
                case '*' -> combine(analyze(b.left(), unknown), analyze(b.right(), unknown), 1);
                case '/' -> combine(analyze(b.left(), unknown), analyze(b.right(), unknown), -1);
                case '^' -> {
                    if (!(b.right() instanceof Expr.Num n) || mentions(b.right(), unknown)) {
                        // Non-constant exponent: well-defined only when the
                        // unknown-free base is dimensionless, as in
                        // T * (P2/P1)^((k-1)/k), which keeps T's units.
                        if (!mentions(b.left(), unknown) && !mentions(b.right(), unknown)) {
                            Dim base = dimOf(b.left());
                            if (base.known() && base.quantity().isDimensionless()) {
                                yield new DimTerm(new double[Quantity.DIMENSIONS], 0.0);
                            }
                        }
                        yield null;
                    }
                    DimTerm base = analyze(b.left(), unknown);
                    if (base == null) {
                        yield null;
                    }
                    double[] scaled = new double[Quantity.DIMENSIONS];
                    for (int i = 0; i < Quantity.DIMENSIONS; i++) {
                        scaled[i] = base.dims()[i] * n.value();
                    }
                    yield new DimTerm(scaled, base.unknownExponent() * n.value());
                }
                // The unknown inside a sum or difference cannot be isolated
                // multiplicatively; an unknown-free sum falls back to dimOf.
                default -> {
                    if (mentions(e, unknown)) {
                        yield null;
                    }
                    Dim dim = dimOf(e);
                    yield dim.known() ? new DimTerm(dim.quantity().dims(), 0.0) : null;
                }
            };
            // Function arguments containing the unknown are not invertible here;
            // unknown-free calls fall back to dimOf.
            default -> {
                if (mentions(e, unknown)) {
                    yield null;
                }
                Dim dim = dimOf(e);
                yield dim.known() ? new DimTerm(dim.quantity().dims(), 0.0) : null;
            }
        };
    }

    private static DimTerm combine(DimTerm a, DimTerm b, int sign) {
        if (a == null || b == null) {
            return null;
        }
        double[] dims = new double[Quantity.DIMENSIONS];
        for (int i = 0; i < Quantity.DIMENSIONS; i++) {
            dims[i] = a.dims()[i] + sign * b.dims()[i];
        }
        return new DimTerm(dims, a.unknownExponent() + sign * b.unknownExponent());
    }

    private Dim dimOf(Expr e) {
        return switch (e) {
            case Expr.Num n -> dimOfNum(n);
            case Expr.Str s -> Dim.UNKNOWN;
            case Expr.Var v -> {
                Quantity q = variableDims.get(v.name());
                yield q != null ? Dim.of(q) : Dim.UNKNOWN;
            }
            case Expr.Neg neg -> dimOf(neg.operand());
            case Expr.BinOp b -> dimOfBinOp(b);
            case Expr.Call c -> dimOfCall(c);
            case Expr.ArrayAccess aa -> Dim.UNKNOWN;
            case Expr.Range r -> Dim.UNKNOWN;
            case Expr.ArrayLiteral al -> Dim.UNKNOWN;
            // Comparisons and logical operators evaluate to dimensionless 1.0/0.0
            case Expr.Compare cmp -> Dim.of(Quantity.dimensionless(1.0));
            case Expr.Logical log -> Dim.of(Quantity.dimensionless(1.0));
            case Expr.Not not -> Dim.of(Quantity.dimensionless(1.0));
        };
    }

    private Dim dimOfNum(Expr.Num n) {
        if (n.unit() == null) {
            // A bare numeric constant adapts to its context.
            return Dim.UNKNOWN;
        }
        try {
            return Dim.of(UnitRegistry.parse(n.unit()));
        } catch (UnitRegistry.UnknownUnitException e) {
            warn(currentEquation + ": " + e.getMessage());
            return Dim.UNKNOWN;
        }
    }

    private Dim dimOfBinOp(Expr.BinOp b) {
        Dim left = dimOf(b.left());
        Dim right = dimOf(b.right());
        return switch (b.op()) {
            case '+', '-' -> {
                if (left.known() && right.known()
                        && !left.quantity().sameDimensionsAs(right.quantity())) {
                    warn(String.format(
                            "%s: cannot add/subtract [%s] and [%s].",
                            currentEquation,
                            left.quantity().dimensionString(),
                            right.quantity().dimensionString()));
                    yield left;
                }
                yield left.known() ? left : right;
            }
            // In a product/quotient a bare numeric literal is a dimensionless
            // scale factor, so 0.5*rho keeps rho's dimensions rather than
            // collapsing to a wildcard.
            case '*' -> {
                Dim l = asFactor(b.left(), left);
                Dim r = asFactor(b.right(), right);
                yield l.known() && r.known()
                        ? Dim.of(l.quantity().multiply(r.quantity()))
                        : Dim.UNKNOWN;
            }
            case '/' -> {
                Dim l = asFactor(b.left(), left);
                Dim r = asFactor(b.right(), right);
                yield l.known() && r.known()
                        ? Dim.of(l.quantity().divide(r.quantity()))
                        : Dim.UNKNOWN;
            }
            case '^' -> dimOfPower(b, left);
            default -> Dim.UNKNOWN;
        };
    }

    /**
     * Treats an unresolved bare numeric literal as dimensionless when it
     * appears as a multiplicative factor. Other wildcards (unit-less
     * variables) stay unknown so genuine ambiguity is not masked.
     */
    private static Dim asFactor(Expr operand, Dim resolved) {
        if (!resolved.known() && operand instanceof Expr.Num n && n.unit() == null) {
            return Dim.of(Quantity.dimensionless(1.0));
        }
        return resolved;
    }

    private Dim dimOfPower(Expr.BinOp b, Dim base) {
        if (!base.known()) {
            return Dim.UNKNOWN;
        }
        if (base.quantity().isDimensionless()) {
            return Dim.of(Quantity.dimensionless(1.0));
        }
        if (b.right() instanceof Expr.Num n) {
            return Dim.of(base.quantity().pow(n.value()));
        }
        warn(String.format(
                "%s: a dimensional quantity [%s] is raised to a non-constant exponent.",
                currentEquation, base.quantity().dimensionString()));
        return Dim.UNKNOWN;
    }

    /** SI unit expression of each property function output. */
    public static String propertyUnit(String output) {
        return switch (output) {
            case "temperature", "wetbulb", "dewpoint", "t_crit" -> "K";
            case "pressure", "p_crit" -> "Pa";
            case "enthalpy", "intenergy", "gibbs" -> "J/kg";
            case "entropy", "cp", "cv", "specheat" -> "J/kg-K";
            case "density" -> "kg/m^3";
            case "volume" -> "m^3/kg";
            case "viscosity" -> "Pa-s";
            case "conductivity" -> "W/m-K";
            case "soundspeed" -> "m/s";
            case "molarmass" -> "kg/mol";
            case "heatingvalue" -> "J/kg";
            case "quality", "relhum", "humrat", "stoichafr", "compressibility", "compressibilityfactor" -> "-";
            default -> null;
        };
    }

    /** Safe SI-unit dimension for a cubic-EOS output, agnostic if unparseable. */
    private static Dim eosDim(String unit) {
        try {
            return Dim.of(UnitRegistry.parse(unit));
        } catch (UnitRegistry.UnknownUnitException e) {
            return Dim.UNKNOWN;
        }
    }

    /** Property calls carry the dimensions of the requested output. */
    private static Dim propertyDim(String encoded) {
        String[] parts = encoded.split("\\$");
        String unit = parts.length > 1 ? propertyUnit(parts[1]) : null;
        if (unit == null) {
            return Dim.UNKNOWN;
        }
        if ("-".equals(unit)) {
            return Dim.of(Quantity.dimensionless(1.0));
        }
        try {
            return Dim.of(UnitRegistry.parse(unit));
        } catch (UnitRegistry.UnknownUnitException e) {
            return Dim.UNKNOWN;
        }
    }

    private Dim dimOfCall(Expr.Call c) {
        // User TABLE/FUNCTION with a declared output unit carries those dims.
        Quantity declared = functionDims.get(c.function().toLowerCase());
        if (declared != null) {
            return Dim.of(declared);
        }
        if (c.function().startsWith("prop$")) {
            return propertyDim(c.function());
        }
        // Eigendecomposition: matrix entries may carry any units. Eigenvalues
        // inherit the entry dimensions; eigenvector components are dimensionless.
        if (c.function().startsWith("eigen$")) {
            if (c.function().startsWith("eigen$vec")) {
                return Dim.of(Quantity.dimensionless(1.0));
            }
            for (Expr arg : c.args()) {
                Dim d = dimOf(arg);
                if (d.known()) {
                    return d;
                }
            }
            return Dim.UNKNOWN;
        }
        // Dense linear-algebra, signal-processing and regression intrinsics:
        // their results' dimensions are not tracked, so stay agnostic rather
        // than asserting (and warning about) dimensionless arguments.
        if (c.function().startsWith("qr$") ||
            c.function().startsWith("chol$") ||
            c.function().startsWith("expm$") ||
            c.function().startsWith("svd$") ||
            c.function().startsWith("fft$") ||
            c.function().startsWith("ifft$") ||
            c.function().startsWith("conv$") ||
            c.function().startsWith("linfit$") ||
            c.function().startsWith("polyfit$") ||
            c.function().startsWith("interp2$")) {
            return Dim.UNKNOWN;
        }
        if (c.function().startsWith("ss2tf$") ||
            c.function().startsWith("tf2ss$") ||
            c.function().startsWith("ctrb$") ||
            c.function().startsWith("obsv$") ||
            c.function().startsWith("rank$") ||
            c.function().startsWith("ss2ss$") ||
            c.function().startsWith("ss_series$") ||
            c.function().startsWith("ss_parallel$") ||
            c.function().startsWith("ss_feedback$") ||
            c.function().startsWith("stepinfo$") ||
            c.function().startsWith("pade$") ||
            c.function().startsWith("rlocus$") ||
            c.function().startsWith("zp2tf$") ||
            c.function().startsWith("tf2zp$") ||
            c.function().startsWith("series$") ||
            c.function().startsWith("parallel$") ||
            c.function().startsWith("feedback$") ||
            c.function().startsWith("pole$") ||
            c.function().startsWith("zero$") ||
            c.function().startsWith("bode$") ||
            c.function().startsWith("nyquist$") ||
            c.function().startsWith("margin$") ||
            c.function().startsWith("step$") ||
            c.function().startsWith("impulse$") ||
            c.function().startsWith("lsim$") ||
            c.function().startsWith("lqr$") ||
            c.function().startsWith("place$") ||
            c.function().startsWith("pidtune$") ||
            c.function().startsWith("routh$") ||
            c.function().startsWith("c2d$") ||
            c.function().startsWith("d2c$") ||
            c.function().startsWith("residue$") ||
            c.function().startsWith("nichols$") ||
            c.function().startsWith("errorconst$") ||
            c.function().startsWith("mason$")) {
            return Dim.of(Quantity.dimensionless(1.0));
        }
        List<Expr> args = c.args();
        return switch (c.function()) {
            case "abs", "real", "imag" -> dimOf(args.get(0));
            // ArrayElmt returns one element, so it carries the array's units.
            case "arrayelmt" -> dimOf(args.get(0));
            // Radiation view factors take length arguments and return a
            // dimensionless ratio; do not warn on the length-valued arguments.
            case "viewfactor_perp", "viewfactor_plates", "viewfactor_disks" ->
                    Dim.of(Quantity.dimensionless(1.0));
            // Heisler transient-conduction results are dimensionless ratios; the
            // geometry string and Bi/Fo/x* arguments carry no units to check.
            case "heisler_temp", "heisler_q" -> Dim.of(Quantity.dimensionless(1.0));
            // Ideal-gas compressible-flow relations: every output is a
            // dimensionless property ratio or an angle in radians (also
            // dimensionless in SI); the Mach/k/angle arguments carry no units.
            case "t0_t", "isen_t0_t", "p0_p", "isen_p0_p", "rho0_rho", "isen_rho0_rho",
                 "a_astar", "isen_a_astar", "mach_a_astar",
                 "m2_shock", "mach_shock", "p2_p1_shock", "t2_t1_shock",
                 "rho2_rho1_shock", "p02_p01_shock",
                 "rayleigh_t0_t0star", "rayleigh_t_tstar", "rayleigh_p_pstar", "rayleigh_p0_p0star",
                 "fanno_t_tstar", "fanno_p_pstar", "fanno_p0_p0star", "fanno_fld",
                 "prandtlmeyer", "prandtl_meyer", "mach_prandtlmeyer", "machangle",
                 "theta_oblique", "beta_oblique" -> Dim.of(Quantity.dimensionless(1.0));
            // Heat-exchanger effectiveness, NTU and fin efficiency are
            // dimensionless; the leading arrangement string carries no units.
            case "hx_effectiveness", "hx_epsilon", "hx_ntu", "fin_efficiency" ->
                    Dim.of(Quantity.dimensionless(1.0));
            // Flow resistance: friction factor and Reynolds number are
            // dimensionless; a minor (fitting) loss is a pressure [Pa].
            case "friction_factor", "darcy_friction", "reynolds", "re_number" ->
                    Dim.of(Quantity.dimensionless(1.0));
            case "minor_loss" -> eosDim("Pa");
            // Pneumatics: ISO 6358 returns a mass flow rate [kg/s]; the sonic
            // conductance / pressure-ratio arguments are not policed.
            case "iso6358" -> eosDim("kg/s");
            // Two-phase flow: the Martinelli parameter and its multiplier are
            // both dimensionless (quality / property-ratio arguments unpoliced).
            case "lm_phi2", "lm_martinelli_tt" -> Dim.of(Quantity.dimensionless(1.0));
            // LMTD returns a temperature difference, inheriting the units of its
            // terminal-difference arguments (which the checker does not police).
            case "lmtd" -> dimOf(args.get(0));
            // Cubic-EOS backend: outputs carry their SI property units; the
            // leading fluid$/model$/phase$ strings carry none.
            case "eos_z" -> Dim.of(Quantity.dimensionless(1.0));
            case "eos_pressure", "eos_psat" -> eosDim("Pa");
            case "eos_volume" -> eosDim("m^3/kg");
            case "eos_density" -> eosDim("kg/m^3");
            case "eos_enthalpy" -> eosDim("J/kg");
            case "eos_entropy" -> eosDim("J/kg-K");
            // Combustion thermochemistry & ideal-gas mixtures (string-keyed
            // species/composition args carry no units to check).
            case "adiabaticflametemp", "adiabaticflametemperature", "flametemp" -> eosDim("K");
            case "mix_mw", "mix_molarmass" -> eosDim("kg/mol");
            case "mix_cp" -> eosDim("J/kg-K");
            case "mix_enthalpy" -> eosDim("J/kg");
            case "mix_entropy" -> eosDim("J/kg-K");
            case "mix_viscosity" -> eosDim("Pa-s");
            case "mix_conductivity" -> eosDim("W/m-K");
            // Equilibrium mole fraction is dimensionless; the equilibrium flame
            // temperature carries kelvin.
            case "eq_molefraction" -> Dim.of(Quantity.dimensionless(1.0));
            case "adiabaticflametempeq", "flametemp_eq" -> eosDim("K");
            // Wiebe burned-fraction and its rate are dimensionless.
            case "wiebe", "wiebe_rate" -> Dim.of(Quantity.dimensionless(1.0));
            // TABLE lookup/interpolation: the table name is a string and the
            // arguments/result carry the table's own units, which the checker
            // does not track — stay agnostic rather than warn.
            case "interpolate", "interpolate1", "interpolate2d",
                 "lookup", "lookuprow", "nlookuprows",
                 "differentiate", "differentiate1" -> Dim.UNKNOWN;
            // Parametric-table accessors carry the referenced column's units,
            // which the checker does not track — stay agnostic.
            case "tablerun#", "tablerun", "nparametricruns", "tablevalue",
                 "tablesum", "tableavg", "tablemin", "tablemax",
                 "tablestddev", "integralvalue" -> Dim.UNKNOWN;
            case "stagnationtemp" -> {
                Dim tDim = dimOf(args.get(0));
                try {
                    if (tDim.known() && !tDim.quantity().sameDimensionsAs(UnitRegistry.parse("K"))) {
                        warn(String.format("%s: stagnationtemp temperature argument must have temperature units (e.g. K, C), got [%s].",
                                currentEquation, tDim.quantity().dimensionString()));
                    }
                    yield Dim.of(UnitRegistry.parse("K"));
                } catch (UnitRegistry.UnknownUnitException e) {
                    yield Dim.UNKNOWN;
                }
            }
            case "stagnationpres" -> {
                Dim pDim = dimOf(args.get(0));
                try {
                    if (pDim.known() && !pDim.quantity().sameDimensionsAs(UnitRegistry.parse("Pa"))) {
                        warn(String.format("%s: stagnationpres pressure argument must have pressure units (e.g. Pa, kPa), got [%s].",
                                currentEquation, pDim.quantity().dimensionString()));
                    }
                    yield Dim.of(UnitRegistry.parse("Pa"));
                } catch (UnitRegistry.UnknownUnitException e) {
                    yield Dim.UNKNOWN;
                }
            }
            case "min", "max" -> {
                Dim first = dimOf(args.get(0));
                Dim second = args.size() > 1 ? dimOf(args.get(1)) : first;
                if (first.known() && second.known()
                        && !first.quantity().sameDimensionsAs(second.quantity())) {
                    warn(String.format(
                            "%s: %s arguments have different units [%s] vs [%s].",
                            currentEquation, c.function(),
                            first.quantity().dimensionString(),
                            second.quantity().dimensionString()));
                }
                yield first.known() ? first : second;
            }
            case "sqrt" -> {
                Dim arg = dimOf(args.get(0));
                yield arg.known() ? Dim.of(arg.quantity().pow(0.5)) : Dim.UNKNOWN;
            }
            // Integral(f, t, a, b) has the dimensions of f*t; the checker
            // does not track them, so stay agnostic instead of warning.
            case "integral", "gaussintegral" -> Dim.UNKNOWN;
            // Descriptive statistics carry the data's units (the data are the
            // arguments; for percentile the first argument is the percentile p).
            case "mean", "median", "stdev", "stddev", "std",
                 "variance", "var", "rms" -> dimOf(args.get(0));
            case "percentile" -> dimOf(args.get(args.size() - 1));
            // Distribution CDF/PDF/quantile: result is a dimensionless
            // probability/quantile; do not constrain the (possibly dimensioned) inputs.
            case "normalcdf", "normalpdf", "normalinvcdf" -> Dim.UNKNOWN;
            default -> {
                // sin, cos, tan, exp, ln, log10, arc*: argument must be dimensionless.
                Dim arg = dimOf(args.get(0));
                if (arg.known() && !arg.quantity().isDimensionless()) {
                    warn(String.format(
                            "%s: the argument of %s must be dimensionless but has units [%s].",
                            currentEquation, c.function(),
                            arg.quantity().dimensionString()));
                }
                yield Dim.of(Quantity.dimensionless(1.0));
            }
        };
    }
}
