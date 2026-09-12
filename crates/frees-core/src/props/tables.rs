//! The runtime property-table seam.
//!
//! # History, because the name still says "tables"
//!
//! Decision D1 chose precomputed phase-split `(P,h)` tables, generated offline
//! by native CoolProp, as the browser build's real-fluid property source, and
//! D7 added the `FRAUX1` auxiliary grids beside them. This module linked those
//! nine artifacts into the binary and installed them as the process's
//! [`RealFluid`](super::propfun::RealFluid).
//!
//! D9 then made **rustprop** the wasm build's property source and put the
//! artifacts behind a `linked-tables` feature. D12 finishes that move: rustprop
//! is the backend on every target, the linked bytes are gone, and with them
//! `build.rs`, the byte-plane packer and the `miniz_oxide` dependency. rustprop
//! is a strict superset — 24 fluids against three, humid air, transport at
//! `(P,T)`, supercritical states and the incompressibles the aux grids existed
//! for — and it is bit-exact CoolProp 8.0.0 where the tables carried a measured
//! `2.1e-4` worst-case interpolation error.
//!
//! # What is left, and why
//!
//! [`install_from_bytes`]: the runtime seam D1 asked for and D9 kept. A host
//! that fetches an `FRPHTAB1` artifact for some fluid can hand the slice
//! straight here, and it is layered *over* rustprop rather than replacing it.
//! The decoders it needs — [`SaturationSplitTable`], `AuxTable` — stay compiled
//! for the same reason.
//!
//! The artifacts themselves still exist as **test fixtures** under
//! `fixtures/proptables` and `fixtures/auxtables`, which is where the decoder
//! tests below read them from. They are no longer duplicated into
//! `src/props/data/` and no longer linked into any binary.

use std::sync::Arc;

use crate::diag::Result;
use crate::props::propfun::{self, TableBackend};
use crate::props::satsplit::SaturationSplitTable;

/// Installs `bytes` — one `FRPHTAB1` file — layered over the backend already
/// installed, which since D12 is always rustprop.
///
/// This is the runtime seam D1 asked for: a host that fetches a table for a
/// fluid can hand the slice straight here. The fetched table is consulted
/// first and rustprop answers everything it declines, so adding a table can
/// only add coverage, never remove it.
///
/// Two properties a host taking this path has to know, unchanged from D9: a
/// second call replaces the first fluid rather than adding to it, and the
/// `FRAUX1` transport grids have no runtime install path at all (`FRPHTAB1` is
/// the only format this reads).
pub fn install_from_bytes(bytes: &[u8]) -> Result<Vec<String>> {
    let incoming = SaturationSplitTable::decode_generated(bytes)?;
    let backend = TableBackend::new(vec![incoming]);
    let fallback = propfun::backend();
    let fluids = backend.all_served();
    match fallback {
        Some(previous) => {
            propfun::install(Arc::new(propfun::LayeredBackend::new(backend, previous)))
        }
        None => propfun::install(Arc::new(backend)),
    };
    Ok(fluids)
}

/// Installs this build's property backend the first time it is called, and does
/// nothing afterwards.
///
/// Every public entry point of the crate calls this, so a caller never has to
/// remember to. It is deliberately **not** idempotent-by-reinstall: a test that
/// swaps in a recorded backend, or a host that installed a richer one, must not
/// have it yanked back out from under them by the next `solve`.
///
/// Without the `rustprop-backend` feature nothing is installed and every
/// real-fluid call fails with the honest "no backend installed" diagnostic.
/// That configuration exists only to prove the library compiles without the
/// optional dependency; it is not a supported way to run the engine.
pub fn install_builtin_once() {
    use std::sync::Once;
    static ONCE: Once = Once::new();
    ONCE.call_once(|| {
        #[cfg(feature = "rustprop-backend")]
        propfun::install(Arc::new(crate::props::rustprop_backend::RustpropBackend));
    });
}

