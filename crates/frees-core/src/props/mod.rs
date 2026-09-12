//! Thermophysical properties and materials.
//!
//! Port of `../frEES/backend/core/src/main/java/com/frees/backend/props/`
//! (28 files, 5,246 LOC) plus `core/HeislerCharts.java`.
//!
//! # Two families, one boundary
//!
//! * **Closed-form models** — ideal gas, NASA-7 polynomials, cubic equations of
//!   state, combustion/equilibrium chemistry, transport correlations,
//!   compressible flow, heat-exchanger relations. Pure math; they port directly
//!   and need nothing at runtime.
//! * **Real-fluid properties** — everything the Java reaches through CoolProp's
//!   four-function façade (`PropsSI`, `Props1SI`, `HAPropsSI`,
//!   `get_global_param_string`). The default on native and WASM is **rustprop**,
//!   the pure-Rust CoolProp implementation. Runtime tables are optional overlays,
//!   not linked data; see ARCHITECTURE_AND_REQUIREMENTS.md, retained decisions.

pub mod atmosphere;
pub mod auxtable;
pub mod combustion;
pub mod compressible;
pub mod convective;
pub mod cubiceos;
pub mod diagrams;
pub mod equilibrium;
pub mod flowresist;
pub mod formula;
pub mod heisler;
pub mod hx;
pub mod hxcorr;
pub mod idealgas;
pub mod leread;
pub mod nasa;
pub mod periodic;
pub mod phtable;
pub mod pneumatics;
pub mod propfun;
pub mod psychro;
pub mod psychrochart;
#[cfg(feature = "rustprop-backend")]
pub mod rustprop_backend;
#[cfg(feature = "rustprop-backend")]
pub mod rustprop_warm;
pub mod satsplit;
pub mod solids;
pub mod tables;
pub mod thermochem;
pub mod transport;
pub mod twophase;
