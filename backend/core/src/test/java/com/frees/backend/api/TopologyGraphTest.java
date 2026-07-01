package com.frees.backend.api;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TopologyGraphTest {

    @Test
    void emitsMermaidFlowchartForAConnectedNetwork() {
        String src = """
                BatteryThermal B(Voc=48, R0=0.1)
                DCMotor        MOT(Kt=0.5, Ke=0.5, R=1)
                Ground         G()
                MechGround     MG()
                ThermalSource  COOL(T=300)
                connect(B.p, MOT.p)
                connect(B.n, MOT.n, G.port)
                connect(MOT.shaft, MG.port)
                connect(B.heat, COOL.port)
                """;
        String m = TopologyGraph.mermaid(src);
        assertNotNull(m);
        assertTrue(m.startsWith("flowchart"), m);
        assertTrue(m.toLowerCase().contains("batterythermal"), m);
        assertTrue(m.toLowerCase().contains("dcmotor"), m);
        assertTrue(m.contains("---"), "has at least one edge: " + m);   // B—MOT etc.
    }

    @Test
    void returnsNullWhenNoComponents() {
        assertNull(TopologyGraph.mermaid("x = 1\ny = x + 2"));
    }
}