/// The generated artifacts, read from `fixtures/` rather than linked.
///
/// D12 stopped duplicating them into `src/props/data/` and stopped linking
/// them, but they are still the only `FRPHTAB1`/`FRAUX1` bytes in existence and
/// so still the only real input the decoders can be tested against.
#[cfg(test)]
pub(crate) fn fixture(rel: &str) -> Vec<u8> {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../fixtures")
        .join(rel);
    std::fs::read(&path).unwrap_or_else(|e| panic!("fixture {}: {e}", path.display()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::props::satsplit::{LiquidCoord, Region};

    fn water_phtab() -> Vec<u8> {
        fixture("proptables/water.phtab")
    }

    /// The generated artifacts decode, and they are the geometry D1 chose.
    #[test]
    fn the_generated_tables_decode_at_the_geometry_d1_chose() {
        for (name, fluid) in [
            ("proptables/water.phtab", "Water"),
            ("proptables/r134a.phtab", "R134a"),
            ("proptables/r1234yf.phtab", "R1234yf"),
        ] {
            let t = SaturationSplitTable::decode_generated(&fixture(name)).expect(name);
            assert_eq!(t.fluid(), fluid);
            assert_eq!(t.liquid_coord(), LiquidCoord::Normalized, "{fluid}");
            assert!(t.has_liquid(), "{fluid}");
            // The normalized axis is dimensionless and D1 sizes it at 0.9.
            assert_eq!(t.dh_liquid_max(), 0.9, "{fluid}");
            assert!(t.p_min() > 0.0 && t.p_serve_max() > t.p_min());
        }
    }

    /// The `FRPHTAB1` header is not decoration: the bytes it declares have to
    /// land on the values CoolProp produced.
    ///
    /// The tolerance is the measured table error from
    /// `fixtures/proptables/ERROR-REPORT.json`, not a number chosen to make the
    /// test pass.
    #[test]
    fn water_states_match_the_coolprop_oracle_within_the_measured_error() {
        let water = SaturationSplitTable::decode_generated(&water_phtab()).unwrap();
        // h_f(101325 Pa) = 419_099.34 J/kg, T_sat = 373.1243 K.
        let tsat = water.tsat_at(101_325.0);
        assert!(
            (tsat - 373.124_295_847_286_2).abs() / 373.124_3 < 1e-4,
            "T_sat(1 atm) = {tsat}"
        );
        let hf = water.hf_at(101_325.0);
        assert!(
            (hf - 419_099.340_939_9).abs() / 419_099.34 < 1e-4,
            "h_f(1 atm) = {hf}"
        );
        // Wet steam at 1 atm, x = 0.5: T is the saturation temperature.
        let hg = water.hg_at(101_325.0);
        let half = 0.5 * (hf + hg);
        assert_eq!(water.region(101_325.0, half), Some(Region::TwoPhase));
    }

    /// A fetched table reaches the dispatcher and is consulted before rustprop.
    #[test]
    fn install_from_bytes_serves_the_fetched_fluid() {
        let _guard = propfun::test_swap_guard();
        let previous = propfun::backend();

        let fluids = install_from_bytes(&water_phtab()).expect("install");
        assert_eq!(fluids, ["Water"], "{fluids:?}");
        // Enthalpy(Water, P=101325, x=0) — the `rankine-cycle` state 1 shape.
        let h = propfun::evaluate("prop$enthalpy$water$p$x", &[101_325.0, 0.0]).unwrap();
        assert!(
            (h - 419_099.340_939_9).abs() / 419_099.34 < 1e-4,
            "h_f(1 atm) = {h}"
        );

        match previous {
            Some(p) => {
                propfun::install(p);
            }
            None => {
                propfun::uninstall();
            }
        }
    }

    /// Garbage in is a `Result`, never a panic — this is the one place a
    /// caller-supplied byte string reaches the table reader.
    #[test]
    fn a_hostile_byte_string_is_refused_rather_than_trusted() {
        let _guard = propfun::test_swap_guard();
        let previous = propfun::backend();

        for bad in [
            &b""[..],
            &b"FRPHTAB1"[..],
            &b"FREESSP1 not this format at all"[..],
            &[0xffu8; 200][..],
        ] {
            let err = install_from_bytes(bad).unwrap_err().to_string_message();
            assert!(!err.is_empty(), "{bad:?}");
        }
        // A truncated real file: the header is valid, the payload is not there.
        let water = water_phtab();
        let truncated = &water[..water.len() / 2];
        let err = install_from_bytes(truncated)
            .unwrap_err()
            .to_string_message();
        assert!(err.contains("declares"), "{err}");
        // A real file with one header byte corrupted.
        let mut flipped = water.clone();
        flipped[10] = 7; // elem_kind
        let err = install_from_bytes(&flipped)
            .unwrap_err()
            .to_string_message();
        assert!(err.contains("elem_kind"), "{err}");

        match previous {
            Some(p) => {
                propfun::install(p);
            }
            None => {
                propfun::uninstall();
            }
        }
    }
}
