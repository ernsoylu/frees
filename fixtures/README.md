# Regression Fixtures & Verification Corpus

This directory contains the frozen regression test corpus, reference golden solutions, and numerical tolerance definitions for `frees`.

## Provenance: where these numbers came from

Every golden in `corpus/`/`golden/`, the property grids in `proptables/` and
`auxtables/`, and the 912 psychrometric points in `humidair/reference.json`
were produced by an **external oracle** — the Java `frees` engine linked
against CoolProp 8.0.0 — and frozen here. They are not `rustprop` output, which
is exactly why they can grade it.

That oracle and its generators (`tools/golden-dumper`, `tools/table-gen`,
`tools/aux-gen`, `tools/dae-probe`, `tools/harvest-java-tests`) were **removed
on 2026-09-12**: `rustprop` is the implementation now, nothing in the build,
the test suite, or CI reads the Java repo, and a checkout of it had not existed
on a developer machine for some time.

Roughly 60 doc comments under `crates/` still cite those tool paths as the
source of a hardcoded expected value. Those statements remain accurate — they
record how a literal was obtained, and deleting the tool does not change that —
but the paths no longer resolve. Read them as history, not as instructions.

**The consequence to know about:** new property fixtures can no longer be
minted against an independent oracle. Values generated from `rustprop` give
regression detection (they catch unintended change) but not validation (they
cannot catch a bug that was there all along). For a genuinely new property
surface — an unbacked `.mix` blend, a fluid outside the linked set — grade
against CoolProp directly (`pip install CoolProp`, as
`tools/humidair-ref/gen.py` now does) or against published EoS reference
values, and record which in the fixture.

---

## 1. Directory Structure

```
fixtures/
├── corpus/                       # 1,308 verified .frees test models
│   ├── *.frees                   # Model source files
│   ├── *.tables.json             # Request-level Function Tables sidecars (for callable lookup tables)
│   └── *.request.json            # Solver configuration sidecars (stop criteria, variable specs, initial guesses)
├── golden/                       # 1,308 reference golden solutions
│   └── *.json                    # Frozen output solutions (variables, blocks, trajectories, status)
├── proptables/                   # Precomputed thermodynamic property tables
├── auxtables/                    # Auxiliary property grids (FRAUX1 format for incompressibles and transport)
├── tolerances-rustprop.json      # Declared numerical tolerances and variance mechanisms
└── README.md                     # This specification
```

---

## 2. Request Sidecars

### 1. Function Table Sidecars (`<name>.tables.json`)

Documents utilizing request-level Function Tables carry a companion `.tables.json` file.
The test harness passes these definitions directly into `solve_with_tables`. Each entry defines:
- Table name (case-insensitive lookup key)
- Column names and units
- Interpolation knots and numerical data rows

### 2. Solver Request Sidecars (`<name>.request.json`)

Non-linear systems can exhibit multiple mathematical roots depending on initial variable guesses, bounds, and convergence criteria.
The `.request.json` sidecar supplies explicit solve parameters:

```json
{
  "stopCriteria": {
    "maxIterations": 250,
    "relativeResiduals": 1e-6,
    "changeInVariables": 1e-9,
    "elapsedTimeSeconds": 3600.0,
    "complexMode": true
  },
  "variableInfo": [
    {
      "name": "x",
      "guess": 2.5,
      "lower": 0.0,
      "upper": 4000.0,
      "uncertainty": 0.1
    }
  ]
}
```

- Absent `lower` / `upper` bounds default to $\pm\infty$.
- Absent `guess` defaults to the standard engine guess clamped into bounds.

---

## 3. Comparison Policy & Tolerances

The regression test harness (`crates/frees-core/tests/parity.rs`) evaluates model solutions against reference goldens under strict numerical rules:

### Standard Tolerance

- **Default Relative Tolerance**: **`1e-9`** across all algebraic variables and display names.
- **Absolute Channel Near Zero**: For quantities whose true reference value is zero (or within machine epsilon $\le 10^{-12}$), an absolute threshold of `1e-12` is applied.

### Dynamic Trajectories (ODE / DAE)

For transient simulation trajectories:
- Variable states at every recorded time step are verified.
- **Decayed Signal Anchoring**: For signals that decay over multiple orders of magnitude (e.g., exponential thermal decay approaching zero), relative error division against near-zero numbers is stabilized by anchoring to the signal's dynamic peak range:
  $$\text{scaled\_err} = \frac{|y_{\text{calc}} - y_{\text{ref}}|}{\max(|y_{\text{ref}}|) + \epsilon}$$
- **Event Localization**: Discrete state event trigger times ($t^*$) are validated to within integration time tolerance.

### Tolerance Ledger (`tolerances-rustprop.json`)

Certain complex physical models (e.g. multi-fluid refrigeration cycles operating near critical points or within laminar-to-turbulent transition regimes) require specific measured tolerances:
- Every fixture requiring a tolerance looser than `1e-9` must be explicitly recorded in `fixtures/tolerances-rustprop.json` with its measured relative/absolute error and physical mechanism.
- **Dead Tolerance Detection**: CI strictly enforces that any tolerance entry whose test now passes under the default `1e-9` tolerance triggers a test failure. Relaxations cannot silently outlive their necessity.
