# Decision records

Numbered, dated records of the architectural decisions this port has taken, in
the form they were taken. They are **history, not documentation**: a superseded
record keeps its original reasoning and gains a status line pointing at whatever
replaced it. For how the system works today, read `CLAUDE.md` and
`ARCHITECTURE_AND_REQUIREMENTS.md`.

These were removed in the 2026-09-07 docs consolidation (`4acc459`) while ~20
citations of them remained in `crates/`, `Cargo.toml` and the module docs. They
were restored on 2026-09-12 so those citations resolve again.

| # | Decision | Status |
|---|---|---|
| [D1](0001-property-backend.md) | Property backend strategy — precomputed `(P,h)` tables | Superseded by D12 |
| [D2](0002-wasm-target-and-toolchain.md) | wasm target and toolchain | Accepted |
| [D3](0003-threading-model.md) | Threading model | Accepted |
| [D4](0004-project-storage.md) | Project storage | Accepted |
| [D5](0005-feature-clip.md) | Feature clip | Accepted |
| [D6](0006-remove-mdf4.md) | Remove MDF4 | Implemented |
| [D7](0007-auxiliary-property-grids.md) | Auxiliary property grids (`FRAUX1`) | Superseded by D12 |
| [D8](0008-coolprop-wasm.md) | CoolProp in wasm — the accuracy path | Implemented via D9 |
| [D9](0009-rustprop-backend.md) | rustprop is the wasm build's property backend | Completed by D12 |
| [D10](0010-remove-spreadsheet.md) | Remove the spreadsheet | Implemented |
| [D11](0011-remove-analyzer.md) | Remove the Data Analyzer | Implemented |
| [D12](0012-retire-linked-tables.md) | Retire the linked tables; rustprop everywhere | Implemented |
