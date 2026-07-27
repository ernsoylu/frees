package com.frees.backend.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * A component port member reports the unit its physical domain fixes.
 *
 * <p>{@code BCP.in.P} is one of the solver's own unknowns: no equation in the
 * document derives its unit, so unit inference alone leaves it blank and every
 * consumer — the Variable Explorer, the schematic's readouts — shows a bare
 * number where an SI pressure was meant. The expander knows the unit from the
 * stream's domain and already grounds the unit checker with it; the check
 * payload has to carry it too.
 */
@SpringBootTest
@AutoConfigureMockMvc
class CheckMemberUnitsTest {

    @Autowired
    private MockMvc mockMvc;

    private static final String NETWORK = """
            {"text": "LiquidSource PUMPIN(fluid$=EG50, mdot=0.4, P=200000 [Pa], T=305 [K])\\n\
            LiquidWallHX BCP(fluid$=EG50, UA=350)\\n\
            LiquidSink K()\\n\
            connect(PUMPIN.out, BCP.in)\\n\
            connect(BCP.out, K.in)"}""";

    @Test
    void portMembersCarryTheirDomainUnits() throws Exception {
        mockMvc.perform(post("/api/check").contentType(MediaType.APPLICATION_JSON).content(NETWORK))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inferredUnits['bcp.in.p']").value("Pa"))
                .andExpect(jsonPath("$.inferredUnits['bcp.in.mdot']").value("kg/s"))
                .andExpect(jsonPath("$.inferredUnits['bcp.in.h']").value("J/kg"))
                .andExpect(jsonPath("$.inferredUnits['bcp.out.p']").value("Pa"));
    }

    @Test
    void derivedUnitsStillWinOverTheDomainDefault() throws Exception {
        // The component's own outputs are derived by the unit checker; filling
        // gaps must not overwrite what the document actually establishes.
        mockMvc.perform(post("/api/check").contentType(MediaType.APPLICATION_JSON).content(NETWORK))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inferredUnits['bcp.t_in']").value("K"));
    }

    @Test
    void aPlainDocumentIsUnaffected() throws Exception {
        mockMvc.perform(post("/api/check").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x = 2\\ny = x + 1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.solvable").value(true));
    }
}
