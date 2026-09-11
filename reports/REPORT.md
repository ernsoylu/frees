# frees documentation and usability audit — latest change update

**Reviewed:** 11 September 2026 · `8f744dd0e296a9efdfa1282e06fcd912d83b8b2a` · “Phase 4.3 correlated uncertainty, 4.5 signal processing, 4.6 sensitivity, 4.2 calibration (#23)”.

**Conclusion:** The change adds useful, tested engine capabilities and exposes previously hidden documentation gaps. It does not resolve the earlier teaching and onboarding problems. Complete-document example coverage is now **140/719 (19.5%)**, and the revised documentation generator has a confirmed failure when a Java reference checkout is available.

This updates the [10 September audit](documentation-audit/REPORT.md), preserved with its original evidence. Current measurements below supersede its headline coverage figures. The review covers the latest commit, refreshed static teaching coverage, documentation generation, and the browser integration boundary; it is not an exhaustive numerical review of every added algorithm.

## 1. What changed

| Area | Implemented change | User-facing assessment |
| --- | --- | --- |
| Dynamic calibration | Weighted and robust fitting options; covariance, standard errors, rank/conditioning and bound diagnostics; reuses curve fitting's uncertainty calculation | Engine improvement. The frontend parameter-fit request/result types and existing workflow have not caught up. |
| Uncertainty | `Correlation(A, B)` and six `DistributionOf(X)` shapes; full first-order covariance propagation; truncated inverse-CDF sampling | Declarations can travel through existing solve/Monte Carlo paths. They need complete instructional examples explaining supported combinations and restrictions. |
| Sampling and sensitivity | Seeded Latin-hypercube/Sobol designs, Sobol indices and Morris screening | Implemented in Rust, including a WASM-annotated sensitivity endpoint. The browser has no sensitivity worker/API route; its Monte Carlo request does not expose design selection. |
| Signal processing | Faster arbitrary-length FFT; new filtering, smoothing, spectra, correlation and peak operations | Twelve reference pages add useful contracts and worked fragments. No new gallery models or runnable guide blocks were added. |
| Documentation inventory | Merges Rust intrinsics and expanded CALL targets into the manifest | Correctly reveals missing pages, but branch handling and metadata are defective; details below. |

STFT and resampling are explicitly deferred in the change. They should remain labelled as deferred rather than treated as delivered signal capabilities.

## 2. Refreshed coverage

Same case-insensitive, manifest-based symbol-incidence method as the original audit. A complete-document candidate is a gallery model, Help model, boot document or guide `run` fence. Other fenced examples remain fragments, even when they might be independently runnable.

| Measure | Previous audit | Current revision |
| --- | ---: | ---: |
| Catalogued unique symbols | 655 | **719** |
| Symbols with a reference page | 655/655 (100.0%) | **667/719 (92.8%)** |
| Missing reference pages | 0 | **52** |
| Rich / reference / stub pages | 155 / 354 / 146 | **167 / 354 / 146** |
| Direct use in complete-document candidates | 140/655 (21.4%) | **140/719 (19.5%)** |
| Direct use including instructional fragments | 196/655 (29.9%) | **208/719 (28.9%)** |
| Symbols with explicit gallery bindings | 114 | **114** |
| Complete-document candidates | 150 | **150** |
| Reference example fences | 51 | **72** |
| Rust intrinsic names absent from manifest names/aliases | 48 | **0** |

The percentage decrease reflects a larger, more honest denominator, not deleted examples. All 314 intrinsic names found by the scanner are now represented by manifest names or aliases. This does **not** establish a complete inventory of every dispatch path, language construct, argument combination or UI workflow. The generator retains cached families and unions existing entries rather than verifying every historical entry against the current engine.

Component coverage remains **40/312 (12.8%)**. Pneumatic, hydraulic, mechanical and control components still have no direct complete-document example under this measurement. The new signal function pages do not increase signal-component coverage.

Evidence: [coverage summary](latest-change/coverage-summary.json), [symbol-level coverage and missing pages](latest-change/symbol-coverage.csv), [example inventory](latest-change/examples.csv), [intrinsic inventory gaps](latest-change/rust-inventory-gaps.csv). The last file now contains only a header because there are no detected gaps.

## 3. Confirmed findings

### P1 — the Java-reference generator branch crashes after writing an unreconciled manifest

At [build-doc-manifest.mjs:323](../web/scripts/build-doc-manifest.mjs#L323), `mergeReport` is declared inside `writeManifest()`. The Java-reference branch instead constructs and writes its manifest directly, then calls `reportMerge(mergeReport, true)` at line 527, outside that scope.

A scratch reproduction with minimal Java parser inputs exits **1** with `ReferenceError: mergeReport is not defined`. The file has already been written at that point, and this branch never calls `mergeRustRegistries()`. A checkout with readable Java inputs therefore both fails `check-docs` and can replace its inventory without the intended Rust reconciliation. The miniature input counts in the reproduction are synthetic and are not product coverage measurements.

**Repair:** route both branches through the same reconciliation/write sequence, with the merge result in the caller's scope. Check both reference-present and reference-absent cases, including whether Rust-only symbols survive generation.

### P2 — generator provenance and family counts remain misleading

The no-reference branch sets `derivedFrom = 'rust'`, but `writeManifest()` unconditionally overwrites it with `'java+rust'`. The scratch no-reference run confirms this result despite no Java source being read.

`recountCoverage()` updates the overall total, component count and documented count, but leaves `registeredFunctions` at **276** and `callProcedures` at **44**, while the actual arrays contain **326** and **63** entries. The overall 719-symbol denominator is correct; the family metadata is stale.

**Repair:** keep provenance specific to the selected branch and derive family counts from the final arrays. Do not describe the entire manifest as an authoritative Rust inventory while cached families remain.

Reproduction and captured output: [check-manifest.py](latest-change/check-manifest.py), [manifest-check.json](latest-change/manifest-check.json). Both branches run in temporary copies, leaving product files untouched.

### P2 — README capability claims exceed the available browser workflow

The README now advertises global sensitivity and stratified Monte Carlo designs. The Rust [sensitivity endpoint](../crates/frees/src/analysis.rs#L828) exists, but there is no sensitivity import/dispatch in `web/src/wasm/engine.worker.ts`, nor a corresponding method in `web/src/api.ts`.

The existing [Monte Carlo request](../web/src/api.ts#L1067) sends samples and seed but no `design` or `quantiles`. [ParameterFitParams and ParameterFitResult](../web/src/api.ts#L684) omit the new weighting/loss inputs and uncertainty diagnostics. This is an integration and discoverability gap, not evidence that the underlying algorithms are absent or wrong.

**Repair:** label these capabilities by interface now; expose the intended browser controls and results before teaching them as available dialog workflows. Add one complete sensitivity example and one weighted dynamic-calibration dataset with expected results.

### P2 — new reference pages improve breadth but do not close executable teaching gaps

All twelve new signal pages have empty gallery bindings. They add 21 example fences and twelve directly demonstrated symbols in the broader fragment metric, but no complete-document candidates. For example, [Welch](../web/src/docs/reference/signal/Welch.md#L40) assumes a 4,096-sample tone already exists; its code block does not create that input.

**Repair:** supply a small complete signal model with input generation, analysis calls, a plot and numerical expectations, then bind related pages to it. Explain that Welch's mean removal affects the interpretation of integrated power; the tone example should use a tolerance rather than an exact equality expectation.

## 4. Status of the earlier recommendations

**Partly addressed:** the missing Rust-intrinsic inventory is reconciled, and the reported page coverage is no longer a misleading 100%. Signal references improve considerably. The checker still treats missing pages as informational and does not prove that teaching examples run or return correct numbers.

**Still open:** the original onboarding contradictions, editor/REPL confusion, stale server/Java troubleshooting, Symja/SUNDIALS attributions, Pipe roughness contract, invalid CLI `--json` instruction, duplicate gallery ID, split example discovery and workflow-specific Solve instructions. Comparison from the original audited revision shows the relevant teaching models and guide files were not repaired. The new reference pages do not supersede those findings.

The two previously broken Help models and the slow EV example retain their **historical** execution findings. Their sources are unchanged, but this update does not claim a fresh replay of all 150 teaching documents. The earlier competitor comparison also remains historical; no external comparison research was repeated.

## 5. Verification performed for this update

| Check | Result |
| --- | --- |
| Refreshed static audit with scanner sanity checks | Passed; 719 symbols, 667 pages, 150 complete-document candidates |
| `node web/scripts/check-doc-coverage.mjs` | Passed; reports 667/719, including 146 stubs |
| Scratch manifest generation without reference repository | Exit 0; provenance/count defects confirmed |
| Scratch manifest generation with minimal reference repository | Exit 1; undefined `mergeReport` confirmed |
| `cargo test -p frees-core --test signal_kernels --test uncertainty_shapes` | **25 passed** |
| `cargo test -p frees-core --lib analysis::` | **218 passed**, zero failures; [log](latest-change/analysis-tests.txt) |

The JavaScript checks ran under Node **20.20.2**, below the package's declared Node ≥22 requirement. The reported lexical-scope defect is visible in source and reproduced here; a supported-Node rerun remains appropriate when repairing the generator. No browser rendering checks, WASM rebuild, full workspace suite, full parity replay or bundle-size measurement were performed. The commit's larger validation totals are author-reported, not independently reproduced in this update.

Reproduce from the repository root:

```sh
node reports/latest-change/measure.cjs
node web/scripts/check-doc-coverage.mjs
python reports/latest-change/check-manifest.py
cargo test -p frees-core --test signal_kernels --test uncertainty_shapes
cargo test -p frees-core --lib analysis::
```

The refreshed measurement script reuses the original audit implementation with one adjustment: CSV output accepts an empty intrinsic-gap list. The original report and evidence remain unchanged.

## 6. Next actions

1. Repair and check both documentation-generator branches and their metadata.
2. Fix the existing first-run instructions and broken teaching models identified in the baseline audit.
3. Clarify engine versus browser availability for sensitivity, sampling designs and calibration diagnostics.
4. Add complete, assertion-backed signal, uncertainty and calibration examples using the existing gallery/guide system.
5. Continue publishing page presence and complete-document incidence separately: **92.8% page presence is not 92.8% executable teaching coverage**.
