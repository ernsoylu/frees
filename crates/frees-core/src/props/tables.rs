//! The runtime property seam.
//!
//! # History, because the name still says "tables"
//!
//! Decision D1 chose precomputed phase-split `(P,h)` tables (`FRPHTAB1`),
//! generated offline by native CoolProp, as the browser build's real-fluid
//! property source, and D7 added the `FRAUX1` auxiliary grids beside them. D9
//! made **rustprop** the wasm build's property source and D12 made it the
//! backend on every target. The table decoders, the `(P,h)` table backend and
//! the fixture artifacts they were tested against were removed on 2026-11-22:
//! no host ever sent a table, and rustprop is a strict superset — bit-exact
//! CoolProp 8.0.0 where the tables carried a measured `2.1e-4` worst-case
//! interpolation error.
//!
//! # What is here
//!
//! [`install_builtin_once`] installs rustprop. [`install_from_bytes`] installs
//! rustprop's own packed data (`RPFLUID1` per fluid, `RPMIXTB1` for the mixture
//! tables), which the browser worker fetches for the fluids the module does not
//! link ([`ALWAYS_LINKED`]).

use crate::diag::{FreesError, Result};

/// Installs `bytes` — one packed rustprop file, `RPFLUID1` (a fluid, whose
/// name is returned) or `RPMIXTB1` (the mixture tables). Anything else is
/// refused, never trusted.
pub fn install_from_bytes(bytes: &[u8]) -> Result<Vec<String>> {
    #[cfg(feature = "rustprop-backend")]
    match bytes.get(..8) {
        Some(b"RPFLUID1") => {
            let name = rustprop::props_api::install_fluid(bytes)
                .map_err(|e| FreesError::property(e.to_string()))?;
            return Ok(vec![name.to_string()]);
        }
        Some(b"RPMIXTB1") => {
            rustprop::props_api::install_mixture_tables(bytes)
                .map_err(|e| FreesError::property(e.to_string()))?;
            MIXTURE_TABLES_INSTALLED.store(true, std::sync::atomic::Ordering::Relaxed);
            return Ok(Vec::new());
        }
        _ => {}
    }
    let magic = bytes.get(..8).map(String::from_utf8_lossy);
    Err(FreesError::property(format!(
        "not a packed rustprop file (magic {magic:?}); expected RPFLUID1 or RPMIXTB1{}",
        if cfg!(feature = "rustprop-backend") {
            ""
        } else {
            ", and this build has no rustprop backend to install it into"
        }
    )))
}

/// The fluids every build links (`frees-core/Cargo.toml`'s `rustprop-data`
/// features). The rest come with the `linked-fluids` feature or, in the
/// browser, from the packed files `frees-fluid-pack` writes.
pub const ALWAYS_LINKED: [&str; 4] = ["Water", "R134a", "R1234yf", "Air"];

#[cfg(feature = "rustprop-backend")]
static MIXTURE_TABLES_INSTALLED: std::sync::atomic::AtomicBool =
    std::sync::atomic::AtomicBool::new(false);

/// Whether rustprop can serve `key` (a fluid name, CAS or alias) now: linked,
/// or installed by [`install_from_bytes`].
pub fn fluid_available(key: &str) -> bool {
    #[cfg(feature = "rustprop-backend")]
    return rustprop::props_api::resolve_fluid(key).is_ok();
    #[cfg(not(feature = "rustprop-backend"))]
    {
        let _ = key;
        false
    }
}

/// Whether the mixture tables are there: linked (`linked-fluids`) or
/// installed by [`install_from_bytes`].
pub fn mixture_tables_available() -> bool {
    #[cfg(feature = "rustprop-backend")]
    return cfg!(feature = "linked-fluids")
        || MIXTURE_TABLES_INSTALLED.load(std::sync::atomic::Ordering::Relaxed);
    #[cfg(not(feature = "rustprop-backend"))]
    false
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
        crate::props::propfun::install(std::sync::Arc::new(
            crate::props::rustprop_backend::RustpropBackend,
        ));
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Garbage in is a `Result`, never a panic — this is where a fetched byte
    /// string reaches the engine. The retired `FRPHTAB1` format is refused too.
    /// (`RPMIXTB1` is not probed: where the mixture tables are linked, rustprop
    /// keeps them and does not decode the bytes, by design.)
    #[test]
    fn a_hostile_byte_string_is_refused_rather_than_trusted() {
        for bad in [
            &b""[..],
            &b"FRPHTAB1"[..],
            &b"RPFLUID1"[..],
            &[0xffu8; 200][..],
        ] {
            let err = install_from_bytes(bad).unwrap_err().to_string_message();
            assert!(!err.is_empty(), "{bad:?}");
        }
    }
}
