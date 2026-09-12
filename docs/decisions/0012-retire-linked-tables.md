# D12 — Retire the linked property tables; rustprop is the backend on every target

**Date** 2026-09-12 · **Status** accepted, implemented

**Supersedes** [D1](0001-property-backend.md)'s linked `(P,h)` tables and
[D7](0007-auxiliary-property-grids.md)'s `FRAUX1` grids outright. **Completes**
[D9](0009-rustprop-backend.md), which made rustprop the *wasm* build's property
source and left the artifacts behind a `linked-tables` feature for everyone
else. Keeps D1's runtime fetch seam.

## Context

D9 flipped the browser to rustprop and put the nine generated artifacts behind
`linked-tables`, default **on**, so that "a native build, `frees-cli` and the
whole test suite keep the D1 artifacts and behave exactly as they always did."

That sentence stopped being true almost immediately, and nothing noticed. The
installer is a single `cfg`:

```rust
#[cfg(feature = "rustprop-backend")]
propfun::install(Arc::new(RustpropBackend));
#[cfg(not(feature = "rustprop-backend"))]
let _ = install_builtin();
```

`frees` requires `rustprop-backend`, and cargo's resolver-v2 unifies features
across a workspace build. So `cargo test --workspace`, `cargo build`, the
sharded parity jobs and `frees-cli` built in-workspace **all** got rustprop.
`tests/parity.rs` had already been changed to refuse the table backend by name:

> the parity corpus cannot be replayed by the (P,h) TableBackend, and this
> build has `rustprop-backend` OFF.

The tables were therefore linked into every native binary — ~678 KiB after
packing, 1.1 MB on disk, duplicated into `src/props/data/` from `fixtures/` —
and installed by nothing. The only way to reach them was `-p frees-core`
without the feature, which the parity gate rejects.

## The comparison, since the tables were never the better option

| | linked tables (D1 + D7) | rustprop (D8/D9) |
|---|---|---|
| `(P,h)` state fluids | 3 — water, R134a, R1234yf | 24 |
| Humid air | none | `HAPropsSI` |
| Transport at `(P,T)` | aux grids only, 3 names | served |
| Supercritical, mixtures | declined by name | served |
| Incompressibles | `FRAUX1` grids for MEG/MPG | `INCOMP::MEG`/`MPG` natively |
| Accuracy vs CoolProp 8.0.0 | `2.1e-4` worst measured interpolation error | bit-exact |

rustprop is a strict superset in coverage and strictly better in accuracy.
There is no state the tables answer that rustprop does not, and none they
answer more precisely.

## Decision

1. `linked-tables` is **removed**, along with the nine artifacts under
   `src/props/data/` — byte-identical duplicates of the copies in
   `fixtures/proptables` and `fixtures/auxtables`, which stay.
2. `rustprop-backend` becomes the **default** feature of `frees-core`, so
   `cargo build -p frees-core` has a property backend at all. With it off the
   engine installs nothing and property calls return the honest no-backend
   diagnostic; that configuration exists only to prove the library compiles
   without the optional dependency.
3. `build.rs` is **deleted**. Its whole job was the byte-plane shuffle and
   deflate that D9 measured at 1014 KB → 685 KB. With nothing to pack, the
   `miniz_oxide` dependency goes from both `[dependencies]` and
   `[build-dependencies]`, taking `adler2` with it and removing the ~19 KB
   inflate core from the wasm module.
4. `install_from_bytes` **stays**, with its decoders. It is D1's runtime seam,
   D9 kept it deliberately, and Phase 4.2 wired it to the worker's
   `__freesPropertyTableBaseUrl` fetch. A fetched table now layers over
   rustprop with nothing underneath it to merge, so the function simplifies to
   decode → one-table `TableBackend` → `LayeredBackend` over rustprop.

`props/tables.rs` goes from 483 lines to 217.

## Consequences

**One behaviour changes, and it changes toward the oracle.** A single-phase
state's quality was the table's linear extrapolation `(h-hf)/(hg-hf)` — 1.024
at (400 K, 1 atm). CoolProp answers `Q = -1`, "not in the dome". The old unit
test pinned 1.024 and named itself
`single_phase_quality_is_the_backends_answer_not_coolprops`, recording the
divergence rather than hiding it. rustprop *is* CoolProp, so the engine now
answers `-1` — which is what the Java-derived goldens always expected. The test
is inverted and renamed rather than deleted.

**Two tests lost their subject** and were removed rather than rewritten against
a backend that no longer exists: `propfun::the_aux_grids_serve_what_the_split_table_cannot`
and the declining half of `eval::coolprop_backed_correlations_dispatch_and_name_what_they_cannot_reach`.
Both asserted `TableBackend` diagnostics ("no (P,h) state table", "not
tabulated"). Their property-correctness coverage — glycol `cp`/viscosity, air
transport, saturated-dome viscosity, humid-air enthalpy — already exists in
`props::rustprop_backend::tests`. `test_with_builtin_tables` is gone;
`test_with_rustprop` was already its D9 counterpart.

**Decoder coverage is preserved by re-pointing, not by deleting.** The
artifacts were the only real `FRPHTAB1`/`FRAUX1` bytes in existence and the
only honest input for the decoders behind the fetch seam. `props/tables.rs`,
`props/auxtable.rs` and `tests/props_robustness.rs` now read them from
`fixtures/` via a small `fixture()` helper instead of from linked constants.
The byte-level corruption tests are unchanged in substance.

**Verification.** 3,376 workspace tests and 1,308/1,308 golden fixtures pass —
the same numbers as before this change, since the corpus was already being
replayed through rustprop. `cargo check -p frees-core --no-default-features`
still compiles. clippy is clean on native and `wasm32-unknown-unknown`.

## What was explicitly not done

* **The fetch seam was not removed.** It is unused in production today, but it
  is a signed Phase 4.2 deliverable with a wasm export
  (`frees/src/lib.rs`), worker wiring and a robustness test. Removing it is a
  separate decision with a separate justification.
* **The `fixtures/` artifacts were not removed.** They are the decoders' test
  input and part of the corpus's provenance record. See `fixtures/README.md`.
* **`TableBackend` was not removed.** `install_from_bytes` constructs one.
