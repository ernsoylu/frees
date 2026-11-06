//! Writes the fluids the browser module does not link, packed by rustprop
//! (`RPFLUID1`), plus the mixture tables (`RPMIXTB1`) and `manifest.json`,
//! into the directory given (the web build uses `web/src/wasm/fluids`).
//!
//! The manifest maps every key rustprop accepts for a packed fluid (name,
//! CAS, alias, upper-case alias) to its name, each name to its file and the
//! fluids its transport needs (an ECS model's reference fluid), and each
//! predefined blend frees names to its components. The worker reads it to
//! install what a document mentions (`engine.worker.ts`).

use std::collections::BTreeMap;
use std::path::Path;

use frees_core::props::propfun::fluid_aliases;
use frees_core::props::tables::ALWAYS_LINKED;
use rustprop_core::fluid::{ConductivityModel, FluidData, TransportModel, ViscosityModel};
use rustprop_core::pack;
use serde_json::json;

fn main() {
    let out = std::env::args()
        .nth(1)
        .expect("usage: frees-fluid-pack <out-dir>");
    let out = Path::new(&out);
    std::fs::create_dir_all(out).expect("create the output directory");
    // Generated output, like wasm-pack's `pkg/`.
    std::fs::write(out.join(".gitignore"), "*\n").expect("write .gitignore");

    let all = rustprop_data::fluids::all();
    let mut keys = BTreeMap::new();
    let mut fluids = BTreeMap::new();
    let mut bytes = 0usize;
    for &(name, data) in &all {
        if ALWAYS_LINKED.contains(&name) {
            continue;
        }
        let file = format!("{}.rpf", file_stem(name));
        let packed = pack::encode_fluid(data);
        bytes += packed.len();
        std::fs::write(out.join(&file), packed).expect("write a packed fluid");
        for key in [data.cas, data.name]
            .into_iter()
            .chain(data.aliases.iter().copied())
        {
            keys.insert(key.to_string(), name);
            keys.insert(key.to_uppercase(), name);
        }
        fluids.insert(name, (file, ecs_references(data)));
    }
    // `needs` names packed fluids only: a linked reference needs no install.
    let fluids: BTreeMap<_, _> = fluids
        .iter()
        .map(|(name, (file, refs))| {
            let mut needs: Vec<&str> = refs.iter().filter_map(|r| keys.get(*r).copied()).collect();
            needs.sort_unstable();
            needs.dedup();
            (*name, json!({ "file": file, "needs": needs }))
        })
        .collect();

    let tables = pack::encode_mixtures(&pack::MixtureTables {
        binary_pairs: rustprop_data::mixtures::MIX_BINARY_PAIRS,
        departure_fns: rustprop_data::mixtures::MIX_DEPARTURE_FNS,
        predefined: rustprop_data::mixtures::MIX_PREDEFINED,
    });
    bytes += tables.len();
    std::fs::write(out.join("mixtures.rpf"), tables).expect("write the mixture tables");
    // Only the blends frees' alias table names; their `<name>.mix` key is what
    // the document's canonical name is.
    let named: Vec<&str> = fluid_aliases().into_iter().map(|(_, c)| c).collect();
    let blends: BTreeMap<String, &[&str]> = rustprop_data::mixtures::MIX_PREDEFINED
        .iter()
        .map(|pm| (format!("{}.mix", pm.name), pm.fluids))
        .filter(|(key, _)| named.contains(&key.as_str()))
        .collect();

    let manifest = json!({
        "keys": keys,
        "fluids": fluids,
        "mixtures": "mixtures.rpf",
        "blends": blends,
    });
    std::fs::write(out.join("manifest.json"), format!("{manifest:#}\n"))
        .expect("write the manifest");
    println!(
        "packed {} fluids and the mixture tables ({} blends named), {bytes} bytes, into {}",
        fluids.len(),
        blends.len(),
        out.display()
    );
}

/// A file name for a fluid name such as `R1234ze(E)` or `n-Butane`.
fn file_stem(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
        .collect()
}

/// The reference fluids an ECS transport model resolves by name at run time.
fn ecs_references(data: &FluidData) -> Vec<&'static str> {
    let mut refs = Vec::new();
    if let Some(t) = &data.transport {
        if let TransportModel::Model(ViscosityModel::Ecs {
            reference_fluid, ..
        }) = &t.viscosity
        {
            refs.push(*reference_fluid);
        }
        if let TransportModel::Model(ConductivityModel::Ecs {
            reference_fluid, ..
        }) = &t.conductivity
        {
            refs.push(*reference_fluid);
        }
    }
    refs
}
