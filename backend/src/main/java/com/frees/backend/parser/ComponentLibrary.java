package com.frees.backend.parser;

import com.frees.backend.ast.ComponentDef;
import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;

import java.util.List;

/**
 * The built-in standard component library — common thermo-fluid components
 * written in the frEES {@code COMPONENT} language and parsed once into
 * {@link ComponentDef}s that are available to every document (a user definition
 * of the same name overrides the built-in, see {@link ComponentExpander}).
 *
 * <p>Keeping the library in frEES source (rather than hand-built ASTs) keeps the
 * physics transparent and editable, and exercises the same parse path as
 * user-authored components. Property inputs use {@code (P, h)} so any state is
 * recoverable from a stream's canonical members; turbine/compressor isentropic
 * targets use {@code (P, s)}.
 *
 * <p><b>No defaults — every parameter is required.</b> A silent default for a
 * physical input (a pipe length, a fluid, an efficiency) is a footgun: a model
 * of an R134a system that forgets {@code fluid$} should error, not quietly run
 * as water. So all library parameters must be supplied at instantiation; an
 * omission is a clear parse error. (The optional-default <em>language feature</em>
 * remains available for user-authored components that genuinely want it.)
 */
public final class ComponentLibrary {

    private ComponentLibrary() {}

    /** Standard fluid-domain components (Phase 1). */
    static final String SOURCE = """
            COMPONENT Pump(in, out)
              PARAM eta, fluid$
              v        = Volume(fluid$, P=in.P, h=in.h)
              out.mdot = in.mdot
              out.h    = in.h + v * (out.P - in.P) / eta
              W        = in.mdot * (out.h - in.h)
            END

            COMPONENT Turbine(in, out)
              PARAM eta, fluid$
              s_in     = Entropy(fluid$, P=in.P, h=in.h)
              h_s      = Enthalpy(fluid$, P=out.P, s=s_in)
              out.mdot = in.mdot
              out.h    = in.h - eta * (in.h - h_s)
              W        = in.mdot * (in.h - out.h)
            END

            COMPONENT Compressor(in, out)
              PARAM eta, fluid$, model$ = isentropic
              s_in     = Entropy(fluid$, P=in.P, h=in.h)
              h_s      = Enthalpy(fluid$, P=out.P, s=s_in)
              out.mdot = in.mdot
              out.h    = in.h + (h_s - in.h) / eta
              W        = in.mdot * (out.h - in.h)
              VARIANT isentropic
              END
              VARIANT volumetric REQUIRE eta_v, disp, rpm
                rho_in  = Density(fluid$, P=in.P, h=in.h)
                in.mdot = eta_v * disp * (rpm / 60) * rho_in
              END
            END

            COMPONENT Boiler(in, out)
              out.mdot = in.mdot
              out.P    = in.P
              Q        = in.mdot * (out.h - in.h)
            END

            COMPONENT Condenser(in, out)
              out.mdot = in.mdot
              out.P    = in.P
              Q        = in.mdot * (in.h - out.h)
            END

            COMPONENT Throttle(in, out)
              out.mdot = in.mdot
              out.h    = in.h
            END

            COMPONENT Pipe(in, out)
              PARAM fluid$, L, D, rough
              out.mdot = in.mdot
              out.h    = in.h
              rho      = Density(fluid$, P=in.P, h=in.h)
              mu       = Viscosity(fluid$, P=in.P, h=in.h)
              A        = pi# / 4 * D^2
              V        = in.mdot / (rho * A)
              Re_d     = reynolds(rho, V, D, mu)
              f        = friction_factor(Re_d, rough / D)
              out.P    = in.P - f * (L / D) * rho * V^2 / 2
            END

            COMPONENT Fan(in, out)
              PARAM fluid$, dP0, Q0, eta
              rho      = Density(fluid$, P=in.P, h=in.h)
              Q        = in.mdot / rho
              dP       = dP0 * (1 - (Q / Q0)^2)
              out.mdot = in.mdot
              out.P    = in.P + dP
              out.h    = in.h + dP / (rho * eta)
            END

            COMPONENT Duct(in, out)
              PARAM rho, mu, L, D, rough
              out.mdot = in.mdot
              A        = pi# / 4 * D^2
              V        = in.mdot / (rho * A)
              Re_d     = reynolds(rho, V, D, mu)
              f        = friction_factor(Re_d, rough / D)
              out.P    = in.P - f * (L / D) * rho * V^2 / 2
            END

            COMPONENT FanCurve(in, out)
              PARAM rho, dP0, Q0
              Q        = in.mdot / rho
              dP       = dP0 * (1 - (Q / Q0)^2)
              out.mdot = in.mdot
              out.P    = in.P + dP
            END

            COMPONENT Splitter(in, out1, out2)
              out1.P   = in.P
              out2.P   = in.P
              out1.h   = in.h
              out2.h   = in.h
              in.mdot  = out1.mdot + out2.mdot
            END

            COMPONENT Mixer(in1, in2, out)
              out.P    = in1.P
              out.mdot = in1.mdot + in2.mdot
              out.mdot * out.h = in1.mdot * in1.h + in2.mdot * in2.h
            END

            COMPONENT HeatExchanger(hot_in, hot_out, cold_in, cold_out)
              PARAM UA, hot$, cold$, arr$
              hot_out.mdot  = hot_in.mdot
              hot_out.P     = hot_in.P
              cold_out.mdot = cold_in.mdot
              cold_out.P    = cold_in.P
              Th   = Temperature(hot$,  P=hot_in.P,  h=hot_in.h)
              Tc   = Temperature(cold$, P=cold_in.P, h=cold_in.h)
              C_h  = hot_in.mdot  * Cp(hot$,  P=hot_in.P,  h=hot_in.h)
              C_c  = cold_in.mdot * Cp(cold$, P=cold_in.P, h=cold_in.h)
              Cmin = min(C_h, C_c)
              Cmax = max(C_h, C_c)
              eps  = hx_effectiveness(arr$, UA / Cmin, Cmin / Cmax)
              Q    = eps * Cmin * (Th - Tc)
              hot_out.h  = hot_in.h  - Q / hot_in.mdot
              cold_out.h = cold_in.h + Q / cold_in.mdot
            END

            COMPONENT Source(out)
              PARAM fluid$, mdot, P, T
              out.mdot = mdot
              out.P    = P
              out.h    = Enthalpy(fluid$, P=P, T=T)
            END

            COMPONENT Sink(in)
              mdot = in.mdot
              P    = in.P
              h    = in.h
            END

            COMPONENT Nozzle(in, out)
              PARAM k, R, A_throat, A_exit, P_amb, T0
              out.mdot = in.mdot
              M_exit   = mach_A_Astar(A_exit / A_throat, k, 'supersonic')
              out.P    = in.P / P0_P(M_exit, k)
              T_exit   = T0 / T0_T(M_exit, k)
              V_exit   = M_exit * sqrt(k * R * T_exit)
              out.h    = in.h - V_exit^2 / 2
              thrust   = in.mdot * V_exit + (out.P - P_amb) * A_exit
            END

            COMPONENT ThermalSource(port)
              PARAM T
              port.T = T
            END

            COMPONENT Conduction(a, b)
              PARAM k, area, L
              Q      = k * area / L * (a.T - b.T)
              a.Qdot = Q
              b.Qdot = -Q
            END

            COMPONENT Convection(a, b)
              PARAM htc, area
              Q      = htc * area * (a.T - b.T)
              a.Qdot = Q
              b.Qdot = -Q
            END

            COMPONENT Radiation(a, b)
              PARAM emis, area
              Q      = emis * 5.670374419e-8 * area * (a.T^4 - b.T^4)
              a.Qdot = Q
              b.Qdot = -Q
            END

            COMPONENT VoltageSource(p, n)
              PARAM E
              p.V - n.V = E
              p.I + n.I = 0
            END

            COMPONENT Resistor(a, b)
              PARAM R
              a.V - b.V = R * a.I
              a.I + b.I = 0
            END

            COMPONENT Ground(port)
              port.V = 0
            END

            COMPONENT Battery(p, n)
              PARAM Voc, R0
              p.V - n.V = Voc + R0 * p.I
              p.I + n.I = 0
              W = (p.V - n.V) * (0 - p.I)
            END

            COMPONENT TorqueSource(a, b)
              PARAM T
              a.tau = -T
              a.tau + b.tau = 0
            END

            COMPONENT SpeedSource(a, b)
              PARAM w
              a.w - b.w = w
              a.tau + b.tau = 0
            END

            COMPONENT RotationalDamper(a, b)
              PARAM c
              a.tau = c * (a.w - b.w)
              a.tau + b.tau = 0
            END

            COMPONENT MechGround(port)
              port.w = 0
            END

            COMPONENT Gear(in, out)
              PARAM ratio
              in.w    = ratio * out.w
              out.tau = -ratio * in.tau
            END

            COMPONENT HeatingResistor(p, n, heat)
              PARAM R
              p.V - n.V = R * p.I
              p.I + n.I = 0
              Q         = (p.V - n.V) * p.I
              heat.Qdot = -Q
            END

            COMPONENT BatteryThermal(p, n, heat)
              PARAM Voc, R0
              p.V - n.V = Voc + R0 * p.I
              p.I + n.I = 0
              Q         = R0 * p.I^2
              heat.Qdot = -Q
              W         = (p.V - n.V) * (0 - p.I)
            END

            COMPONENT ThermalMass(port)
              PARAM C, T0
              der(port.T)  = port.Qdot / C
              init(port.T) = T0
            END

            COMPONENT Inertia(port)
              PARAM J, w0
              der(port.w)  = port.tau / J
              init(port.w) = w0
            END

            COMPONENT Capacitor(p, n)
              PARAM C, V0
              Vc       = p.V - n.V
              der(Vc)  = p.I / C
              init(Vc) = V0
              p.I + n.I = 0
            END

            COMPONENT Inductor(p, n)
              PARAM L, I0
              der(IL)  = (p.V - n.V) / L
              init(IL) = I0
              p.I = IL
              p.I + n.I = 0
            END

            COMPONENT BatteryTransient(p, n, heat)
              PARAM Voc, R0, Q0, C_th, SOC0, T0
              p.V - n.V = Voc + R0 * p.I
              p.I + n.I = 0
              Qgen      = R0 * p.I^2
              heat.T    = T
              der(T)    = (Qgen + heat.Qdot) / C_th
              init(T)   = T0
              der(SOC)  = p.I / (3600 * Q0)
              init(SOC) = SOC0
            END

            COMPONENT Accumulator(in, out)
              PARAM C, P0
              out.P       = in.P
              out.h       = in.h
              der(in.P)   = (in.mdot - out.mdot) / C
              init(in.P)  = P0
            END

            COMPONENT DCMotor(p, n, shaft)
              PARAM Kt, Ke, R
              p.V - n.V  = R * p.I + Ke * shaft.w
              p.I + n.I  = 0
              shaft.tau  = -Kt * p.I
            END

            COMPONENT Friction(a, b)
              PARAM Fc, Fs, vs, bv, eps
              dw    = a.w - b.w
              a.tau = (Fc + (Fs - Fc) * exp(-(dw / vs)^2)) * tanh(dw / eps) + bv * dw
              a.tau + b.tau = 0
            END

            COMPONENT Planetary(sun, ring, carrier)
              PARAM g
              sun.w + g * ring.w = (1 + g) * carrier.w
              ring.tau           = g * sun.tau
              sun.tau + ring.tau + carrier.tau = 0
            END

            COMPONENT BatteryRC(p, n)
              PARAM Voc, R0, R1, C1, Vrc0
              p.V - n.V = Voc + R0 * p.I - Vrc
              der(Vrc)  = -p.I / C1 - Vrc / (R1 * C1)
              init(Vrc) = Vrc0
              p.I + n.I = 0
            END

            COMPONENT Clutch(a, b)
              PARAM Tmax, eng, eps
              dw    = a.w - b.w
              a.tau = eng * Tmax * tanh(dw / eps)
              a.tau + b.tau = 0
            END

            COMPONENT RotationalSpring(a, b)
              PARAM k, theta0
              der(theta)  = a.w - b.w
              init(theta) = theta0
              a.tau       = k * theta
              a.tau + b.tau = 0
            END

            COMPONENT Engine(shaft)
              PARAM Tmax, throttle, bf
              shaft.tau = -(throttle * Tmax - bf * shaft.w)
            END

            COMPONENT RoadLoad(shaft)
              PARAM Crr, Caero
              shaft.tau = Crr + Caero * shaft.w^2
            END

            COMPONENT PIThermostat(port)
              PARAM Kp, Ki, Tref
              err         = Tref - port.T
              der(integ)  = err
              init(integ) = 0
              port.Qdot   = -(Kp * err + Ki * integ)
            END

            COMPONENT Valve(in, out)
              PARAM Cv, rho
              out.mdot = in.mdot
              out.h    = in.h
              in.mdot * abs(in.mdot) = Cv^2 * rho * (in.P - out.P)
            END

            COMPONENT ForceSource(a, b)
              PARAM F
              a.f = -F
              a.f + b.f = 0
            END

            COMPONENT TransDamper(a, b)
              PARAM c
              a.f = c * (a.vel - b.vel)
              a.f + b.f = 0
            END

            COMPONENT TransGround(port)
              port.vel = 0
            END

            COMPONENT TransMass(port)
              PARAM m, v0
              der(port.vel)  = port.f / m
              init(port.vel) = v0
            END

            COMPONENT Diode(p, n)
              PARAM Gon, eps
              vd  = p.V - n.V
              p.I = Gon * vd * (0.5 + 0.5 * tanh(vd / eps))
              p.I + n.I = 0
            END

            COMPONENT ContactResistance(a, b)
              PARAM Rth
              Q      = (a.T - b.T) / Rth
              a.Qdot = Q
              b.Qdot = -Q
            END

            COMPONENT TwoZoneHX(hot_in, hot_out, cold_in, cold_out)
              PARAM UA, hot$, cold$, arr$
              HeatExchanger C1(UA=UA/2, hot$=hot$, cold$=cold$, arr$=arr$)
              HeatExchanger C2(UA=UA/2, hot$=hot$, cold$=cold$, arr$=arr$)
              connect(hot_in, C1.hot_in)
              connect(C1.hot_out, C2.hot_in)
              connect(C2.hot_out, hot_out)
              connect(cold_in, C2.cold_in)
              connect(C2.cold_out, C1.cold_in)
              connect(C1.cold_out, cold_out)
            END

            COMPONENT PMSM(p, n, shaft)
              PARAM Rs, lambda_pm, poles
              Kt        = 1.5 * poles * lambda_pm
              p.V - n.V = Rs * p.I + Kt * shaft.w
              p.I + n.I = 0
              shaft.tau = -Kt * p.I
            END

            COMPONENT Turbocharger(t_in, t_out, c_in, c_out)
              PARAM cp, eta_t, eta_c, gam
              PRt        = t_in.P / t_out.P
              t_out.T    = t_in.T * (1 - eta_t * (1 - PRt^((1 - gam) / gam)))
              t_out.mdot = t_in.mdot
              Wt         = t_in.mdot * cp * (t_in.T - t_out.T)
              PRc        = c_out.P / c_in.P
              c_out.T    = c_in.T * (1 + (PRc^((gam - 1) / gam) - 1) / eta_c)
              c_out.mdot = c_in.mdot
              Wc         = c_in.mdot * cp * (c_out.T - c_in.T)
              Wt         = Wc
            END

            COMPONENT ExpansionValve(in, out)
              PARAM CdA, rho_in
              out.mdot = in.mdot
              out.h    = in.h
              in.mdot * abs(in.mdot) = CdA^2 * 2 * rho_in * (in.P - out.P)
            END

            COMPONENT CoolingCoil(in, out)
              PARAM P, Tout
              h_in       = Enthalpy(AirH2O, T=in.T, P=P, W=in.humrat)
              out.humrat = HumRat(AirH2O, T=Tout, P=P, R=1)
              h_out      = Enthalpy(AirH2O, T=Tout, P=P, W=out.humrat)
              out.mdot   = in.mdot
              out.T      = Tout
              Q          = in.mdot * (h_in - h_out)
              Q_lat      = in.mdot * 2.501e6 * (in.humrat - out.humrat)
            END

            COMPONENT PneumaticSupply(out)
              PARAM fluid$, P, T
              out.P = P
              out.h = Enthalpy(fluid$, P=P, T=T)
            END

            COMPONENT PneumaticAtmosphere(port)
              PARAM P
              port.P = P
            END

            COMPONENT PneumaticOrifice(in, out)
              PARAM fluid$, C, b
              out.h    = in.h
              T_in     = Temperature(fluid$, P=in.P, h=in.h)
              in.mdot  = iso6358(C, b, in.P, T_in, out.P)
              out.mdot = in.mdot
            END

            COMPONENT PneumaticServoValve(in, out)
              PARAM fluid$, Cmax, b, u
              out.h    = in.h
              T_in     = Temperature(fluid$, P=in.P, h=in.h)
              in.mdot  = iso6358(u * Cmax, b, in.P, T_in, out.P)
              out.mdot = in.mdot
            END

            COMPONENT PneumaticVolume(in, out)
              PARAM V, T, R, P0
              out.P      = in.P
              out.h      = in.h
              der(in.P)  = (R * T / V) * (in.mdot - out.mdot)
              init(in.P) = P0
            END

            COMPONENT PneumaticActuator(in, rod)
              PARAM fluid$, area, Patm
              rho     = Density(fluid$, P=in.P, h=in.h)
              rod.f   = -(in.P - Patm) * area
              in.mdot = rho * area * rod.vel
            END
            """;

    private static final List<ComponentDef> BUILTINS = parse(SOURCE);

    /** The parsed built-in component definitions (immutable). */
    public static List<ComponentDef> builtins() {
        return BUILTINS;
    }

    private static List<ComponentDef> parse(String source) {
        EquationParser.CollectingErrorListener errors = new EquationParser.CollectingErrorListener();
        FreesLexer lexer = new FreesLexer(CharStreams.fromString(source));
        lexer.removeErrorListeners();
        lexer.addErrorListener(errors);
        FreesParser parser = new FreesParser(new CommonTokenStream(lexer));
        parser.removeErrorListeners();
        parser.addErrorListener(errors);
        FreesParser.ProgramContext program = parser.program();
        if (!errors.errors.isEmpty()) {
            throw new IllegalStateException(
                    "Built-in component library failed to parse: " + String.join("\n", errors.errors));
        }
        return List.copyOf(new AstBuilder().buildProgram(program).componentDefs());
    }
}
