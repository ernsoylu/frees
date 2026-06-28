package com.frees.backend.props;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Transient property guarding ({@link PropertyFunctions#enterLenient()}): a stiff
 * DAE corrector probes states that briefly leave a fluid's valid table; strict
 * mode throws (→ IDASolve recoverable-error storm → -9), lenient mode clamps the
 * arguments and falls back to a finite value so the integrator can step back in.
 */
class PropertyGuardTest {

  @Test void strictThrowsButLenientReturnsFiniteForOutOfRangeArgs() {
    assumeTrue(CoolProp.isAvailable());
    // negative pressure (a corrector overshoot): well outside any fluid table
    String call = "$enthalpy$r1234yf$p$x";
    List<Double> badArgs = List.of(-5.0e5, 0.5);

    assertThrows(RuntimeException.class,
        () -> PropertyFunctions.evaluate(call, badArgs),
        "strict mode surfaces the out-of-range arg as an exception");

    boolean prev = PropertyFunctions.enterLenient();
    try {
      double h = PropertyFunctions.evaluate(call, badArgs);
      assertTrue(Double.isFinite(h), "lenient mode yields a finite value: " + h);
    } finally {
      PropertyFunctions.exitLenient(prev);
    }
  }

  @Test void lenientIsTransparentForInRangeArgs() {
    assumeTrue(CoolProp.isAvailable());
    String call = "$enthalpy$r1234yf$p$x";
    List<Double> good = List.of(350000.0, 1.0); // saturated vapor at 3.5 bar
    double strict = PropertyFunctions.evaluate(call, good);
    boolean prev = PropertyFunctions.enterLenient();
    try {
      double lenient = PropertyFunctions.evaluate(call, good);
      assertTrue(Math.abs(strict - lenient) < 1e-6, "guard does not alter in-range results");
    } finally {
      PropertyFunctions.exitLenient(prev);
    }
  }
}
