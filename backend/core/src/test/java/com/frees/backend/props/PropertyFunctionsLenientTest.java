package com.frees.backend.props;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** The lenient-evaluation thread flag used around the transient IDA residual path. */
class PropertyFunctionsLenientTest {

    @AfterEach
    void reset() {
        // Make sure the thread is left in the default state for other tests.
        PropertyFunctions.exitLenient(false);
    }

    @Test
    void enterAndExitToggleAndRestorePriorState() {
        boolean outer = PropertyFunctions.enterLenient();   // false -> true, returns prior false
        assertFalse(outer);

        boolean inner = PropertyFunctions.enterLenient();   // already true, returns prior true
        assertTrue(inner);

        PropertyFunctions.exitLenient(inner);               // prev=true  -> set(TRUE) branch
        PropertyFunctions.exitLenient(outer);               // prev=false -> remove() branch
    }
}
