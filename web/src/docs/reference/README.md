# frees Reference Documentation (`src/docs/reference/`)

Per-symbol reference pages — one markdown file per built-in function,
multi-output function, block construct, or component. This directory is the source the Phase-1
pipeline compiles into the in-app Help → Reference section.

## Files

- `_TEMPLATE.md` — the page contract. Copy it to start a new page. Do **not** edit it as content (the leading `_` keeps it out of the manifest/compile).
- `function-manifest.json` — **generated**, do not hand-edit. The registered language inventory across `functions`, `matrixFunctions`, `callProcedures`, `propertyFunctions`, `materials`, `components`, and `replCasOps`, reconciled against Rust by `web/scripts/build-doc-manifest.mjs`. Read `coverage.documentableSurfaceTotal` for the current deduplicated count. The internal field `callProcedures` contains multi-output functions called as `[outputs] = name(inputs)`; it does not imply a public `CALL` keyword.
- `<category>/<name>.md` — authored reference pages, grouped by category folder (e.g. `heat-transfer/hx_effectiveness.md`).

## The contract (every page)

1. **YAML frontmatter** — `name`, `category`, `summary`, `related`, `examples` (ids in `examples.ts`), `tags`, `references`. Feeds search + the manifest coverage gate.
2. **Mathematical Formulation** — governing equations in KaTeX, plus the numerical method the backend actually uses. **Content is grounded in the standard literature**, never model memory.
3. **Examples** — include a complete, realistic model and expected output on every page. Use `frees` fences with `{ CHECK variable expected tolerance }` comments for numerical assertions. Gallery links may supplement, not replace, a self-contained example. Unsupported calls must show a verified diagnostic and working alternative.
4. **Common Errors** — error-code table with a triggering snippet.
5. **References** — optional; cite only public standards and data sources (standard + section/equation).

## Quality gates (CI, Phase 1+)

- Every registry function (`function-manifest.json → functions[]`) has a page (`documented: true`).
- No page names a symbol absent from the backend.
- Every `examples:` id resolves in the gallery; this check alone does not execute it.
- `npm run check-examples` executes guide `run` fences and reference `frees` fences carrying `{ CHECK variable expected tolerance }` markers against the compiled WASM module, plus supported JSON analysis examples. Unmarked fragments are not numerical tests.
- Coverage reports distinguish worked-example pages, substantive reference pages, and stubs; page presence is not proof of completeness.

Write mathematical relationships as LaTeX (`$...$` inline, `$$...$$` display),
not plain-text equations in code fences. Keep executable syntax and connection
topology in code fences. After scaffolding component pages, run
`node web/scripts/format-doc-equations.mjs` from the repository root; it reuses
the Rust expression renderer. `npm run check-docs` validates display math with
KaTeX. Run `npm run check-examples` after changing any example or expected value.
The example checker also supports `request=<JSON>` solve options, `error=<JSON
string>` expected diagnostics, and JSON `solve_table` / `repl_evaluate` requests.

These pages are the sole source for the user-facing reference; do not generate
a second consolidated reference. Run `npm run compile-docs` from `web/` after
editing them to refresh in-app Help. Engineering decisions, maintenance rules,
and unresolved work belong in the three top-level documents linked by the root README.
