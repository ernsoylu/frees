#!/usr/bin/env python3
"""Dump CoolProp humid-air ground truth into a committed JSON reference.

Why this exists
---------------
`props/psychro.rs` and the `Enthalpy/WetBulb(AirH2O, …)` call sites need a
humid-air backend at CoolProp accuracy (measured: an ideal-gas ASHRAE model is
2.4e-4 off on `(T,W)` and 2.7e-3 off on `(T,R)`, the latter because converting
relative humidity needs the enhancement factor `f(T,P)`, not bare `p_ws`).
Implementing ASHRAE RP-1485 is only safe if every step can be graded, and CI
has no `libCoolProp`. So the truth is recorded here once and the Rust tests
grade `rustprop` against it — the last independent check on the psychrometrics,
which is why this generator outlived the Java oracle tools it shipped beside.

Generated artefact: version stamped, regenerated deliberately, never on build.

    pip install CoolProp
    python3 tools/humidair-ref/gen.py > fixtures/humidair/reference.json

Any CoolProp 8.x shared library works; point `$COOLPROP_LIBRARY` at one to use
a specific build instead of the wheel's.
"""
import ctypes, json, os, sys, pathlib

def _library():
    """`$COOLPROP_LIBRARY`, else the installed CoolProp wheel's bundled .so.

    This used to resolve only `../frees/backend/core/native/libCoolProp.so` in
    the Java reference repo, which no longer exists. CoolProp itself is the
    dependency here, not that checkout.
    """
    override = os.environ.get("COOLPROP_LIBRARY")
    if override:
        if not pathlib.Path(override).exists():
            sys.exit(f"$COOLPROP_LIBRARY does not exist: {override}")
        return override
    try:
        import CoolProp
    except ImportError:
        sys.exit("no CoolProp: `pip install CoolProp`, or set $COOLPROP_LIBRARY to a libCoolProp.so")
    root = pathlib.Path(CoolProp.__file__).parent
    for pattern in ("libCoolProp*.so", "*.so", "*.dylib", "*.dll"):
        for cand in sorted(root.glob(pattern)) + sorted(root.glob(f"**/{pattern}")):
            try:
                return str(cand) if ctypes.CDLL(str(cand)) else str(cand)
            except OSError:
                continue
    sys.exit(f"CoolProp is installed at {root} but no loadable shared library was found in it")


SO = _library()
lib = ctypes.CDLL(SO)
lib.HAPropsSI.restype = ctypes.c_double
lib.HAPropsSI.argtypes = [ctypes.c_char_p] + [ctypes.c_char_p, ctypes.c_double] * 3
lib.PropsSI.restype = ctypes.c_double
lib.PropsSI.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_double,
                        ctypes.c_char_p, ctypes.c_double, ctypes.c_char_p]
lib.get_global_param_string.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_int]


def ha(out, n1, v1, n2, v2, n3, v3):
    return lib.HAPropsSI(out.encode(), n1.encode(), ctypes.c_double(v1),
                         n2.encode(), ctypes.c_double(v2), n3.encode(), ctypes.c_double(v3))


def version():
    buf = ctypes.create_string_buffer(2048)
    lib.get_global_param_string(b"version", buf, 2048)
    return buf.value.decode()


def finite(x):
    return isinstance(x, float) and x == x and abs(x) != float("inf")


def main():
    # The band the pending fixtures live in: near-ambient HVAC psychrometrics.
    temps = [273.15, 278.15, 283.15, 288.15, 293.15, 295.0, 297.15, 300.0,
             303.15, 305.0, 308.15, 313.15, 318.15, 323.15]
    pressures = [95000.0, 101325.0, 105000.0]

    cases = {"psat_water": [], "w_saturated": [], "h_from_tw": [],
             "h_from_tr": [], "h_from_tb": [], "b_from_th": []}

    for T in temps:
        # IAPWS-95 saturation pressure — the base of the enhancement factor.
        p = lib.PropsSI(b"P", b"T", ctypes.c_double(T), b"Q", ctypes.c_double(0.0), b"Water")
        if finite(p):
            cases["psat_water"].append({"T": T, "p_ws": p})

    for P in pressures:
        for T in temps:
            # Saturated humidity ratio: back-solves to the enhancement factor,
            # W_sat = 0.621945 * f*p_ws / (P - f*p_ws).
            w = ha("W", "T", T, "R", 1.0, "P", P)
            if finite(w):
                cases["w_saturated"].append({"T": T, "P": P, "W": w})
            for W in (0.0, 0.002, 0.005, 0.009, 0.010, 0.016, 0.020):
                h = ha("H", "T", T, "W", W, "P", P)
                if finite(h):
                    cases["h_from_tw"].append({"T": T, "P": P, "W": W, "H": h})
            for R in (0.0, 0.2, 0.45, 0.5, 0.6, 0.8, 1.0):
                h = ha("H", "T", T, "R", R, "P", P)
                if finite(h):
                    cases["h_from_tr"].append({"T": T, "P": P, "R": R, "H": h})
            for dwb in (0.0, 2.0, 5.0, 8.0):
                B = T - dwb
                h = ha("H", "T", T, "B", B, "P", P)
                if finite(h):
                    cases["h_from_tb"].append({"T": T, "P": P, "B": B, "H": h})
            for W in (0.002, 0.009, 0.016):
                h = ha("H", "T", T, "W", W, "P", P)
                if not finite(h):
                    continue
                b = ha("B", "T", T, "H", h, "P", P)
                if finite(b):
                    cases["b_from_th"].append({"T": T, "P": P, "H": h, "B": b})

    out = {
        "_README": [
            "CoolProp humid-air ground truth. Generated by tools/humidair-ref/gen.py",
            "from the vendored libCoolProp the golden-dumper also uses.",
            "Regenerate deliberately; do not edit by hand.",
            "Consumed by crates/frees-core/src/props/humidair.rs tests, which have",
            "no libCoolProp available in CI.",
        ],
        "coolprop_version": version(),
        "cases": cases,
    }
    json.dump(out, sys.stdout, indent=1, sort_keys=True)
    sys.stdout.write("\n")
    for k, v in cases.items():
        print(f"  {k}: {len(v)} points", file=sys.stderr)


if __name__ == "__main__":
    main()
