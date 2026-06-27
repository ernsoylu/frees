package com.frees.backend.core;

import com.frees.backend.parser.ComponentLibrary;
import com.frees.backend.parser.EquationParser;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase L — the single-phase {@code liquid} domain (THH-equivalent) and the
 * per-domain library split. Coolant-loop solves gate on CoolProp; the
 * connector-type-incompatibility checks are structural (parse/expand time) and
 * run CoolProp-free.
 */
class LiquidDomainTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();
    private final EquationParser parser = new EquationParser();

    @Test
    void splitLibraryLoadsAllDomainsIncludingLiquid() {
        var names = ComponentLibrary.builtins().stream().map(c -> c.name()).toList();
        // 90 base + 7 liquid (L) + 4 twophase foundation (T0) + 4 cycle (T1) + 4 charge (T2)
        assertEquals(109, names.size(), "built-in component count after the per-domain split");
        // built-in names are stored lowercased (the language is case-insensitive)
        assertTrue(names.containsAll(java.util.List.of(
                "liquidsource", "liquidsink", "liquidpump", "liquidpipe",
                "liquidcoldplate", "liquidvolume", "liquidorifice")), names.toString());
        // a sampling of pre-existing components across domains still present
        assertTrue(names.containsAll(java.util.List.of(
                "pump", "heatexchanger", "gaspipe", "hydraulicpump", "coolingcoil",
                "fuelcellstack", "twophasepipe")), names.toString());
    }

    @Test
    void batteryColdPlateCoolantLoopSolves() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        // A coolant stream picks up 2 kW of battery heat at 0.1 kg/s of water.
        String src = """
                LiquidSource S(fluid$=Water, mdot=0.1, P=200000, T=300)
                LiquidColdPlate CP(Q=2000)
                LiquidSink K()
                connect(S.out, CP.in)
                connect(CP.out, K.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(0.1, v.get("cp.in.mdot"), 1e-9);
        assertEquals(0.1, v.get("k.in.mdot"), 1e-9);
        assertEquals(200000.0, v.get("cp.out.p"), 1e-3, "cold plate is isobaric");
        // out.h = in.h + Q/mdot
        assertEquals(2000.0 / 0.1, v.get("cp.out.h") - v.get("cp.in.h"), 1e-3);
    }

    @Test
    void liquidPumpRaisesPressureWithSmallLiquidWork() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                LiquidSource S(fluid$=Water, mdot=0.1, P=200000, T=300)
                LiquidPump P(eta=0.7, fluid$=Water)
                LiquidSink K()
                connect(S.out, P.in)
                connect(P.out, K.in)
                P.out.P = 400000
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(400000.0, v.get("p.out.p"), 1e-3);
        // incompressible pump work v*ΔP/η is tiny for water (~0.001 * 2e5 / 0.7 ≈ 286 J/kg)
        double dh = v.get("p.out.h") - v.get("p.in.h");
        assertTrue(dh > 100 && dh < 500, "liquid pump enthalpy rise: " + dh);
    }

    @Test
    void liquidLineCannotConnectToThermofluidLine() {
        // liquid (coolant) vs the generic fluid domain — distinct connector types.
        String src = """
                LiquidPipe LP(fluid$=Water, L=1, D=0.01, rough=0.0)
                Pipe FP(fluid$=Water, L=1, D=0.01, rough=0.0)
                connect(LP.out, FP.in)
                """;
        EquationParser.ParseException ex = assertThrows(EquationParser.ParseException.class,
                () -> parser.parseResult(src));
        assertTrue(ex.getMessage().contains("incompatible") || ex.getMessage().contains("cannot connect"),
                ex.getMessage());
    }

    @Test
    void liquidLineCannotConnectToHydraulicLine() {
        String src = """
                LiquidPipe LP(fluid$=Water, L=1, D=0.01, rough=0.0)
                HydraulicOrifice HO(CdA=1e-5, rho=850)
                connect(LP.out, HO.in)
                """;
        EquationParser.ParseException ex = assertThrows(EquationParser.ParseException.class,
                () -> parser.parseResult(src));
        assertTrue(ex.getMessage().contains("cannot connect"), ex.getMessage());
    }
}
