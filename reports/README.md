# Reports and proposals

The following documents are tracked here:

| File | What it is |
|---|---|
| `REPORT.md` | The 11 September 2026 documentation and usability audit, at `8f744dd` |
| `documentation-audit/REPORT.md` | The 10 September baseline audit it updates, preserved with its original findings |
| `MISSING_EXAMPLES.md` | Nineteen worked engineering examples with complete inputs and expected results, written to close the gaps the audits measured |
| [SIMPLIFIED_SYNTAX_PROPOSAL.md](SIMPLIFIED_SYNTAX_PROPOSAL.md) | Source investigation and proposed unified language, including all keywords, solver semantics, examples and a staged migration plan |

`MISSING_EXAMPLES.md` was consumed by roadmap phase 4.7b-2 (PR #25), which
converted its examples into gallery models with `CHECK` assertions and
reference-page bindings. See `NEXT_STEPS.md` §1.

## The evidence data is not tracked

The audit reports cite evidence files beside them — `coverage-summary.json`,
`symbol-coverage.csv`, `examples.csv`, `run-candidates.json`, and the
`measure.cjs` / `run-checks.py` / `check-manifest.py` harnesses that produced
them. **Those links do not resolve in this repository.** They were committed
once and removed; `.gitignore` now keeps them out.

The reason is the quality gate. SonarCloud analyses this project with Automatic
Analysis, whose exclusions are configured in the SonarCloud project settings UI
and **not** in `sonar-project.properties` — so nothing in this repository can
put an evidence tree out of scope. Committed, it fails the gate twice over: the
measurement harnesses trip security and reliability rules, and two snapshots of
the same audit are, correctly, ~60% duplicated code.

Editing the harnesses to satisfy those rules was not an option worth taking. An
audit's claim rests on its evidence being the code that produced the numbers;
patching `measure.cjs` to quiet a linter would invalidate the reproduction it
exists to support. So the data lives outside the repository and the reports keep
their reproduction instructions — re-run the harness from a local copy to
regenerate it.

What each report states about the engine is independently checkable from the
repository itself:

```sh
cd web && npm run check-docs && npm run check-examples
```

That covers page presence, the family counts, and every runnable example.
Complete-document incidence — the 140/719 figure the audits lead with — is the
one measurement that needs the local harness.
